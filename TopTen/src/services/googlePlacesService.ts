import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommunityList, CommunityItem } from '../data/communityLists';

export const isPlacesCategory = (category: string): boolean =>
  ['Food', 'Drinks'].includes(category);

export function derivePlacesType(listTitle: string, category: string): string {
  const t = (listTitle ?? '').toLowerCase();
  if (t.includes('coffee') || t.includes('cafe')) return 'cafe';
  if (t.includes('bar') || t.includes('pub') || t.includes('nightlife')) return 'bar';
  if (category === 'Drinks') return 'bar';
  return 'restaurant';
}

export function derivePlacesQuery(listTitle: string, category: string): string {
  const t = (listTitle ?? '').toLowerCase();
  if (t.includes('pizza')) return 'pizza restaurants';
  if (t.includes('wing')) return 'wings restaurants';
  if (t.includes('coffee') || t.includes('cafe')) return 'coffee shops';
  if (t.includes('bar') || t.includes('pub') || t.includes('nightlife')) return 'bars';
  if (t.includes('burger')) return 'burger restaurants';
  if (t.includes('sushi')) return 'sushi restaurants';
  if (t.includes('taco') || t.includes('mexican')) return 'mexican restaurants';
  if (t.includes('restaurant') || t.includes('dining')) return 'restaurants';
  if (category === 'Drinks') return 'bars';
  return 'restaurants';
}

export async function searchLocalPlaces(
  city: string,
  query: string,
  placeType?: string
): Promise<Array<{ title: string }>> {
  if (!GOOGLE_PLACES_KEY || !city || !query.trim()) return [];
  const q = encodeURIComponent(`${query} in ${city}`);
  const typeParam = placeType ? `&type=${placeType}` : '';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}${typeParam}&key=${GOOGLE_PLACES_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    const results: Array<{ name: string }> = json.results ?? [];
    return results.slice(0, 20).map((r) => ({ title: r.name }));
  } catch {
    return [];
  }
}

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PlaceConfig {
  slug: string;
  queryTerm: string;
  title: (city: string) => string;
  icon: string;
  color: string;
  appCategory: string;
  description: (city: string) => string;
}

const PLACE_CONFIGS: PlaceConfig[] = [
  {
    slug: 'restaurants',
    queryTerm: 'restaurants',
    title: (city) => `Best Restaurants in ${city}`,
    icon: 'restaurant-outline',
    color: '#FF7043',
    appCategory: 'Food',
    description: (city) => `The top-rated restaurants in ${city}, ranked by you.`,
  },
  {
    slug: 'pizza',
    queryTerm: 'pizza',
    title: (city) => `Best Pizza in ${city}`,
    icon: 'pizza-outline',
    color: '#E17055',
    appCategory: 'Food',
    description: (city) => `Which pizza spot reigns supreme in ${city}?`,
  },
  {
    slug: 'wings',
    queryTerm: 'wings',
    title: (city) => `Best Wings in ${city}`,
    icon: 'flame-outline',
    color: '#FF9F43',
    appCategory: 'Food',
    description: (city) => `The best buffalo wings and chicken wing spots in ${city}.`,
  },
  {
    slug: 'bars',
    queryTerm: 'bars',
    title: (city) => `Best Bars in ${city}`,
    icon: 'wine-outline',
    color: '#6C5CE7',
    appCategory: 'Drinks',
    description: (city) => `The top bars and nightlife spots in ${city}.`,
  },
  {
    slug: 'coffee',
    queryTerm: 'coffee shops',
    title: (city) => `Best Coffee Shops in ${city}`,
    icon: 'cafe-outline',
    color: '#4ECDC4',
    appCategory: 'Drinks',
    description: (city) => `The best cafes and coffee shops in ${city}.`,
  },
];

function slugify(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function fetchPlacesForConfig(
  config: PlaceConfig,
  city: string,
  citySlug: string
): Promise<CommunityList | null> {
  const cacheKey = `@topten_places_${citySlug}_${config.slug}`;

  // Check 24h cache
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        return data as CommunityList;
      }
    }
  } catch {
    // ignore cache read errors
  }

  const query = encodeURIComponent(`best ${config.queryTerm} in ${city}`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_PLACES_KEY}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const json = await response.json();
  const results: Array<{ name: string }> = json.results ?? [];
  if (results.length === 0) return null;

  const items: CommunityItem[] = results.slice(0, 10).map((result, rank) => ({
    id: `${config.slug}-${citySlug}-${rank}`,
    title: result.name,
    seedScore: 100 - rank * 5,
  }));

  const list: CommunityList = {
    id: `local-${config.slug}-${citySlug}`,
    title: config.title(city),
    category: config.appCategory,
    color: config.color,
    icon: config.icon,
    description: config.description(city),
    participantCount: 0,
    items,
    region: city,
  };

  // Persist to cache
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: list }));
  } catch {
    // ignore cache write errors
  }

  return list;
}

export async function fetchLocalPlacesLists(city: string): Promise<CommunityList[]> {
  if (!GOOGLE_PLACES_KEY || !city) return [];

  const citySlug = slugify(city);
  const results = await Promise.allSettled(
    PLACE_CONFIGS.map((config) => fetchPlacesForConfig(config, city, citySlug))
  );

  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((l): l is CommunityList => l !== null);
}
