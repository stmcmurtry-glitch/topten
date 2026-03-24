import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommunityList, CommunityItem } from '../data/communityLists';
import { supabase } from './supabase';

// ── In-memory search cache ────────────────────────────────────────────────────
// Keyed by query string. Prevents redundant API calls for repeated searches
// within the same session (e.g. backspace + retype, returning to a screen).
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
type SearchCacheEntry = { results: Array<{ title: string; location?: string }>; ts: number };
const searchCache = new Map<string, SearchCacheEntry>();

function getCachedSearch(key: string): Array<{ title: string; location?: string }> | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > SEARCH_CACHE_TTL_MS) { searchCache.delete(key); return null; }
  return entry.results;
}
function setCachedSearch(key: string, results: Array<{ title: string; location?: string }>) {
  searchCache.set(key, { results, ts: Date.now() });
}

// Keywords that suggest a list is about physical venues (→ use Google Places)
const VENUE_KEYWORDS = [
  'restaurant', 'pizza', 'wing', 'sushi', 'burger', 'taco', 'mexican', 'italian',
  'brunch', 'diner', 'bistro', 'eatery', 'dining', 'steakhouse', 'steak',
  'bar', 'bars', 'pub', 'pubs', 'nightlife', 'brewery', 'breweries', 'brewpub',
  'rooftop', 'sports bar', 'sports bars',
  'cafe', 'cafes', 'coffee shop', 'coffee shops',
  'ice cream', 'dessert', 'desserts',
  'live music', 'music venue', 'music venues', 'concert',
  'bbq', 'barbecue', 'patio', 'breakfast', 'seafood',
  'thai', 'chinese', 'dim sum', 'indian',
  'sandwich', 'sandwiches', 'deli', 'delis',
  'vegan', 'vegetarian', 'food truck', 'food trucks',
];

// Keywords that indicate a "places to visit" list (Travel category → tourist_attraction)
const PLACES_TO_VISIT_KEYWORDS = [
  'places to visit', 'places to see', 'attractions', 'landmarks', 'sights',
  'park', 'parks', 'outdoor',
  'hotel', 'hotels', 'stay', 'lodging',
];

// Keywords that suggest a list is about products/brands (→ do NOT use Google Places)
const PRODUCT_KEYWORDS = [
  'wine', 'wines', 'cocktail', 'cocktails', 'beer', 'beers', 'whiskey', 'whisky',
  'spirit', 'spirits', 'sake', 'champagne', 'vodka', 'rum', 'gin', 'tequila',
  'bourbon', 'cider', 'mead', 'snack', 'cheese',
  // National chains/brands are not local venues
  'chain', 'chains', 'fast food', 'franchise',
];

/**
 * Returns true only when the list is about local venues (restaurants, bars, cafes, etc.)
 * and Google Places results make sense.
 *
 * Only Food lists can be venue lists — Drinks is for actual beverages (wines, cocktails,
 * beers, spirits). Bars and coffee shops live under Food as venue types.
 */
export function isVenueList(listTitle: string, category: string): boolean {
  const t = (listTitle ?? '').toLowerCase();
  if (category === 'Travel') {
    return PLACES_TO_VISIT_KEYWORDS.some((kw) => t.includes(kw));
  }
  if (category === 'Drinks') {
    // Breweries and bars are physical venues — allow Places lookup
    if (t.includes('brewery') || t.includes('breweries') || t.includes('brewpub')) return true;
    if (t.includes('bar') || t.includes('bars') || t.includes('pub') || t.includes('nightlife')) return true;
    return false;
  }
  if (category === 'Health') {
    return t.includes('spa') || t.includes('spas') || t.includes('wellness');
  }
  if (category === 'Arts') {
    return t.includes('gallery') || t.includes('galleries') || t.includes('comedy');
  }
  if (category === 'Sports') {
    return t.includes('bowling');
  }
  if (category !== 'Food') return false;
  if (PRODUCT_KEYWORDS.some((kw) => t.includes(kw))) return false;
  if (VENUE_KEYWORDS.some((kw) => t.includes(kw))) return true;
  return false;
}

/** @deprecated Use isVenueList(listTitle, category) instead */
export const isPlacesCategory = (category: string): boolean =>
  ['Food', 'Drinks'].includes(category);

export function derivePlacesType(listTitle: string, category: string): string | undefined {
  const t = (listTitle ?? '').toLowerCase();
  if (category === 'Travel') {
    if (t.includes('hotel') || t.includes('hotels') || t.includes('stay') || t.includes('lodging')) return 'lodging';
    return undefined; // no filter for general places to visit
  }
  if (t.includes('museum')) return 'museum';
  if (t.includes('coffee') || t.includes('cafe')) return 'cafe';
  if (t.includes('bar') || t.includes('pub') || t.includes('nightlife')) return 'bar';
  if (category === 'Drinks') return 'bar';
  if (t.includes('spa') || t.includes('wellness')) return 'spa';
  if (t.includes('bowling')) return 'bowling_alley';
  if (t.includes('gallery') || t.includes('galleries')) return 'art_gallery';
  return 'restaurant';
}

