import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@topten_viewed_featured';
let viewedSet: Set<string> | null = null;

type Listener = (ids: Set<string>) => void;
const listeners = new Set<Listener>();

export function subscribeViewedIds(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getViewedFeaturedIds(): Promise<Set<string>> {
  if (viewedSet) return viewedSet;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    viewedSet = raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    viewedSet = new Set<string>();
  }
  return viewedSet;
}

export async function markFeaturedViewed(id: string): Promise<void> {
  if (!viewedSet) await getViewedFeaturedIds();
  viewedSet!.add(id);
  const snapshot = new Set(viewedSet!);
  listeners.forEach(fn => fn(snapshot));
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...viewedSet!]));
  } catch {
    // Non-fatal
  }
  // Invalidate cache so next read reflects persisted state
  viewedSet = null;
}

export function isViewedSync(id: string): boolean {
  return viewedSet?.has(id) ?? false;
}

/** Force-clears the in-memory cache so the next getViewedFeaturedIds() re-reads AsyncStorage. */
export function invalidateViewedCache(): void {
  viewedSet = null;
}
