import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMUNITY_LISTS } from '../data/communityLists';

const STORAGE_KEY = '@topten_community';

export interface UserCommunityRanking {
  slots: string[]; // 10 free-form text slots; empty string = unfilled
  submitted: boolean;
}

interface CommunityContextType {
  userRankings: Record<string, UserCommunityRanking>;
  getLiveScores: (listId: string) => Record<string, number>;
  setUserSlots: (listId: string, slots: string[]) => void;
  submitRanking: (listId: string) => void;
}

const CommunityContext = createContext<CommunityContextType | null>(null);

const buildDefaultRanking = (listId: string): UserCommunityRanking => {
  const list = COMMUNITY_LISTS.find((l) => l.id === listId);
  return {
    // Pre-populate with community item titles so there's a useful starting point
    slots: list ? list.items.map((i) => i.title) : Array(10).fill(''),
    submitted: false,
  };
};

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRankings, setUserRankings] = useState<Record<string, UserCommunityRanking>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Migrate old orderedIds format to slots
          const migrated: Record<string, UserCommunityRanking> = {};
          for (const [listId, ranking] of Object.entries(parsed as Record<string, any>)) {
            if (ranking.orderedIds && !ranking.slots) {
              const list = COMMUNITY_LISTS.find((l) => l.id === listId);
              const idToTitle: Record<string, string> = {};
              list?.items.forEach((i) => { idToTitle[i.id] = i.title; });
              migrated[listId] = {
                slots: ranking.orderedIds.map((id: string) => idToTitle[id] ?? ''),
                submitted: ranking.submitted ?? false,
              };
            } else {
              migrated[listId] = ranking as UserCommunityRanking;
            }
          }
          setUserRankings(migrated);
        } catch {
          // ignore parse errors
        }
      }
    });
  }, []);

  const persist = useCallback((next: Record<string, UserCommunityRanking>) => {
    setUserRankings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const getLiveScores = useCallback(
    (listId: string): Record<string, number> => {
      const list = COMMUNITY_LISTS.find((l) => l.id === listId);
      if (!list) return {};

      const scores: Record<string, number> = {};
      list.items.forEach((item) => {
        scores[item.id] = item.seedScore;
      });

      const ranking = userRankings[listId];
      if (ranking?.submitted) {
        // Build normalized title → id map so we can match free-form text
        const titleToId: Record<string, string> = {};
        list.items.forEach((item) => {
          titleToId[item.title.trim().toLowerCase()] = item.id;
        });

        ranking.slots.forEach((slotTitle, idx) => {
          if (!slotTitle.trim()) return;
          const itemId = titleToId[slotTitle.trim().toLowerCase()];
          const pts = 10 - idx; // rank 1 = 10 pts … rank 10 = 1 pt
          if (pts > 0 && itemId && scores[itemId] !== undefined) {
            scores[itemId] += pts;
          }
        });
      }

      return scores;
    },
    [userRankings]
  );

  const setUserSlots = useCallback(
    (listId: string, slots: string[]) => {
      const current = userRankings[listId] ?? buildDefaultRanking(listId);
      persist({ ...userRankings, [listId]: { ...current, slots } });
    },
    [userRankings, persist]
  );

  const submitRanking = useCallback(
    (listId: string) => {
      const current = userRankings[listId] ?? buildDefaultRanking(listId);
      persist({ ...userRankings, [listId]: { ...current, submitted: true } });
    },
    [userRankings, persist]
  );

  return (
    <CommunityContext.Provider value={{ userRankings, getLiveScores, setUserSlots, submitRanking }}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = (): CommunityContextType => {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used inside CommunityProvider');
  return ctx;
};
