import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@topten_viewed_featured';

interface ViewedListsContextType {
  viewedIds: Set<string>;
  markViewed: (id: string) => void;
}

const ViewedListsContext = createContext<ViewedListsContextType>({
  viewedIds: new Set(),
  markViewed: () => {},
});

export const ViewedListsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // Load persisted viewed IDs on app start
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setViewedIds(new Set(JSON.parse(raw)));
    }).catch(() => {});
  }, []);

  const markViewed = useCallback((id: string) => {
    setViewedIds(prev => {
      if (prev.has(id)) return prev; // no change needed
      const next = new Set(prev);
      next.add(id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ViewedListsContext.Provider value={{ viewedIds, markViewed }}>
      {children}
    </ViewedListsContext.Provider>
  );
};

export const useViewedLists = () => useContext(ViewedListsContext);
