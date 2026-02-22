import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TopTenList, TopTenItem } from './schema';
import { seedLists } from './seedData';

const STORAGE_KEY = '@topten_lists';

const CATEGORY_ICONS: Record<string, string> = {
  Movies: 'film-outline',
  TV: 'tv-outline',
  Sports: 'trophy-outline',
  Music: 'musical-notes-outline',
  Food: 'restaurant-outline',
  Drinks: 'wine-outline',
  Books: 'book-outline',
  Foods: 'restaurant-outline',
  Golf: 'golf-outline',
  Wine: 'wine-outline',
};

interface ListContextType {
  lists: TopTenList[];
  addList: (category: string, title?: string, description?: string) => string;
  updateListItems: (listId: string, items: TopTenItem[]) => void;
  updateListMeta: (listId: string, meta: { description?: string; customIcon?: string }) => void;
  deleteList: (listId: string) => void;
  reorderLists: (newOrder: TopTenList[]) => void;
}

const ListContext = createContext<ListContextType>({
  lists: [],
  addList: () => '',
  updateListItems: () => {},
  updateListMeta: () => {},
  deleteList: () => {},
  reorderLists: () => {},
});

export const useListContext = () => useContext(ListContext);

export const ListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lists, setLists] = useState<TopTenList[]>(seedLists);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        const stored: TopTenList[] = JSON.parse(data);
        const storedIds = new Set(stored.map((l) => l.id));
        const newSeeds = seedLists.filter((s) => !storedIds.has(s.id));
        if (newSeeds.length > 0) {
          const merged = [...stored, ...newSeeds];
          setLists(merged);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } else {
          setLists(stored);
        }
      }
    });
  }, []);

  const persist = useCallback((updatedLists: TopTenList[]) => {
    setLists(updatedLists);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLists));
  }, []);

  const addList = useCallback((category: string, title?: string, description?: string): string => {
    const id = Date.now().toString();
    const newList: TopTenList = {
      id,
      category,
      title: title ?? `My Top 10 ${category}`,
      icon: CATEGORY_ICONS[category] ?? 'list-outline',
      items: [],
      createdAt: new Date().toISOString(),
      isCustom: true,
      description,
    };
    persist([...lists, newList]);
    return id;
  }, [lists, persist]);

  const updateListMeta = useCallback((listId: string, meta: { description?: string; customIcon?: string }) => {
    const updated = lists.map((l) => l.id === listId ? { ...l, ...meta } : l);
    persist(updated);
  }, [lists, persist]);

  const reorderLists = useCallback((newOrder: TopTenList[]) => {
    persist(newOrder);
  }, [persist]);

  const updateListItems = useCallback((listId: string, items: TopTenItem[]) => {
    const updated = lists.map((l) => (l.id === listId ? { ...l, items } : l));
    persist(updated);
  }, [lists, persist]);

  const deleteList = useCallback((listId: string) => {
    const updated = lists.filter((l) => l.id !== listId);
    persist(updated);
  }, [lists, persist]);

  return (
    <ListContext.Provider value={{ lists, addList, updateListItems, updateListMeta, deleteList, reorderLists }}>
      {children}
    </ListContext.Provider>
  );
};