export function derivePlacesQuery(listTitle: string, category: string): string {
  if (category === 'Travel') {
    const t = (listTitle ?? '').toLowerCase();
    if (t.includes('hotel') || t.includes('hotels') || t.includes('stay') || t.includes('lodging')) return 'hotels';
    if (t.includes('park') || t.includes('outdoor')) return 'parks and outdoor spaces';
    return 'top places to visit';
  }
  const t = (listTitle ?? '').toLowerCase();
  if (t.includes('pizza')) return 'pizza restaurants';
  if (t.includes('wing')) return 'wings restaurants';
  if (t.includes('brunch')) return 'brunch restaurants';
  if (t.includes('breakfast')) return 'breakfast restaurants';
  if (t.includes('burger')) return 'burger restaurants';
  if (t.includes('sushi')) return 'sushi restaurants';
  if (t.includes('steak') || t.includes('steakhouse')) return 'steakhouses';
  if (t.includes('fine dining') || t.includes('upscale') || t.includes('fine-dining')) return 'fine dining restaurants';
  if (t.includes('bbq') || t.includes('barbecue')) return 'BBQ restaurants';
  if (t.includes('outdoor dining') || t.includes('patio')) return 'outdoor patio dining restaurants';
  if (t.includes('seafood')) return 'seafood restaurants';
  if (t.includes('italian')) return 'Italian restaurants';
  if (t.includes('taco') || t.includes('mexican')) return 'mexican restaurants';
  if (t.includes('thai')) return 'Thai restaurants';
  if (t.includes('chinese') || t.includes('dim sum')) return 'Chinese restaurants';
  if (t.includes('indian')) return 'Indian restaurants';
  if (t.includes('sandwich') || t.includes('deli')) return 'sandwich shops and delis';
  if (t.includes('vegan') || t.includes('vegetarian')) return 'vegan restaurants';
  if (t.includes('food truck')) return 'food trucks';
  if (t.includes('wine bar')) return 'wine bars';
  if (t.includes('cocktail')) return 'cocktail bars';
  if (t.includes('brewery') || t.includes('breweries')) return 'breweries';
  if (t.includes('rooftop')) return 'rooftop bars';
  if (t.includes('ice cream') || t.includes('dessert')) return 'ice cream and dessert shops';
  if (t.includes('live music') || t.includes('music venue')) return 'live music venues';
  if (t.includes('sports bar')) return 'sports bars';
  if (t.includes('comedy')) return 'comedy clubs';
  if (t.includes('spa') || t.includes('wellness')) return 'spas and wellness centers';
  if (t.includes('bowling')) return 'bowling alleys';
  if (t.includes('gallery') || t.includes('galleries')) return 'art galleries';
  if (t.includes('coffee') || t.includes('cafe')) return 'coffee shops';
  if (t.includes('bar') || t.includes('pub') || t.includes('nightlife')) return 'bars';
  if (t.includes('golf')) return 'public golf courses';
  if (t.includes('pickleball')) return 'pickleball courts';
  if (t.includes('museum')) return 'museums';
  if (t.includes('walking') || t.includes('trail')) return 'walking trails and paths';
  if (t.includes('restaurant') || t.includes('dining')) return 'restaurants';
  if (category === 'Drinks') return 'bars';
  return 'restaurants';
}

export async function searchCities(
  query: string
): Promise<Array<{ name: string; secondary: string }>> {
  if (!GOOGLE_PLACES_KEY || !query.trim()) return [];
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(query)}&types=(cities)&key=${GOOGLE_PLACES_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.predictions ?? []).slice(0, 8).map((p: any) => ({
      name: p.structured_formatting?.main_text ?? p.description,
      secondary: p.structured_formatting?.secondary_text ?? '',
    }));
  } catch {
    return [];
  }
}

/** Parses "2121 Market St, Philadelphia, PA 19103, USA" → "2121 Market St"
 *  Returns empty string for addresses without a street (e.g. city-only strings).
 */
function parseLocation(formattedAddress: string): string {
  // Need at least 4 parts: [street, city, state+zip, country]
  const parts = formattedAddress.split(', ');
  return parts.length >= 4 ? parts[0] : '';
}

/**
 * Parses "279 E Houston St, New York, NY 10002, USA" → "E Houston St, New York, NY"
 * Used for national search results where multiple locations of the same brand
 * may appear in the same city and need street-level disambiguation.
 */
function parseLocationWithStreet(formattedAddress: string): string {
  const parts = formattedAddress.split(', ');
  if (parts.length >= 4) {
    const street = parts[0];
    const city = parts[parts.length - 3];
    const stateZip = parts[parts.length - 2];
    const state = stateZip.split(' ')[0];
    if (city && state && state.length <= 3) return `${street}, ${city}, ${state}`;
  }
  // Fall back to city, state if address doesn't have a street component
  return parseLocation(formattedAddress);
}

/** Search Google Places with no location bias — for national community lists.
 *  Pure text relevance lets Google rank by global prominence, so specific
 *  business names (e.g. "Franklin BBQ") surface the right result regardless
 *  of the user's device location, while small local businesses can still be
 *  found when the user types their exact name.
 */
