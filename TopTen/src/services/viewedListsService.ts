import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@topten_viewed_featured';
let viewedSet: Set<string> | null = null;

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
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...viewedSet!]));
  } catch {
    // Non-fatal
  }
}

export function isViewedSync(id: string): boolean {
  return viewedSet?.has(id) ?? false;
}
