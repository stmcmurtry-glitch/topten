import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTopRatedMovies, getTopRatedTVShows } from './tmdb';
import { FeaturedList } from '../data/featuredLists';

const CACHE_V = 'v2';
const ITEMS_PREFIX = `@topten_fitems_${CACHE_V}_`;
const IMAGE_PREFIX = `@topten_fimg_${CACHE_V}_`;

const UNSPLASH_KEY =
  process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ||
  'unqrIzAOMjppLYzOuOau81W5fKHuaUpyo8QPy8jesZI';

const itemsMemCache = new Map<string, string[]>();
const imageMemCache = new Map<string, string | null>();

// Curated static items for non-API categories
const STATIC_ITEMS: Record<string, string[]> = {
  'f-2': [
    'To Kill a Mockingbird', '1984', 'The Great Gatsby',
    'Crime and Punishment', 'One Hundred Years of Solitude',
    'Pride and Prejudice', 'Brave New World',
    'The Catcher in the Rye', 'Don Quixote', 'War and Peace',
  ],
  'f-3': [
    'Jesse Owens, 1936 Berlin Olympics', 'Miracle on Ice, 1980',
    'Ali vs. Foreman, Rumble in the Jungle', 'Michael Jordan\'s Last Shot',
    'Usain Bolt 9.58s World Record', 'Tiger Woods, 2000 US Open',
    'Secretariat, 1973 Belmont Stakes', 'Nadia Comaneci\'s Perfect 10',
    'Roger Bannister Breaks 4-Minute Mile', 'The Hand of God',
  ],
  'f-4': [
    'Thriller — Michael Jackson', 'Nevermind — Nirvana',
    'The Dark Side of the Moon — Pink Floyd', 'Rumours — Fleetwood Mac',
    'Kind of Blue — Miles Davis', 'Abbey Road — The Beatles',
    'Purple Rain — Prince', 'What\'s Going On — Marvin Gaye',
    'Born to Run — Bruce Springsteen', 'Miseducation of Lauryn Hill',
  ],
  'f-5': [
    'Omakase Sushi, Tokyo', 'Peking Duck, Beijing',
    'Neapolitan Pizza, Naples', 'Wagyu Beef, Kobe',
    'Fresh Truffle Pasta, Alba', 'Bouillabaisse, Marseille',
    'Ceviche, Lima', 'Dim Sum, Hong Kong',
    'Croissant au Beurre, Paris', 'Rendang, Sumatra',
  ],
  'f-6': [
    'Château Pétrus 2000', 'Pappy Van Winkle 23yr',
    'Dom Pérignon 2008', 'Yamazaki 18yr',
    'Romanée-Conti Grand Cru', 'Negroni',
    'Old Fashioned', 'Dry Martini',
    'Sazerac', 'Aperol Spritz',
  ],
};

// ── Items ──────────────────────────────────────────────────────────────────

export async function fetchFeaturedItems(list: FeaturedList): Promise<string[]> {
  if (itemsMemCache.has(list.id)) return itemsMemCache.get(list.id)!;

  try {
    const stored = await AsyncStorage.getItem(ITEMS_PREFIX + list.id);
    if (stored) {
      const items = JSON.parse(stored) as string[];
      itemsMemCache.set(list.id, items);
      return items;
    }
  } catch {}

  let items: string[] = [];
  try {
    if (list.category === 'Movies') {
      const movies = await getTopRatedMovies();
      items = movies.slice(0, 10).map((m) => m.title);
    } else if (list.category === 'TV') {
      const shows = await getTopRatedTVShows();
      items = shows.slice(0, 10).map((s) => s.title);
    } else {
      items = STATIC_ITEMS[list.id] ?? list.previewItems;
    }
  } catch {
    items = STATIC_ITEMS[list.id] ?? list.previewItems;
  }

  if (items.length > 0) {
    itemsMemCache.set(list.id, items);
    try { await AsyncStorage.setItem(ITEMS_PREFIX + list.id, JSON.stringify(items)); } catch {}
  }
  return items.length > 0 ? items : list.previewItems;
}

// ── Image ──────────────────────────────────────────────────────────────────

export async function fetchFeaturedImage(list: FeaturedList): Promise<string | null> {
  if (imageMemCache.has(list.id)) return imageMemCache.get(list.id)!;

  try {
    const stored = await AsyncStorage.getItem(IMAGE_PREFIX + list.id);
    if (stored !== null) {
      const url = stored === '' ? null : stored;
      imageMemCache.set(list.id, url);
      return url;
    }
  } catch {}

  let imageUrl: string | null = null;
  try {
    if (list.category === 'Movies') {
      const movies = await getTopRatedMovies();
      imageUrl = movies[0]?.backdropUrl ?? null;
    } else if (list.category === 'TV') {
      const shows = await getTopRatedTVShows();
      imageUrl = shows[0]?.backdropUrl ?? null;
    }
    // Fall back to Unsplash landscape for any category (including Movies/TV if backdrop missing)
    if (!imageUrl && UNSPLASH_KEY) {
      const url =
        `https://api.unsplash.com/photos/random` +
        `?query=${encodeURIComponent(list.imageQuery)}` +
        `&orientation=landscape&client_id=${UNSPLASH_KEY}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        imageUrl = data.urls?.regular ?? null;
      }
    }
  } catch {}

  imageMemCache.set(list.id, imageUrl);
  try { await AsyncStorage.setItem(IMAGE_PREFIX + list.id, imageUrl ?? ''); } catch {}
  return imageUrl;
}
