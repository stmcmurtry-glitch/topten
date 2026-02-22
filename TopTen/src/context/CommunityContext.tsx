import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMUNITY_LISTS } from '../data/communityLists';

const STORAGE_KEY = '@topten_community';

export interface UserCommunityRanking {
  orderedIds: string[];
  submitted: boolean;
}

interface CommunityContextType {
  userRankings: Record<string, UserCommunityRanking>;
  getLiveScores: (listId: string) => Record<string, number>;
  setUserOrder: (listId: string, orderedIds: string[]) => void;
  submitRanking: (listId: string) => void;
}

const CommunityContext = createContext<CommunityContextType | null>(null);

const buildDefaultRanking = (listId: string): UserCommunityRanking => {
  const list = COMMUNITY_LISTS.find((l) => l.id === listId);
  return {
    orderedIds: list ? list.items.map((i) => i.id) : [],
    submitted: false,
  };
};

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userRankings, setUserRankings] = useState<Record<string, UserCommunityRanking>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setUserRankings(JSON.parse(raw));
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
        ranking.orderedIds.forEach((itemId, idx) => {
          const pts = 10 - idx; // rank 1 = 10, rank 10 = 1
          if (pts > 0 && scores[itemId] !== undefined) {
            scores[itemId] = scores[itemId] + pts;
          }
        });
      }

      return scores;
    },
    [userRankings]
  );

  const setUserOrder = useCallback(
    (listId: string, orderedIds: string[]) => {
      const current = userRankings[listId] ?? buildDefaultRanking(listId);
      persist({ ...userRankings, [listId]: { ...current, orderedIds } });
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
    <CommunityContext.Provider value={{ userRankings, getLiveScores, setUserOrder, submitRanking }}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = (): CommunityContextType => {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used inside CommunityProvider');
  return ctx;
};
