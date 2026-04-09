import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import { usePostHog } from 'posthog-react-native';
import { resolveCommunityList } from '../data/dynamicListRegistry';
import { supabase } from '../services/supabase';
import { containsProfanity } from '../services/profanityFilter';
import { useAuth } from './AuthContext';

const STORAGE_KEY = '@topten_community';
const DEVICE_ID_KEY = '@topten_device_id';

export interface UserCommunityRanking {
  slots: string[]; // 10 free-form text slots; empty string = unfilled
  submitted: boolean;
  submittedAt?: number; // epoch ms — set when submitted, used for priority bucketing
}

interface CommunityContextType {
  userRankings: Record<string, UserCommunityRanking>;
  deviceId: string | null;
  liveScoreCache: Record<string, Record<string, number>>;
  itemLocations: Record<string, Record<string, string>>;
  participantCounts: Record<string, number>;
  refreshParticipantCounts: (listIds?: string[]) => void;
  fetchLiveScores: (listId: string) => Promise<void>;
  recordItemLocation: (listId: string, title: string, location: string) => void;
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
  const { user, loading: authLoading } = useAuth();
  const [userRankings, setUserRankings] = useState<Record<string, UserCommunityRanking>>({});
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [liveScoreCache, setLiveScoreCache] = useState<Record<string, Record<string, number>>>({});
  const [itemLocations, setItemLocations] = useState<Record<string, Record<string, string>>>({});

  const normalizeTitle = (s: string) =>
    s.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const posthog = usePostHog();
  const loadedForRef = useRef<string | null | undefined>(undefined);

