import AsyncStorage from '@react-native-async-storage/async-storage';
import { TopTenList } from '../data/schema';

// Bump this version string whenever queries change — invalidates stored cache
const CACHE_VERSION = 'v5';
const STORAGE_PREFIX = `@topten_img_${CACHE_VERSION}_`;

// Hardcoded fallback so the key is never lost across hot reloads
const UNSPLASH_KEY =
  process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ||
  'unqrIzAOMjppLYzOuOau81W5fKHuaUpyo8QPy8jesZI';

const CATEGORY_QUERIES: Record<string, string> = {
  Movies:  'cinema film',
  TV:      'television',
  Sports:  'athlete stadium',
  Music:   'concert music',
  Food:    'food',
  Drinks:  'cocktail',
  Books:   'books library',
  Golf:    'golfer',
  Wine:    'wine',
  Foods:   'food',
  // Community list images — keyed by list id
  'community-movies':   'cinema film',
  'community-tv':       'television',
  'community-songs':    'concert music',
  'community-athletes': 'athlete sport',
  'community-books':    'books library',
};

// In-memory layer (fast path within a session)
const memCache = new Map<string, string | null>();

export async function fetchCategoryImage(category: string): Promise<string | null> {
  // 1. Memory cache (fastest)
  if (memCache.has(category)) return memCache.get(category)!;

  // 2. AsyncStorage (persists across reloads & restarts)
  try {
    const stored = await AsyncStorage.getItem(STORAGE_PREFIX + category);
    if (stored !== null) {
      const url = stored === '' ? null : stored;
      memCache.set(category, url);
      return url;
    }
  } catch {}

  // 3. Fetch from Unsplash
  try {
    const query = CATEGORY_QUERIES[category] ?? category;
    const url =
      `https://api.unsplash.com/photos/random` +
      `?query=${encodeURIComponent(query)}` +
      `&client_id=${UNSPLASH_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Unsplash] ${res.status} for "${category}"`);
      await persist(category, null);
      return null;
    }
    const data = await res.json();
    const imageUrl: string | null = data.urls?.small ?? data.urls?.regular ?? null;
    await persist(category, imageUrl);
    return imageUrl;
  } catch (e) {
    console.warn(`[Unsplash] fetch error for "${category}":`, e);
    await persist(category, null);
    return null;
  }
}

async function persist(category: string, url: string | null) {
  memCache.set(category, url);
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + category, url ?? '');
  } catch {}
}

/** Returns the imageUrl of the top-ranked item in a list, or null. */
export function getListTopImageUrl(list: TopTenList): string | null {
  if (!list.items.length) return null;
  const sorted = [...list.items].sort((a, b) => a.rank - b.rank);
  return sorted[0]?.imageUrl ?? null;
}
