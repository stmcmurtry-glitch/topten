import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TopTenList, TopTenItem } from './schema';
import { seedLists } from './seedData';
import { CATEGORY_ICONS } from './categories';

const STORAGE_KEY = '@topten_lists';

interface ListContextType {
  lists: TopTenList[];
  addList: (category: string, title?: string, description?: string) => string;
  updateListItems: (listId: string, items: TopTenItem[]) => void;
  updateListMeta: (listId: string, meta: { description?: string; customIcon?: string; category?: string }) => void;
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

  const updateListMeta = useCallback((listId: string, meta: { description?: string; customIcon?: string; category?: string }) => {
    const updated = lists.map((l) => {
      if (l.id !== listId) return l;
      const patch: Partial<TopTenList> = { ...meta };
      // When category changes, reset icon to the category default
      if (meta.category) patch.icon = CATEGORY_ICONS[meta.category] ?? 'list-outline';
      return { ...l, ...patch };
    });
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
