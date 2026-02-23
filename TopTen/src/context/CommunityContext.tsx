import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { COMMUNITY_LISTS, LOCAL_COMMUNITY_LISTS } from '../data/communityLists';

const ALL_COMMUNITY_LISTS = [...COMMUNITY_LISTS, ...LOCAL_COMMUNITY_LISTS];
import { supabase } from '../services/supabase';
import { containsProfanity } from '../services/profanityFilter';

const STORAGE_KEY = '@topten_community';
const DEVICE_ID_KEY = '@topten_device_id';

export interface UserCommunityRanking {
  slots: string[]; // 10 free-form text slots; empty string = unfilled
  submitted: boolean;
}

interface CommunityContextType {
  userRankings: Record<string, UserCommunityRanking>;
  deviceId: string | null;
  liveScoreCache: Record<string, Record<string, number>>;
  participantCounts: Record<string, number>;
  fetchLiveScores: (listId: string) => Promise<void>;
  setUserSlots: (listId: string, slots: string[]) => void;
  submitRanking: (listId: string) => Promise<void>;
}

const CommunityContext = createContext<CommunityContextType | null>(null);

const buildDefaultRanking = (_listId: string): UserCommunityRanking => {
  return {
    slots: Array(10).fill(''),
    submitted: false,
  };
};

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRankings, setUserRankings] = useState<Record<string, UserCommunityRanking>>({});
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [liveScoreCache, setLiveScoreCache] = useState<Record<string, Record<string, number>>>({});
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});

  // Load persisted rankings
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const migrated: Record<string, UserCommunityRanking> = {};
          for (const [listId, ranking] of Object.entries(parsed as Record<string, any>)) {
            migrated[listId] = {
              slots: Array.isArray(ranking.slots) ? ranking.slots : Array(10).fill(''),
              submitted: ranking.submitted ?? false,
            };
          }
          setUserRankings(migrated);
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  // Load or generate stable device ID
  useEffect(() => {
    AsyncStorage.getItem(DEVICE_ID_KEY).then(async (stored) => {
      if (stored) {
        setDeviceId(stored);
      } else {
        const newId = Crypto.randomUUID();
        await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
        setDeviceId(newId);
      }
    });
  }, []);

  const persist = useCallback((next: Record<string, UserCommunityRanking>) => {
    setUserRankings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const fetchLiveScores = useCallback(async (listId: string) => {
    const list = ALL_COMMUNITY_LISTS.find((l) => l.id === listId);
    if (!list || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('community_scores')
        .select('item_title, total_score, participant_count')
        .eq('list_id', listId);

      if (error || !data || data.length === 0) return;

      // Build seed fallback map: normalized title → seedScore
      const seedByTitle: Record<string, number> = {};
      list.items.forEach((item) => {
        seedByTitle[item.title.toLowerCase().trim()] = item.seedScore;
      });

      const scores: Record<string, number> = {};
      let maxParticipants = 0;

      data.forEach((row: { item_title: string; total_score: number; participant_count: number }) => {
        const key = row.item_title.toLowerCase().trim();
        scores[key] = row.total_score;
        if (row.participant_count > maxParticipants) {
          maxParticipants = row.participant_count;
        }
      });

      setLiveScoreCache((prev) => ({ ...prev, [listId]: scores }));
      if (maxParticipants > 0) {
        setParticipantCounts((prev) => ({ ...prev, [listId]: maxParticipants }));
      }
    } catch {
      // Network error — silently fall back to seed scores
    }
  }, []);

  const setUserSlots = useCallback(
    (listId: string, slots: string[]) => {
      // Profanity check on changed slots
      const dirty = slots.find((s) => s.trim() && containsProfanity(s));
      if (dirty) {
        Alert.alert('Inappropriate Content', 'Please keep your entries respectful.');
        return;
      }
      const current = userRankings[listId] ?? buildDefaultRanking(listId);
      persist({ ...userRankings, [listId]: { ...current, slots } });
    },
    [userRankings, persist]
  );

  const submitRanking = useCallback(
    async (listId: string) => {
      const current = userRankings[listId] ?? buildDefaultRanking(listId);

      // Profanity check all filled slots
      const badSlot = current.slots.find((s) => s.trim() && containsProfanity(s));
      if (badSlot) {
        Alert.alert('Inappropriate Content', 'Please remove inappropriate entries before submitting.');
        return;
      }

      // Persist locally first
      persist({ ...userRankings, [listId]: { ...current, submitted: true } });

      // Upsert to Supabase if we have a device ID and client is configured
      if (deviceId && supabase) {
        try {
          await supabase.from('community_votes').upsert(
            { device_id: deviceId, list_id: listId, slots: current.slots, submitted_at: new Date().toISOString() },
            { onConflict: 'device_id,list_id' }
          );
        } catch {
          // Non-fatal — local state already saved
        }
      }

      // Optimistically refresh scores
      await fetchLiveScores(listId);
    },
    [userRankings, deviceId, persist, fetchLiveScores]
  );

  return (
    <CommunityContext.Provider
      value={{
        userRankings,
        deviceId,
        liveScoreCache,
        participantCounts,
        fetchLiveScores,
        setUserSlots,
        submitRanking,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = (): CommunityContextType => {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used inside CommunityProvider');
  return ctx;
};
