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
  if (t.includes('coffee') || t.includes('cafe')) return 'cafe';
  if (t.includes('bar') || t.includes('pub') || t.includes('nightlife')) return 'bar';
  if (category === 'Drinks') return 'bar';
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
  if (t.includes('burger')) return 'burger restaurants';
  if (t.includes('sushi')) return 'sushi restaurants';
  if (t.includes('steak')) return 'steakhouses';
  if (t.includes('brewery') || t.includes('breweries')) return 'breweries';
  if (t.includes('rooftop')) return 'rooftop bars';
  if (t.includes('ice cream') || t.includes('dessert')) return 'ice cream and dessert shops';
  if (t.includes('live music') || t.includes('music venue')) return 'live music venues';
  if (t.includes('sports bar')) return 'sports bars';
  if (t.includes('coffee') || t.includes('cafe')) return 'coffee shops';
  if (t.includes('bar') || t.includes('pub') || t.includes('nightlife')) return 'bars';
  if (t.includes('taco') || t.includes('mexican')) return 'mexican restaurants';
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

/** Parses "900 E 11th St, Austin, TX 78702, USA" → "Austin, TX" */
function parseLocation(formattedAddress: string): string {
  const parts = formattedAddress.split(', ');
  if (parts.length >= 3) {
    const city = parts[parts.length - 3];
    const stateZip = parts[parts.length - 2];
    const state = stateZip.split(' ')[0];
    if (city && state && state.length <= 3) return `${city}, ${state}`;
  }
  return '';
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
  const cacheKey = `global:${query.trim().toLowerCase()}:${placeType ?? ''}`;
  const cached = getCachedSearch(cacheKey);
  if (cached) return cached;

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
    setCachedSearch(cacheKey, mapped);
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
  const cacheKey = `local:${city.toLowerCase()}:${query.trim().toLowerCase()}:${placeType ?? ''}`;
  const cached = getCachedSearch(cacheKey);
  if (cached) return cached;

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
    setCachedSearch(cacheKey, mapped);
    return mapped;
  } catch {
    return [];
  }
}

const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  },
];

function slugify(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Stable pseudo-random seed count (8–28) derived from slug — same value every time. */
function seedParticipantCount(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  return 8 + (Math.abs(h) % 21); // 8..28
}

async function fetchPlacesForConfig(
  config: PlaceConfig,
  city: string,
  citySlug: string
): Promise<CommunityList | null> {
  const localCacheKey = `@topten_places_v11_${citySlug}_${config.slug}`;

  // L1: Device AsyncStorage — fastest, no network
  try {
    const cached = await AsyncStorage.getItem(localCacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL_MS) return data as CommunityList;
    }
  } catch { /* ignore */ }

  // L2: Supabase shared cache — one fetch per city across all users
  if (supabase) {
    try {
      const { data: row } = await supabase
        .from('places_cache')
        .select('data, updated_at')
        .eq('city_slug', citySlug)
        .eq('config_slug', config.slug)
        .single();
      if (row) {
        const age = Date.now() - new Date(row.updated_at).getTime();
        if (age < CACHE_TTL_MS) {
          const list = row.data as CommunityList;
          // Backfill L1 so next open is instant
          AsyncStorage.setItem(localCacheKey, JSON.stringify({ timestamp: Date.now(), data: list })).catch(() => {});
          return list;
        }
      }
    } catch { /* supabase unavailable — fall through to API */ }
  }

  // L3: Google Places API
  const query = encodeURIComponent(`best ${config.queryTerm} in ${city}`);
  const typeParam = config.placeType ? `&type=${config.placeType}` : '';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}${typeParam}&key=${GOOGLE_PLACES_KEY}`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const json = await response.json();
  const results: Array<{ name: string; formatted_address?: string }> = json.results ?? [];
  if (results.length === 0) return null;

  const items: CommunityItem[] = results.slice(0, 10).map((result, rank) => ({
    id: `${config.slug}-${citySlug}-${rank}`,
    title: result.name,
    location: result.formatted_address ? parseLocation(result.formatted_address) : undefined,
    seedScore: 100 - rank * 5,
  }));

  const list: CommunityList = {
    id: `local-${config.slug}-${citySlug}`,
    title: config.title(city),
    category: config.appCategory,
    color: config.color,
    icon: config.icon,
    description: config.description(city),
    imageQuery: config.imageQuery(city),
    staticImageUrl: config.staticImageUrl,
    participantCount: seedParticipantCount(`${config.slug}-${citySlug}`),
    items,
    region: city,
  };

  // Write to L1 and L2 in parallel, don't block return
  AsyncStorage.setItem(localCacheKey, JSON.stringify({ timestamp: Date.now(), data: list })).catch(() => {});
  if (supabase) {
    supabase.from('places_cache').upsert(
      { city_slug: citySlug, config_slug: config.slug, data: list, updated_at: new Date().toISOString() },
      { onConflict: 'city_slug,config_slug' }
    ).catch(() => {});
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