export async function searchPlacesGlobal(
  query: string,
  placeType?: string
): Promise<Array<{ title: string; location?: string }>> {
  if (!GOOGLE_PLACES_KEY || !query.trim()) return [];
  const memKey = `global:${query.trim().toLowerCase()}:${placeType ?? ''}`;
  const querySlug = slugify(query.trim()).slice(0, 80);
  const configSlug = `search-global:${querySlug}:${placeType ?? ''}`;

  // L0: in-memory session cache
  const cached = getCachedSearch(memKey);
  if (cached) return cached;

  // L1: AsyncStorage device cache (24h)
  const asyncKey = `@topten_search_global_${querySlug}_${placeType ?? ''}`;
  try {
    const stored = await AsyncStorage.getItem(asyncKey);
    if (stored) {
      const { timestamp, data } = JSON.parse(stored);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        setCachedSearch(memKey, data);
        return data;
      }
    }
  } catch { /* ignore */ }

  // L2: Supabase shared cache (24h)
  if (supabase) {
    try {
      const l2Result = await Promise.race([
        supabase.from('places_cache').select('data, updated_at').eq('city_slug', 'global').eq('config_slug', configSlug).single(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      if (l2Result) {
        const { data: row } = l2Result;
        if (row) {
          const age = Date.now() - new Date(row.updated_at).getTime();
          if (age < CACHE_TTL_MS) {
            const results = row.data as Array<{ title: string; location?: string }>;
            setCachedSearch(memKey, results);
            AsyncStorage.setItem(asyncKey, JSON.stringify({ timestamp: Date.now(), data: results })).catch(() => {});
            return results;
          }
        }
      }
    } catch { /* supabase unavailable */ }
  }

  // L3: Google Places API
  const q = encodeURIComponent(query);
  const typeParam = placeType ? `&type=${placeType}` : '';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}${typeParam}&key=${GOOGLE_PLACES_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    const results: Array<{ name: string; formatted_address?: string }> = json.results ?? [];
    const mapped = results.slice(0, 10).map((r) => ({
      title: r.name,
      location: r.formatted_address ? parseLocationWithStreet(r.formatted_address) : undefined,
    }));
    setCachedSearch(memKey, mapped);
    AsyncStorage.setItem(asyncKey, JSON.stringify({ timestamp: Date.now(), data: mapped })).catch(() => {});
    if (supabase) {
      Promise.resolve(supabase.from('places_cache').upsert(
        { city_slug: 'global', config_slug: configSlug, data: mapped, updated_at: new Date().toISOString() },
        { onConflict: 'city_slug,config_slug' }
      )).catch(() => {});
    }
    return mapped;
  } catch {
    return [];
  }
}

export async function searchLocalPlaces(
  city: string,
  query: string,
  placeType?: string
): Promise<Array<{ title: string; location?: string }>> {
  if (!GOOGLE_PLACES_KEY || !city || !query.trim()) return [];

  const citySlug = slugify(city);
  const querySlug = slugify(query.trim()).slice(0, 80);
  const configSlug = `search:${querySlug}:${placeType ?? ''}`;
  const memKey = `local:${city.toLowerCase()}:${query.trim().toLowerCase()}:${placeType ?? ''}`;

  // L0: in-memory session cache (1h)
  const cached = getCachedSearch(memKey);
  if (cached) return cached;

  // L1: AsyncStorage device cache (24h)
  const asyncKey = `@topten_search_${citySlug}_${querySlug}_${placeType ?? ''}`;
  try {
    const stored = await AsyncStorage.getItem(asyncKey);
    if (stored) {
      const { timestamp, data } = JSON.parse(stored);
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        setCachedSearch(memKey, data);
        return data;
      }
    }
  } catch { /* ignore */ }

  // L2: Supabase shared cache (24h) — one API call per city+query across all users
  if (supabase) {
    try {
      const l2Result = await Promise.race([
        supabase.from('places_cache').select('data, updated_at').eq('city_slug', citySlug).eq('config_slug', configSlug).single(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      if (l2Result) {
        const { data: row } = l2Result;
        if (row) {
          const age = Date.now() - new Date(row.updated_at).getTime();
          if (age < CACHE_TTL_MS) {
            const results = row.data as Array<{ title: string; location?: string }>;
            setCachedSearch(memKey, results);
            AsyncStorage.setItem(asyncKey, JSON.stringify({ timestamp: Date.now(), data: results })).catch(() => {});
            return results;
          }
        }
      }
    } catch { /* supabase unavailable — fall through */ }
  }

  // L3: Google Places API
  const q = encodeURIComponent(`${query} in ${city}`);
  const typeParam = placeType ? `&type=${placeType}` : '';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}${typeParam}&key=${GOOGLE_PLACES_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    const results: Array<{ name: string; formatted_address?: string }> = json.results ?? [];
    const mapped = results.slice(0, 20).map((r) => ({
      title: r.name,
      location: r.formatted_address ? parseLocation(r.formatted_address) : undefined,
    }));
    setCachedSearch(memKey, mapped);
    // Write L1 + L2 without blocking return
    AsyncStorage.setItem(asyncKey, JSON.stringify({ timestamp: Date.now(), data: mapped })).catch(() => {});
    if (supabase) {
      Promise.resolve(supabase.from('places_cache').upsert(
        { city_slug: citySlug, config_slug: configSlug, data: mapped, updated_at: new Date().toISOString() },
        { onConflict: 'city_slug,config_slug' }
      )).catch(() => {});
    }
    return mapped;
  } catch {
    return [];
  }
}

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const CACHE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
// Bump when the shape/quality of generated list data changes (e.g. street addresses in v2).
// Existing local_lists rows without this version are treated as stale and re-generated.
const DATA_VERSION = 'v4';

interface PlaceConfig {
  slug: string;
  queryTerm: string;
  placeType?: string;
  title: (city: string) => string;
  icon: string;
  color: string;
  appCategory: string;
  description: (city: string) => string;
  imageQuery: (city: string) => string;
  staticImageUrl?: string;
  /** Controls the "Find an item" search experience — stored on the generated CommunityList. */
  findItemMode: 'google-places-local' | 'google-places-global' | 'api' | 'suggestions' | 'manual';
  /** If true, generate an empty-item list without calling Google Places. Users fill it from scratch. */
  emptyItems?: boolean;
}

const PLACE_CONFIGS: PlaceConfig[] = [
  {
    slug: 'restaurants',
    queryTerm: 'restaurants',
    title: (city) => `Best Restaurants near ${city}`,
    icon: 'restaurant-outline',
    color: '#FF7043',
    appCategory: 'Food',
    description: (city) => `The top-rated restaurants near ${city}, ranked by you.`,
    imageQuery: (city) => `${city} restaurant dining interior food atmosphere wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1727932204039-2127385a9cb0?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'pizza',
    queryTerm: 'pizza',
    title: (city) => `Best Pizza near ${city}`,
    icon: 'pizza-outline',
    color: '#E17055',
    appCategory: 'Food',
    description: (city) => `Which pizza spot reigns supreme near ${city}?`,
    imageQuery: () => 'pizza slice cheese wood fired oven Italian restaurant wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1566843971939-1fe9e277a0c0?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'wings',
    queryTerm: 'wings',
    title: (city) => `Best Wings near ${city}`,
    icon: 'flame-outline',
    color: '#FF9F43',
    appCategory: 'Food',
    description: (city) => `The best buffalo wings and chicken wing spots near ${city}.`,
    imageQuery: () => 'chicken wings buffalo sauce crispy restaurant food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1553625024-acdb028b1f9b?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'bars',
    queryTerm: 'bars',
    title: (city) => `Best Bars near ${city}`,
    icon: 'wine-outline',
    color: '#6C5CE7',
    appCategory: 'Food',
    description: (city) => `The top bars and nightlife spots near ${city}.`,
    imageQuery: () => 'bar cocktails drinks nightlife interior moody wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1763771757330-3212b518e31c?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'coffee',
    queryTerm: 'coffee shops',
    title: (city) => `Best Coffee Shops near ${city}`,
    icon: 'cafe-outline',
    color: '#4ECDC4',
    appCategory: 'Food',
    description: (city) => `The best cafes and coffee shops near ${city}.`,
    imageQuery: () => 'coffee espresso latte art cafe interior cozy wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1729018711788-4e61ec14d53d?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'brunch',
    queryTerm: 'brunch restaurants',
    title: (city) => `Best Brunch near ${city}`,
    icon: 'sunny-outline',
    color: '#FDCB6E',
    appCategory: 'Food',
    description: (city) => `Eggs benny or avocado toast? The top brunch spots near ${city}, ranked.`,
    imageQuery: () => 'brunch eggs benedict avocado toast restaurant food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1633763470545-a7efc3fbb773?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'burgers',
    queryTerm: 'burger restaurants',
    title: (city) => `Best Burgers near ${city}`,
    icon: 'fast-food-outline',
    color: '#E17055',
    appCategory: 'Food',
    description: (city) => `The best burgers near ${city} — smash, classic, and everything in between.`,
    imageQuery: () => 'smash burger patty beef restaurant food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1626256223708-291b849a54c2?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'sushi',
    queryTerm: 'sushi restaurants',
    title: (city) => `Best Sushi near ${city}`,
    icon: 'fish-outline',
    color: '#00B894',
    appCategory: 'Food',
    description: (city) => `Omakase to AYCE — the top sushi spots near ${city}.`,
    imageQuery: () => 'sushi omakase fresh fish japanese food plating wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1763647756796-af9230245bf8?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'steakhouses',
    queryTerm: 'steakhouses',
    title: (city) => `Best Steakhouses near ${city}`,
    icon: 'flame-outline',
    color: '#D63031',
    appCategory: 'Food',
    description: (city) => `Where to get the best cut near ${city}.`,
    imageQuery: () => 'steak ribeye filet mignon sizzling restaurant food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1619719015339-133a130520f6?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'breweries',
    queryTerm: 'breweries',
    title: (city) => `Best Breweries near ${city}`,
    icon: 'beer-outline',
    color: '#F9A825',
    appCategory: 'Drinks',
    description: (city) => `The craft beer scene near ${city}, ranked by locals.`,
    imageQuery: () => 'craft beer brewery tap room pints wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1769476908356-241149feff22?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'rooftop-bars',
    queryTerm: 'rooftop bars',
    title: (city) => `Best Rooftop Bars near ${city}`,
    icon: 'partly-sunny-outline',
    color: '#6C5CE7',
    appCategory: 'Food',
    description: (city) => `Best views and best drinks — the top rooftop bars near ${city}.`,
    imageQuery: (city) => `${city} rooftop bar skyline cocktails city view wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1568101671082-dbd18c6a9b31?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'ice-cream',
    queryTerm: 'ice cream and dessert shops',
    title: (city) => `Best Ice Cream & Desserts near ${city}`,
    icon: 'ice-cream-outline',
    color: '#FD79A8',
    appCategory: 'Food',
    description: (city) => `The sweetest spots near ${city}.`,
    imageQuery: () => 'ice cream dessert colorful scoop cone sweet wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1741026078998-490c4e36afd1?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'live-music',
    queryTerm: 'live music venues',
    title: (city) => `Best Live Music Venues near ${city}`,
    icon: 'musical-notes-outline',
    color: '#A29BFE',
    appCategory: 'Food',
    description: (city) => `From intimate clubs to concert halls — the best live music near ${city}.`,
    imageQuery: () => 'live music concert venue stage lights performers wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1619973226698-b77a5b5dd14b?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'sports-bars',
    queryTerm: 'sports bars',
    title: (city) => `Best Sports Bars near ${city}`,
    icon: 'tv-outline',
    color: '#00B894',
    appCategory: 'Food',
    description: (city) => `The best places to catch the game near ${city}.`,
    imageQuery: () => 'sports bar big screen tv fans game day wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1671368913134-c211bc02487f?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'hotels',
    queryTerm: 'hotels',
    placeType: 'lodging',
    title: (city) => `Best Hotels near ${city}`,
    icon: 'bed-outline',
    color: '#2980B9',
    appCategory: 'Travel',
    description: (city) => `The top-rated places to stay near ${city}, ranked by locals and visitors.`,
    imageQuery: (city) => `${city} hotel lobby luxury interior elegant wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1723465302725-ff46b3e165f9?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'parks',
    queryTerm: 'parks and outdoor spaces',
    title: (city) => `Best Parks & Outdoor Spaces near ${city}`,
    icon: 'leaf-outline',
    color: '#27AE60',
    appCategory: 'Travel',
    description: (city) => `The best green spaces, trails, and outdoor spots near ${city}.`,
    imageQuery: (city) => `${city} park nature green outdoor trail landscape wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1762538052428-1517ac5b53b8?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'places',
    queryTerm: 'top places to visit',
    title: (city) => `Best Places to Visit near ${city}`,
    icon: 'map-outline',
    color: '#0984E3',
    appCategory: 'Travel',
    description: (city) => `The landmarks, neighborhoods, and hidden gems that make ${city} worth the trip.`,
    imageQuery: (city) => `${city} landmark attraction cityscape tourism wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1606783090940-db193c2ef514?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'golf-courses',
    queryTerm: 'public golf courses',
    placeType: 'golf_course',
    title: (city) => `Best Public Golf Courses near ${city}`,
    icon: 'golf-outline',
    color: '#27AE60',
    appCategory: 'Sports',
    description: (city) => `The top-rated public golf courses near ${city}, ranked by players.`,
    imageQuery: (city) => `${city} golf course green fairway landscape wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'pickleball-courts',
    queryTerm: 'pickleball courts',
    title: (city) => `Best Pickleball Courts near ${city}`,
    icon: 'tennisball-outline',
    color: '#F39C12',
    appCategory: 'Sports',
    description: (city) => `The best places to play pickleball near ${city}.`,
    imageQuery: () => 'pickleball court outdoor sport players wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1669684899238-64c4abe4d3cc?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'museums',
    queryTerm: 'museums',
    placeType: 'museum',
    title: (city) => `Best Museums near ${city}`,
    icon: 'library-outline',
    color: '#8E44AD',
    appCategory: 'Arts',
    description: (city) => `The most visited and highly rated museums near ${city}.`,
    imageQuery: (city) => `${city} museum art gallery interior exhibit wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1764253340515-7a29ad70c22b?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'walking-paths',
    queryTerm: 'walking trails and paths',
    title: (city) => `Best Walking Paths near ${city}`,
    icon: 'walk-outline',
    color: '#16A085',
    appCategory: 'Nature',
    description: (city) => `The best trails, paths, and walkways near ${city}.`,
    imageQuery: (city) => `${city} walking trail path nature outdoor scenic wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1765465604915-59786f45f583?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'date-night',
    queryTerm: 'romantic date night restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Date Night Spots near ${city}`,
    icon: 'heart-outline',
    color: '#C0392B',
    appCategory: 'Food',
    description: (city) => `The most romantic and memorable dinner spots near ${city}, ranked by locals.`,
    imageQuery: () => 'romantic restaurant candles dim light intimate dinner couple wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1668637067785-69216bc51dd3?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'happy-hour',
    queryTerm: 'best happy hour bars',
    title: (city) => `Best Happy Hour near ${city}`,
    icon: 'wine-outline',
    color: '#F39C12',
    appCategory: 'Food',
    description: (city) => `The best deals on drinks and bites after work near ${city}.`,
    imageQuery: () => 'happy hour cocktails bar drinks specials crowd wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1770670644204-b6d1e5be9ffd?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'late-night',
    queryTerm: 'late night food restaurants',
    title: (city) => `Best Late Night Eats near ${city}`,
    icon: 'moon-outline',
    color: '#6C3483',
    appCategory: 'Food',
    description: (city) => `Still hungry after midnight? The best late-night spots near ${city}.`,
    imageQuery: () => 'late night diner food neon lights city street night wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1652152489449-21ca83c76b41?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'dog-friendly',
    queryTerm: 'dog friendly parks and patios',
    title: (city) => `Best Dog-Friendly Spots near ${city}`,
    icon: 'paw-outline',
    color: '#27AE60',
    appCategory: 'Nature',
    description: (city) => `Parks, patios, and places where your dog is always welcome near ${city}.`,
    imageQuery: () => 'dog park outdoor patio pet friendly nature green wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1632772341241-51e975ae8f65?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'barbers',
    queryTerm: 'barber shops',
    title: (city) => `Top Barbers near ${city}`,
    icon: 'cut-outline',
    color: '#34495E',
    appCategory: 'Health',
    description: (city) => `The highest-rated barber shops near ${city}, ranked by locals.`,
    imageQuery: () => 'barber shop haircut vintage pole chair interior wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1759408174071-f2971472dc73?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'salons',
    queryTerm: 'hair and beauty salons',
    placeType: 'beauty_salon',
    title: (city) => `Top Hair & Beauty Salons near ${city}`,
    icon: 'sparkles-outline',
    color: '#8E44AD',
    appCategory: 'Health',
    description: (city) => `The highest-rated hair and beauty salons near ${city}, ranked by locals.`,
    imageQuery: () => 'hair salon beauty styling interior modern elegant wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1771865600306-d4ef4c06ae16?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'gyms',
    queryTerm: 'gyms and fitness studios',
    placeType: 'gym',
    title: (city) => `Best Gyms & Fitness Studios near ${city}`,
    icon: 'barbell-outline',
    color: '#2980B9',
    appCategory: 'Health',
    description: (city) => `From big-box gyms to boutique studios — the top fitness spots near ${city}.`,
    imageQuery: () => 'gym fitness studio workout equipment modern interior wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1761971975769-97e598bf526b?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'mechanics',
    queryTerm: 'auto mechanics and car repair',
    placeType: 'car_repair',
    title: (city) => `Top-Rated Auto Mechanics near ${city}`,
    icon: 'construct-outline',
    color: '#7F8C8D',
    appCategory: 'Miscellaneous',
    description: (city) => `The most trusted mechanics and auto repair shops near ${city}.`,
    imageQuery: () => 'auto mechanic car repair shop garage tools wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1702146713882-2579afb0bfba?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'farmers-markets',
    queryTerm: 'farmers markets',
    title: (city) => `Best Farmers Markets near ${city}`,
    icon: 'basket-outline',
    color: '#2ECC71',
    appCategory: 'Food',
    description: (city) => `Fresh produce, local vendors, and weekend vibes — the best farmers markets near ${city}.`,
    imageQuery: () => 'farmers market fresh produce vegetables outdoor stalls vendors wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1761839257664-ecba169506c1?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'grocery',
    queryTerm: 'specialty and high-end grocery stores',
    placeType: 'supermarket',
    title: (city) => `Best Grocery Stores near ${city}`,
    icon: 'cart-outline',
    color: '#E67E22',
    appCategory: 'Food',
    description: (city) => `Whole Foods or local gem? The top-rated grocery stores near ${city}, ranked.`,
    imageQuery: () => 'grocery store produce fresh market interior specialty wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1725208961001-d6335cd7bfdc?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },

  // ── Dining deep-dives ─────────────────────────────────────────────────────
  {
    slug: 'fine-dining',
    queryTerm: 'fine dining restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Fine Dining near ${city}`,
    icon: 'star-outline',
    color: '#6C3483',
    appCategory: 'Food',
    description: (city) => `The top upscale and fine dining restaurants near ${city}, ranked by locals.`,
    imageQuery: () => 'fine dining elegant restaurant upscale interior candlelight wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'bbq',
    queryTerm: 'BBQ restaurants',
    placeType: 'restaurant',
    title: (city) => `Best BBQ near ${city}`,
    icon: 'flame-outline',
    color: '#C0392B',
    appCategory: 'Food',
    description: (city) => `Smoked, sauced, and slow-cooked — the best BBQ near ${city}.`,
    imageQuery: () => 'BBQ barbecue smoked ribs brisket restaurant food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'outdoor-dining',
    queryTerm: 'outdoor patio dining restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Outdoor Dining near ${city}`,
    icon: 'sunny-outline',
    color: '#27AE60',
    appCategory: 'Food',
    description: (city) => `The best patios, terraces, and al fresco dining near ${city}.`,
    imageQuery: () => 'outdoor patio restaurant al fresco dining terrace string lights wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1772521340908-9f9a0bc775dc?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'breakfast',
    queryTerm: 'breakfast restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Breakfast near ${city}`,
    icon: 'cafe-outline',
    color: '#F39C12',
    appCategory: 'Food',
    description: (city) => `Early bird or lazy Sunday — the best breakfast spots near ${city}.`,
    imageQuery: () => 'breakfast pancakes eggs benedict morning restaurant food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'seafood',
    queryTerm: 'seafood restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Seafood near ${city}`,
    icon: 'fish-outline',
    color: '#2980B9',
    appCategory: 'Food',
    description: (city) => `Fresh catches and ocean flavors — the top seafood restaurants near ${city}.`,
    imageQuery: () => 'seafood lobster shrimp oysters fresh restaurant food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1768725845685-b88ca2aa192a?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'italian',
    queryTerm: 'Italian restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Italian Restaurants near ${city}`,
    icon: 'restaurant-outline',
    color: '#E74C3C',
    appCategory: 'Food',
    description: (city) => `Pasta, risotto, and more — the top Italian restaurants near ${city}.`,
    imageQuery: () => 'Italian restaurant pasta risotto interior rustic cozy wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1555396273-bf91798d792e?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'mexican',
    queryTerm: 'Mexican restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Mexican Food near ${city}`,
    icon: 'flame-outline',
    color: '#E67E22',
    appCategory: 'Food',
    description: (city) => `Tacos, enchiladas, and margaritas — the best Mexican spots near ${city}.`,
    imageQuery: () => 'Mexican restaurant tacos colorful food margaritas wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'thai',
    queryTerm: 'Thai restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Thai Food near ${city}`,
    icon: 'restaurant-outline',
    color: '#F39C12',
    appCategory: 'Food',
    description: (city) => `Pad thai, curries, and more — the top Thai restaurants near ${city}.`,
    imageQuery: () => 'Thai food restaurant pad thai curry colorful dishes wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'chinese',
    queryTerm: 'Chinese restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Chinese Restaurants near ${city}`,
    icon: 'restaurant-outline',
    color: '#C0392B',
    appCategory: 'Food',
    description: (city) => `Dim sum to Peking duck — the top Chinese restaurants near ${city}.`,
    imageQuery: () => 'Chinese restaurant dim sum dumplings noodles food wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'indian',
    queryTerm: 'Indian restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Indian Food near ${city}`,
    icon: 'restaurant-outline',
    color: '#E67E22',
    appCategory: 'Food',
    description: (city) => `Curries, naan, and tandoor — the best Indian restaurants near ${city}.`,
    imageQuery: () => 'Indian food restaurant curry naan colorful spices wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'sandwiches',
    queryTerm: 'sandwich shops and delis',
    title: (city) => `Best Sandwich Shops & Delis near ${city}`,
    icon: 'fast-food-outline',
    color: '#E17055',
    appCategory: 'Food',
    description: (city) => `From hoagies to reubens — the best sandwich shops and delis near ${city}.`,
    imageQuery: () => 'sandwich deli shop hoagie sub food counter wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'vegan',
    queryTerm: 'vegan restaurants',
    placeType: 'restaurant',
    title: (city) => `Best Vegan Restaurants near ${city}`,
    icon: 'leaf-outline',
    color: '#2ECC71',
    appCategory: 'Food',
    description: (city) => `Plant-based dining done right — the top vegan restaurants near ${city}.`,
    imageQuery: () => 'vegan restaurant plant based food healthy bowls colorful wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'food-trucks',
    queryTerm: 'food trucks',
    title: (city) => `Best Food Trucks near ${city}`,
    icon: 'fast-food-outline',
    color: '#E67E22',
    appCategory: 'Food',
    description: (city) => `Street food at its finest — the best food trucks near ${city}.`,
    imageQuery: () => 'food truck street food colorful vendor outdoor wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },

  // ── Drinks ────────────────────────────────────────────────────────────────
  {
    slug: 'wine-bars',
    queryTerm: 'wine bars',
    placeType: 'bar',
    title: (city) => `Best Wine Bars near ${city}`,
    icon: 'wine-outline',
    color: '#8E44AD',
    appCategory: 'Drinks',
    description: (city) => `Natural, old world, or new world — the top wine bars near ${city}.`,
    imageQuery: () => 'wine bar glasses bottles elegant interior cozy wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'cocktail-bars',
    queryTerm: 'cocktail bars',
    placeType: 'bar',
    title: (city) => `Best Cocktail Bars near ${city}`,
    icon: 'wine-outline',
    color: '#3498DB',
    appCategory: 'Drinks',
    description: (city) => `Craft cocktails and creative drinks — the best cocktail bars near ${city}.`,
    imageQuery: () => 'cocktail bar craft drinks mixologist elegant moody wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },

  // ── Entertainment & Wellness ──────────────────────────────────────────────
  {
    slug: 'comedy-clubs',
    queryTerm: 'comedy clubs',
    title: (city) => `Best Comedy Clubs near ${city}`,
    icon: 'happy-outline',
    color: '#E74C3C',
    appCategory: 'Arts',
    description: (city) => `Stand-up, improv, and open mics — the best comedy venues near ${city}.`,
    imageQuery: () => 'comedy club stand up microphone stage audience laughing wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'spas',
    queryTerm: 'spas and wellness centers',
    placeType: 'spa',
    title: (city) => `Best Spas & Wellness near ${city}`,
    icon: 'water-outline',
    color: '#16A085',
    appCategory: 'Health',
    description: (city) => `Massages, facials, and full relaxation — the top spas near ${city}.`,
    imageQuery: () => 'spa wellness massage relaxation serene interior luxury wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'bowling',
    queryTerm: 'bowling alleys',
    placeType: 'bowling_alley',
    title: (city) => `Best Bowling Alleys near ${city}`,
    icon: 'tennisball-outline',
    color: '#2980B9',
    appCategory: 'Sports',
    description: (city) => `Classic lanes to boutique bowling bars — the best spots to bowl near ${city}.`,
    imageQuery: () => 'bowling alley lanes pins ball neon interior wide',
    staticImageUrl: 'https://images.unsplash.com/photo-1646529709994-8ff25fa4dfa4?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
  {
    slug: 'art-galleries',
    queryTerm: 'art galleries',
    placeType: 'art_gallery',
    title: (city) => `Best Art Galleries near ${city}`,
    icon: 'color-palette-outline',
    color: '#9B59B6',
    appCategory: 'Arts',
    description: (city) => `Contemporary, classic, and everything in between — the top art galleries near ${city}.`,
    imageQuery: (city) => `${city} art gallery contemporary exhibit interior wide`,
    staticImageUrl: 'https://images.unsplash.com/photo-1536924940846-cb428b912da5?w=600&fit=crop&crop=center&auto=format&q=80',
    findItemMode: 'google-places-local',
  },
];

/**
 * Returns the queryTerm and placeType for a local community list ID.
 * List IDs follow the format `local-{configSlug}-{citySlug}`.
 * Used by SearchScreen to drive the correct "Find an item" Places query.
 */
export function getConfigForListId(
  listId: string
): { queryTerm: string; placeType?: string } | undefined {
  for (const config of PLACE_CONFIGS) {
    if (listId.startsWith(`local-${config.slug}-`)) {
      return { queryTerm: config.queryTerm, placeType: config.placeType };
    }
  }
  return undefined;
}

function slugify(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}


async function fetchPlacesForConfig(
  config: PlaceConfig,
  city: string,
  citySlug: string
): Promise<CommunityList | null> {
  const localCacheKey = `@topten_places_v17_${citySlug}_${config.slug}`;

  // Always stamps the current config's staticImageUrl onto any cached list so
  // it can never be stale regardless of which cache layer served it.
  const applyStaticImage = (list: CommunityList): CommunityList => {
    list.staticImageUrl = config.staticImageUrl;
    return list;
  };

  // L1: Device AsyncStorage — fastest, no network
  try {
    const cached = await AsyncStorage.getItem(localCacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) return applyStaticImage(backfillListFields(data as CommunityList));
    }
  } catch { /* ignore */ }

  // L2: Supabase shared cache — versioned so old entries don't block fresh generation
  const cacheConfigSlug = `${config.slug}-${DATA_VERSION}`;
  if (supabase) {
    try {
      const l2Result = await Promise.race([
        supabase.from('places_cache').select('data, updated_at').eq('city_slug', citySlug).eq('config_slug', cacheConfigSlug).single(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      if (l2Result) {
        const { data: row } = l2Result;
        if (row) {
          const age = Date.now() - new Date(row.updated_at).getTime();
          if (age < CACHE_TTL_MS) {
            const list = applyStaticImage(backfillListFields(row.data as CommunityList));
            // Backfill L1 so next open is instant
            AsyncStorage.setItem(localCacheKey, JSON.stringify({ timestamp: Date.now(), data: list })).catch(() => {});
            return list;
          }
        }
      }
    } catch { /* supabase unavailable — fall through to API */ }
  }

  // L3: Google Places API (skipped for emptyItems configs)
  let items: CommunityItem[] = [];
  if (!config.emptyItems) {
    const query = encodeURIComponent(`best ${config.queryTerm} in ${city}`);
    const typeParam = config.placeType ? `&type=${config.placeType}` : '';
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}${typeParam}&key=${GOOGLE_PLACES_KEY}`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      return null; // network error — don't cache, retry next load
    }
    if (!response.ok) return null;

    const json = await response.json();
    // Hard API errors (bad key, quota) → don't cache, retry next load
    if (json.status === 'REQUEST_DENIED' || json.status === 'OVER_QUERY_LIMIT' || json.status === 'INVALID_REQUEST') {
      console.warn('[Places] API error', { config: config.slug, city, status: json.status });
      return null;
    }
    // ZERO_RESULTS is a legitimate "no venues here" — fall through and cache an empty list
    const results: Array<{ name: string; formatted_address?: string }> = json.results ?? [];

    items = results.slice(0, 10).map((result, rank) => ({
      id: `${config.slug}-${citySlug}-${rank}`,
      title: result.name,
      location: result.formatted_address ? parseLocation(result.formatted_address) : undefined,
      seedScore: Math.max(1, 28 - rank * 3),
    }));
  }

  const list: CommunityList = {
    id: `local-${config.slug}-${citySlug}`,
    title: config.title(city),
    category: config.appCategory,
    color: config.color,
    icon: config.icon,
    description: config.description(city),
    imageQuery: config.imageQuery(city),
    staticImageUrl: config.staticImageUrl,
    participantCount: 0,
    items,
    region: city,
    findItemMode: config.findItemMode,
    dataVersion: DATA_VERSION,
  };

  // Write to L1 (device), L2 (places_cache), and local_lists (permanent) — don't block return.
  // local_lists means every subsequent user for this city is served from Supabase for free.
  // places_cache (versioned) is the fast path for subsequent device-cache misses.
  AsyncStorage.setItem(localCacheKey, JSON.stringify({ timestamp: Date.now(), data: list })).catch(() => {});
  if (supabase) {
    const sortIndex = PLACE_CONFIGS.indexOf(config);
    Promise.resolve(supabase.from('local_lists').upsert(
      {
        id: list.id,
        city_slug: citySlug,
        city_name: city,
        neighborhood: null,
        config_slug: config.slug,
        data: list,
        generated_at: new Date().toISOString(),
        sort_index: sortIndex,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )).catch(() => {});
    Promise.resolve(supabase.from('places_cache').upsert(
      { city_slug: citySlug, config_slug: cacheConfigSlug, data: list, updated_at: new Date().toISOString() },
      { onConflict: 'city_slug,config_slug' }
    )).catch(() => {});
  }

  return list;
}

/**
 * Fetches pre-generated local lists from Supabase local_lists table.
 * Returns all city-wide lists (neighborhood = null) for the given city.
 * Falls back to empty array if Supabase unavailable.
 */
// Known city name aliases: ipinfo.io and Google Places autocomplete sometimes
// return different forms for the same city (e.g. "New York City" vs "New York").
// We query all known slugs at once so either source hits the right Supabase rows.
const CITY_SLUG_ALIASES: Record<string, string[]> = {
  'new-york':          ['new-york-city'],
  'new-york-city':     ['new-york'],
  'washington':        ['washington-dc'],
  'washington-dc':     ['washington'],
};

// Matches old-style "City, ST" location strings (e.g. "Philadelphia, PA").
// These were generated before we switched to street-level addresses and are useless
// on local lists where the city is already implied by the list title.
const CITY_STATE_RE = /^[^,]+,\s[A-Z]{2}$/;

/**
 * Backfills fields that may be missing from lists stored in Supabase before
 * a schema addition. Also strips legacy city-level location strings so existing
 * cached data cleans up on-read without a full re-seed.
 */
function backfillListFields(list: CommunityList): CommunityList {
  // Strip "City, ST" location strings — street addresses are kept, missing is fine.
  const items = list.items.map(item =>
    item.location && CITY_STATE_RE.test(item.location)
      ? { ...item, location: undefined }
      : item
  );
  const base = { ...list, items };
  if (base.findItemMode) return base;
  for (const config of PLACE_CONFIGS) {
    if (base.id.startsWith(`local-${config.slug}-`)) {
      return { ...base, findItemMode: config.findItemMode };
    }
  }
  return base;
}

export async function fetchLocalListsFromSupabase(city: string): Promise<CommunityList[]> {
  if (!supabase || !city) return [];
  const citySlug = slugify(city);
  const slugsToTry = [citySlug, ...(CITY_SLUG_ALIASES[citySlug] ?? [])];
  try {
    const queryResult = await Promise.race([
      supabase.from('local_lists').select('data').in('city_slug', slugsToTry)
        .is('neighborhood', null)
        .order('sort_index')
        .limit(100),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!queryResult) return [];
    const { data, error } = queryResult;
    if (error || !data) return [];
    return data.map((row: any) => {
      const list = backfillListFields(row.data as CommunityList);
      // Always stamp current config's staticImageUrl so cached rows never serve a stale image
      const config = PLACE_CONFIGS.find(c => list.id.startsWith(`local-${c.slug}-`));
      if (config) list.staticImageUrl = config.staticImageUrl;
      return list;
    });
  } catch {
    return [];
  }
}

export async function fetchLocalPlacesLists(city: string): Promise<CommunityList[]> {
  if (!city) return [];
  const citySlug = slugify(city);

  // L0: Check all per-config AsyncStorage entries in parallel before any network call.
  // On second+ session this is instant (<20ms) and skips Supabase entirely.
  const l0Results = await Promise.all(
    PLACE_CONFIGS.map(async (config) => {
      const key = `@topten_places_v17_${citySlug}_${config.slug}`;
      try {
        const cached = await AsyncStorage.getItem(key);
        if (!cached) return null;
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp >= CACHE_TTL_MS) return null;
        const list = backfillListFields(data as CommunityList);
        if (config.staticImageUrl) list.staticImageUrl = config.staticImageUrl;
        return list;
      } catch { return null; }
    })
  );
  const l0Lists = l0Results.filter((l): l is CommunityList => l !== null);
  if (l0Lists.length === PLACE_CONFIGS.length) {
    return l0Lists.sort((a, b) => {
      const ai = PLACE_CONFIGS.findIndex((c) => a.id.startsWith(`local-${c.slug}-`));
      const bi = PLACE_CONFIGS.findIndex((c) => b.id.startsWith(`local-${c.slug}-`));
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }

  const serverLists = await fetchLocalListsFromSupabase(city);

  if (!GOOGLE_PLACES_KEY) return serverLists;

  const missingConfigs = PLACE_CONFIGS.filter(
    (config) => !serverLists.some(
      (l) => l.id.startsWith(`local-${config.slug}-`) && l.dataVersion === DATA_VERSION
    )
  );

  if (missingConfigs.length === 0) return serverLists;

  // Separate truly absent configs from stale ones (present but old dataVersion).
  const absentConfigs = missingConfigs.filter(
    (config) => !serverLists.some((l) => l.id.startsWith(`local-${config.slug}-`))
  );
  const staleConfigs = missingConfigs.filter(
    (config) => serverLists.some((l) => l.id.startsWith(`local-${config.slug}-`))
  );

  // Stale configs: refresh silently in the background — never block the UI on them.
  if (staleConfigs.length > 0) {
    staleConfigs.forEach((config, i) => {
      setTimeout(() => fetchPlacesForConfig(config, city, citySlug).catch(() => {}), i * 80);
    });
  }

  // If nothing is truly absent, return existing Supabase data right away.
  if (absentConfigs.length === 0) return serverLists;

  // New city: fetch absent configs (first time this city is loaded)
  const results = await Promise.allSettled(
    absentConfigs.map((config, i) =>
      new Promise<CommunityList | null>(resolve =>
        setTimeout(() => fetchPlacesForConfig(config, city, citySlug).then(resolve).catch(() => resolve(null)), i * 80)
      )
    )
  );

  const newLists = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((l): l is CommunityList => l !== null);

  if (newLists.length === 0) return serverLists;

  // Merge: new lists replace stale server lists with the same ID; genuinely new ones are appended.
  const combined = [...serverLists];
  for (const newList of newLists) {
    const existingIdx = combined.findIndex((l) => l.id === newList.id);
    if (existingIdx >= 0) {
      combined[existingIdx] = newList;
    } else {
      combined.push(newList);
    }
  }
  combined.sort((a, b) => {
    const aIdx = PLACE_CONFIGS.findIndex((c) => a.id.startsWith(`local-${c.slug}-`));
    const bIdx = PLACE_CONFIGS.findIndex((c) => b.id.startsWith(`local-${c.slug}-`));
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  return combined;
}
