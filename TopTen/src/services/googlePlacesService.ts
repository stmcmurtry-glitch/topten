import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommunityList, CommunityItem } from '../data/communityLists';

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
  if (category !== 'Food') return false;
  if (PRODUCT_KEYWORDS.some((kw) => t.includes(kw))) return false;
  if (VENUE_KEYWORDS.some((kw) => t.includes(kw))) return true;
  return false;
}

/** @deprecated Use isVenueList(listTitle, category) instead */
export const isPlacesCategory = (category: string): boolean =>
  ['Food', 'Drinks'].includes(category);

export function derivePlacesType(listTitle: string, category: string): string | undefined {
  if (category === 'Travel') return undefined; // no filter — return all place types
  const t = (listTitle ?? '').toLowerCase();
  if (t.includes('coffee') || t.includes('cafe')) return 'cafe';
  if (t.includes('bar') || t.includes('pub') || t.includes('nightlife')) return 'bar';
  if (category === 'Drinks') return 'bar';
  return 'restaurant';
}

export function derivePlacesQuery(listTitle: string, category: string): string {
  if (category === 'Travel') {
    const t = (listTitle ?? '').toLowerCase();
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
  placeType?: string;
  title: (city: string) => string;
  icon: string;
  color: string;
  appCategory: string;
  description: (city: string) => string;
  imageQuery: (city: string) => string;
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
    imageQuery: (city) => `${city} restaurant dining interior food atmosphere wide`,
  },
  {
    slug: 'pizza',
    queryTerm: 'pizza',
    title: (city) => `Best Pizza in ${city}`,
    icon: 'pizza-outline',
    color: '#E17055',
    appCategory: 'Food',
    description: (city) => `Which pizza spot reigns supreme in ${city}?`,
    imageQuery: () => 'pizza slice cheese wood fired oven Italian restaurant wide',
  },
  {
    slug: 'wings',
    queryTerm: 'wings',
    title: (city) => `Best Wings in ${city}`,
    icon: 'flame-outline',
    color: '#FF9F43',
    appCategory: 'Food',
    description: (city) => `The best buffalo wings and chicken wing spots in ${city}.`,
    imageQuery: () => 'chicken wings buffalo sauce crispy restaurant food wide',
  },
  {
    slug: 'bars',
    queryTerm: 'bars',
    title: (city) => `Best Bars in ${city}`,
    icon: 'wine-outline',
    color: '#6C5CE7',
    appCategory: 'Food',
    description: (city) => `The top bars and nightlife spots in ${city}.`,
    imageQuery: () => 'bar cocktails drinks nightlife interior moody wide',
  },
  {
    slug: 'coffee',
    queryTerm: 'coffee shops',
    title: (city) => `Best Coffee Shops in ${city}`,
    icon: 'cafe-outline',
    color: '#4ECDC4',
    appCategory: 'Food',
    description: (city) => `The best cafes and coffee shops in ${city}.`,
    imageQuery: () => 'coffee espresso latte art cafe interior cozy wide',
  },
  {
    slug: 'brunch',
    queryTerm: 'brunch restaurants',
    title: (city) => `Best Brunch in ${city}`,
    icon: 'sunny-outline',
    color: '#FDCB6E',
    appCategory: 'Food',
    description: (city) => `Eggs benny or avocado toast? The top brunch spots in ${city}, ranked.`,
    imageQuery: () => 'brunch eggs benedict avocado toast restaurant food wide',
  },
  {
    slug: 'burgers',
    queryTerm: 'burger restaurants',
    title: (city) => `Best Burgers in ${city}`,
    icon: 'fast-food-outline',
    color: '#E17055',
    appCategory: 'Food',
    description: (city) => `The best burgers in ${city} — smash, classic, and everything in between.`,
    imageQuery: () => 'smash burger patty beef restaurant food wide',
  },
  {
    slug: 'sushi',
    queryTerm: 'sushi restaurants',
    title: (city) => `Best Sushi in ${city}`,
    icon: 'fish-outline',
    color: '#00B894',
    appCategory: 'Food',
    description: (city) => `Omakase to AYCE — the top sushi spots in ${city}.`,
    imageQuery: () => 'sushi omakase fresh fish japanese food plating wide',
  },
  {
    slug: 'steakhouses',
    queryTerm: 'steakhouses',
    title: (city) => `Best Steakhouses in ${city}`,
    icon: 'flame-outline',
    color: '#D63031',
    appCategory: 'Food',
    description: (city) => `Where to get the best cut in ${city}.`,
    imageQuery: () => 'steak ribeye filet mignon sizzling restaurant food wide',
  },
  {
    slug: 'breweries',
    queryTerm: 'breweries',
    title: (city) => `Best Breweries in ${city}`,
    icon: 'beer-outline',
    color: '#F9A825',
    appCategory: 'Food',
    description: (city) => `The craft beer scene in ${city}, ranked by locals.`,
    imageQuery: () => 'craft beer brewery tap room pints wide',
  },
  {
    slug: 'rooftop-bars',
    queryTerm: 'rooftop bars',
    title: (city) => `Best Rooftop Bars in ${city}`,
    icon: 'partly-sunny-outline',
    color: '#6C5CE7',
    appCategory: 'Food',
    description: (city) => `Best views and best drinks — the top rooftop bars in ${city}.`,
    imageQuery: (city) => `${city} rooftop bar skyline cocktails city view wide`,
  },
  {
    slug: 'ice-cream',
    queryTerm: 'ice cream and dessert shops',
    title: (city) => `Best Ice Cream & Desserts in ${city}`,
    icon: 'ice-cream-outline',
    color: '#FD79A8',
    appCategory: 'Food',
    description: (city) => `The sweetest spots in ${city}.`,
    imageQuery: () => 'ice cream dessert colorful scoop cone sweet wide',
  },
  {
    slug: 'live-music',
    queryTerm: 'live music venues',
    title: (city) => `Best Live Music Venues in ${city}`,
    icon: 'musical-notes-outline',
    color: '#A29BFE',
    appCategory: 'Food',
    description: (city) => `From intimate clubs to concert halls — the best live music in ${city}.`,
    imageQuery: () => 'live music concert venue stage lights performers wide',
  },
  {
    slug: 'sports-bars',
    queryTerm: 'sports bars',
    title: (city) => `Best Sports Bars in ${city}`,
    icon: 'tv-outline',
    color: '#00B894',
    appCategory: 'Food',
    description: (city) => `The best places to catch the game in ${city}.`,
    imageQuery: () => 'sports bar big screen tv fans game day wide',
  },
  {
    slug: 'parks',
    queryTerm: 'parks and outdoor spaces',
    title: (city) => `Best Parks & Outdoor Spaces in ${city}`,
    icon: 'leaf-outline',
    color: '#27AE60',
    appCategory: 'Travel',
    description: (city) => `The best green spaces, trails, and outdoor spots in ${city}.`,
    imageQuery: (city) => `${city} park nature green outdoor trail landscape wide`,
  },
  {
    slug: 'places',
    queryTerm: 'top places to visit',
    title: (city) => `Best Places to Visit in ${city}`,
    icon: 'map-outline',
    color: '#0984E3',
    appCategory: 'Travel',
    description: (city) => `The landmarks, neighborhoods, and hidden gems that make ${city} worth the trip.`,
    imageQuery: (city) => `${city} landmark attraction cityscape tourism wide`,
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
  const cacheKey = `@topten_places_v4_${citySlug}_${config.slug}`;

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
  const typeParam = config.placeType ? `&type=${config.placeType}` : '';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}${typeParam}&key=${GOOGLE_PLACES_KEY}`;

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
    imageQuery: config.imageQuery(city),
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