  // Bulk-fetch participant counts for all lists
  const refreshParticipantCounts = useCallback((listIds?: string[]) => {
    if (!supabase) return;
    let query = supabase
      .from('community_scores')
      .select('list_id, participant_count');
    if (listIds && listIds.length > 0) {
      query = (query as any).in('list_id', listIds);
    } else {
      query = (query as any).limit(5000);
    }
    Promise.resolve(query).then(({ data }: { data: Array<{ list_id: string; participant_count: number }> | null }) => {
      if (!data || data.length === 0) return;
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        if (!counts[row.list_id] || row.participant_count > counts[row.list_id]) {
          counts[row.list_id] = row.participant_count;
        }
      });
      setParticipantCounts((prev) => ({ ...prev, ...counts }));
    }).catch(() => {});
  }, []);

  // Fire immediately — community_scores is public, no need to wait for auth.
  // A second fetch fires once auth settles to pick up any auth-scoped changes.
  useEffect(() => {
    refreshParticipantCounts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authLoading) return;
    refreshParticipantCounts();
  }, [authLoading]);

  // Load/reload rankings whenever the signed-in user changes
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id ?? null;
    if (loadedForRef.current === currentUserId) return;

    const wasSignedIn = typeof loadedForRef.current === 'string';
    loadedForRef.current = currentUserId;

    if (currentUserId) {
      // Signed in — restore this user's submitted votes from Supabase
      if (supabase) {
        supabase
          .from('community_votes')
          .select('list_id, slots, submitted_at')
          .eq('device_id', currentUserId)
          .then(({ data }) => {
            if (!data || data.length === 0) {
              setUserRankings({});
              return;
            }
            const restored: Record<string, UserCommunityRanking> = {};
            data.forEach((row: any) => {
              restored[row.list_id] = {
                slots: row.slots ?? Array(10).fill(''),
                submitted: true,
                submittedAt: row.submitted_at ? new Date(row.submitted_at).getTime() : undefined,
              };
            });
            setUserRankings(restored);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
          })
          .catch(() => setUserRankings({}));
      } else {
        setUserRankings({});
      }
    } else if (wasSignedIn) {
      // Signed out — clear so the next account starts clean
      setUserRankings({});
      AsyncStorage.removeItem(STORAGE_KEY);
    } else {
      // Guest session — load from device storage
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const migrated: Record<string, UserCommunityRanking> = {};
          for (const [listId, ranking] of Object.entries(parsed as Record<string, any>)) {
            migrated[listId] = {
              slots: Array.isArray(ranking.slots) ? ranking.slots : Array(10).fill(''),
              submitted: ranking.submitted ?? false,
              submittedAt: ranking.submittedAt,
            };
          }
          setUserRankings(migrated);
        } catch { /* ignore */ }
      });
    }
  }, [user?.id, authLoading]);

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

  const recordItemLocation = useCallback((listId: string, title: string, location: string) => {
    const key = normalizeTitle(title);
    setItemLocations((prev) => ({
      ...prev,
      [listId]: { ...(prev[listId] ?? {}), [key]: location },
    }));
    if (supabase) {
      Promise.resolve(
        supabase.from('community_item_locations').upsert(
          { list_id: listId, normalized_title: key, location, updated_at: new Date().toISOString() },
          { onConflict: 'list_id,normalized_title' }
        )
      ).catch(() => {});
    }
  }, []);

  const fetchLiveScores = useCallback(async (listId: string) => {
    if (!supabase) return;

    try {
      const [scoresRes, locsRes] = await Promise.all([
        supabase
          .from('community_scores')
          .select('item_title, total_score, participant_count')
          .eq('list_id', listId),
        supabase
          .from('community_item_locations')
          .select('normalized_title, location')
          .eq('list_id', listId),
      ]);

      if (!scoresRes.data || scoresRes.data.length === 0) return;

      const scores: Record<string, number> = {};
      let maxParticipants = 0;
      scoresRes.data.forEach((row: { item_title: string; total_score: number; participant_count: number }) => {
        scores[row.item_title.toLowerCase().trim()] = row.total_score;
        if (row.participant_count > maxParticipants) maxParticipants = row.participant_count;
      });
      setLiveScoreCache((prev) => ({ ...prev, [listId]: scores }));
      if (maxParticipants > 0) {
        setParticipantCounts((prev) => ({ ...prev, [listId]: maxParticipants }));
      }

      if (locsRes.data && locsRes.data.length > 0) {
        const locs: Record<string, string> = {};
        locsRes.data.forEach((row: { normalized_title: string; location: string }) => {
          locs[row.normalized_title] = row.location;
        });
        setItemLocations((prev) => ({
          ...prev,
          [listId]: { ...(prev[listId] ?? {}), ...locs },
        }));
      }
    } catch {
      // Network error — silently skip
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
      persist({ ...userRankings, [listId]: { ...current, submitted: true, submittedAt: Date.now() } });
      const filledCount = current.slots.filter((s) => s.trim()).length;
      posthog?.capture('community_vote_submitted', { list_id: listId, filled_slots: filledCount });

      // Guests get a local-only experience — only authenticated votes count toward community scores
      if (!user) return;

      // Upsert to Supabase for authenticated users only
      if (!supabase) {
        posthog?.capture('community_vote_supabase_null', { list_id: listId });
      } else {
        try {
          // Trim whitespace only — keep original casing for display.
          // Aggregation in refresh_community_scores uses lower() for case-insensitive grouping.
          const normalizedSlots = current.slots.map((s) => s.trim());
          const { error: upsertError } = await supabase.from('community_votes').upsert(
            { device_id: user.id, list_id: listId, slots: normalizedSlots, submitted_at: new Date().toISOString() },
            { onConflict: 'device_id,list_id' }
          );
          if (upsertError) {
            posthog?.capture('community_vote_upsert_error', {
              list_id: listId,
              error_message: upsertError.message,
              error_code: upsertError.code,
            });
          } else {
            posthog?.capture('community_vote_saved_to_supabase', { list_id: listId });
            // Refresh aggregated scores for this list only — fire-and-forget so
            // a slow rebuild never blocks vote confirmation or causes a timeout.
            Promise.resolve(supabase.rpc('refresh_community_scores_for_list', { p_list_id: listId })).catch(() => {});
          }
        } catch (err: unknown) {
          posthog?.capture('community_vote_exception', {
            list_id: listId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Optimistically refresh scores
      await fetchLiveScores(listId);
    },
    [userRankings, deviceId, user, persist, fetchLiveScores]
  );

  return (
    <CommunityContext.Provider
      value={{
        userRankings,
        deviceId,
        liveScoreCache,
        itemLocations,
        participantCounts,
        refreshParticipantCounts,
        fetchLiveScores,
        recordItemLocation,
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
