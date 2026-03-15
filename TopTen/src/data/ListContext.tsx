import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TopTenList, TopTenItem } from './schema';
import { seedLists } from './seedData';
import { CATEGORY_ICONS } from './categories';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const STORAGE_KEY = '@topten_lists';

interface ListContextType {
  lists: TopTenList[];
  listsLoading: boolean;
  addList: (category: string, title?: string, description?: string) => string;
  updateListItems: (listId: string, items: TopTenItem[]) => void;
  updateListMeta: (listId: string, meta: { description?: string; customIcon?: string; category?: string; coverImageUri?: string; profileImageUri?: string }) => void;
  deleteList: (listId: string) => void;
  reorderLists: (newOrder: TopTenList[]) => void;
}

const ListContext = createContext<ListContextType>({
  lists: [],
  listsLoading: true,
  addList: () => '',
  updateListItems: () => {},
  updateListMeta: () => {},
  deleteList: () => {},
  reorderLists: () => {},
});

export const useListContext = () => useContext(ListContext);

// ---- Helpers ----

const backfillIcons = (stored: TopTenList[]): { lists: TopTenList[]; changed: boolean } => {
  let changed = false;
  const lists = stored.map((l) => {
    if (l.icon) return l;
    changed = true;
    return { ...l, icon: CATEGORY_ICONS[l.category] ?? 'list-outline' };
  });
  return { lists, changed };
};

const mergeWithSeeds = (stored: TopTenList[]): TopTenList[] => {
  const storedIds = new Set(stored.map((l) => l.id));
  const newSeeds = seedLists.filter((s) => !storedIds.has(s.id));
  return newSeeds.length > 0 ? [...stored, ...newSeeds] : stored;
};

// ---- Cloud helpers (fire-and-forget) ----

const cloudUpsert = (userId: string, list: TopTenList, sortOrder: number) => {
  if (!supabase) return;
  supabase.from('user_lists').upsert({
    id: list.id,
    user_id: userId,
    sort_order: sortOrder,
    data: list,
    updated_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error('[cloud] upsert failed:', error.message, error.code);
  });
};

const cloudUpsertBatch = (userId: string, lists: TopTenList[]) => {
  if (!supabase) return;
  supabase.from('user_lists').upsert(
    lists.map((list, index) => ({
      id: list.id,
      user_id: userId,
      sort_order: index,
      data: list,
      updated_at: new Date().toISOString(),
    }))
  ).then(({ error }) => {
    if (error) console.error('[cloud] batch upsert failed:', error.message, error.code);
  });
};

const cloudDelete = (listId: string) => {
  if (!supabase) return;
  supabase.from('user_lists').delete().eq('id', listId).then(({ error }) => {
    if (error) console.error('[cloud] delete failed:', error.message, error.code);
  });
};

// ---- Provider ----

export const ListProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState<TopTenList[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const loadedForRef = useRef<string | null | undefined>(undefined); // tracks which userId we last loaded for

  const loadLocalLists = useCallback(async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const stored: TopTenList[] = JSON.parse(data);
      const { lists: withIcons, changed } = backfillIcons(stored);
      const merged = mergeWithSeeds(withIcons);
      if (merged.length !== withIcons.length || changed) {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      setLists(merged);
    } else {
      setLists(seedLists);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seedLists));
    }
    setListsLoading(false);
  }, []);

  const loadCloudLists = useCallback(async (userId: string) => {
    if (!supabase) {
      await loadLocalLists();
      return;
    }

    const { data: rows, error } = await supabase
      .from('user_lists')
      .select('id, sort_order, data')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('[cloud] load failed, falling back to local:', error.message);
      await loadLocalLists();
      return;
    }

    if (!rows || rows.length === 0) {
      // First cloud login — migrate local lists up
      const localData = await AsyncStorage.getItem(STORAGE_KEY);
      let toMigrate: TopTenList[];
      if (localData) {
        const local: TopTenList[] = JSON.parse(localData);
        const { lists: withIcons } = backfillIcons(local);
        toMigrate = mergeWithSeeds(withIcons);
      } else {
        toMigrate = [...seedLists];
      }
      cloudUpsertBatch(userId, toMigrate);
      setLists(toMigrate);
    } else {
      const cloudLists: TopTenList[] = rows.map((r: any) => r.data);
      const { lists: withIcons } = backfillIcons(cloudLists);
      // Keep AsyncStorage in sync with cloud so local backup is always fresh
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withIcons));
      setLists(withIcons);
    }

    setListsLoading(false);
  }, [loadLocalLists]);

  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id ?? null;
    if (loadedForRef.current === currentUserId) return; // already loaded for this user

    const wasSignedIn = typeof loadedForRef.current === 'string';
    loadedForRef.current = currentUserId;

    setListsLoading(true);
    if (currentUserId) {
      loadCloudLists(currentUserId);
    } else if (wasSignedIn) {
      // Signed out — clear stale local data so the next account doesn't inherit it.
      // The previous user's lists are safe in Supabase.
      AsyncStorage.removeItem(STORAGE_KEY);
      setLists(seedLists);
      setListsLoading(false);
    } else {
      loadLocalLists();
    }
  }, [user?.id, authLoading, loadCloudLists, loadLocalLists]);

  // ---- Mutations ----

  // Always write to AsyncStorage as a local backup — protects against in-flight cloud
  // upserts being lost when the app is killed before they complete.
  const persistLocal = useCallback((updatedLists: TopTenList[]) => {
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
    const updated = [...lists, newList];
    persistLocal(updated);
    if (user) cloudUpsert(user.id, newList, updated.length - 1);
    return id;
  }, [lists, persistLocal, user]);

  const updateListMeta = useCallback((listId: string, meta: { description?: string; customIcon?: string; category?: string; coverImageUri?: string; profileImageUri?: string }) => {
    const updated = lists.map((l) => {
      if (l.id !== listId) return l;
      const patch: Partial<TopTenList> = { ...meta };
      if (meta.category) patch.icon = CATEGORY_ICONS[meta.category] ?? 'list-outline';
      return { ...l, ...patch };
    });
    persistLocal(updated);
    if (user) {
      const idx = updated.findIndex((l) => l.id === listId);
      if (idx >= 0) cloudUpsert(user.id, updated[idx], idx);
    }
  }, [lists, persistLocal, user]);

  const reorderLists = useCallback((newOrder: TopTenList[]) => {
    persistLocal(newOrder);
    if (user) cloudUpsertBatch(user.id, newOrder);
  }, [persistLocal, user]);

  const updateListItems = useCallback((listId: string, items: TopTenItem[]) => {
    const updated = lists.map((l) => (l.id === listId ? { ...l, items } : l));
    persistLocal(updated);
    if (user) {
      const idx = updated.findIndex((l) => l.id === listId);
      if (idx >= 0) cloudUpsert(user.id, updated[idx], idx);
    }
  }, [lists, persistLocal, user]);

  const deleteList = useCallback((listId: string) => {
    const updated = lists.filter((l) => l.id !== listId);
    persistLocal(updated);
    if (user) cloudDelete(listId);
  }, [lists, persistLocal, user]);

  return (
    <ListContext.Provider value={{ lists, listsLoading, addList, updateListItems, updateListMeta, deleteList, reorderLists }}>
      {children}
    </ListContext.Provider>
  );
};
