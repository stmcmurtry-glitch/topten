/**
 * Generate server-side local lists for all (or selected) US cities and upsert to Supabase.
 *
 * Usage:
 *   npx tsx scripts/generateLocalLists.ts                         # all cities
 *   npx tsx scripts/generateLocalLists.ts --cities=pittsburgh,chicago
 *   npx tsx scripts/generateLocalLists.ts --stale-days=30         # skip recently generated
 *   npx tsx scripts/generateLocalLists.ts --dry-run               # log without writing
 *
 * Required env vars (NOT EXPO_PUBLIC_ — server-side only):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_PLACES_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { TOP_500_CITIES } from '../src/data/topCities';

// ── Env ───────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_PLACES_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLACES_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const citiesArg = args.find((a) => a.startsWith('--cities='))?.replace('--cities=', '');
const staleDaysArg = args.find((a) => a.startsWith('--stale-days='))?.replace('--stale-days=', '');
const staleDays = staleDaysArg ? parseInt(staleDaysArg, 10) : null;

// ── Types (mirrors CommunityList in src/data/communityLists.ts) ───────────────
interface CommunityItem {
  id: string;
  title: string;
  seedScore: number;
  location?: string;
}

interface CommunityList {
  id: string;
  title: string;
  category: string;
  color: string;
  icon: string;
  description: string;
  participantCount: number;
  items: CommunityItem[];
  imageQuery: string;
  staticImageUrl?: string;
  region?: string;
  findItemMode: 'google-places-local' | 'google-places-global' | 'api' | 'suggestions' | 'manual';
}

// ── Place configs (mirrors PLACE_CONFIGS in googlePlacesService.ts) ───────────
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
  emptyItems?: boolean;
  findItemMode: 'google-places-local' | 'google-places-global' | 'api' | 'suggestions' | 'manual';
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
    title: (city) => `Best Public Golf Courses near ${city}`,
    icon: 'golf-outline',
    color: '#27AE60',
    appCategory: 'Sports',
    description: (city) => `The top-rated public golf courses near ${city}, ranked by players.`,
    imageQuery: (city) => `${city} golf course green fairway landscape wide`,
    emptyItems: true,
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
    findItemMode: 'google-places-local',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function seedParticipantCount(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (Math.imul(31, h) + slug.charCodeAt(i)) | 0;
  return 2 + (Math.abs(h) % 9); // 2..10
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Google Places fetch ───────────────────────────────────────────────────────
async function fetchPlacesForConfig(
  config: PlaceConfig,
  cityName: string,
  citySlug: string
): Promise<CommunityList | null> {
  let items: CommunityItem[] = [];
  if (!config.emptyItems) {
    const query = encodeURIComponent(`best ${config.queryTerm} in ${cityName}`);
    const typeParam = config.placeType ? `&type=${config.placeType}` : '';
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}${typeParam}&key=${GOOGLE_PLACES_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  [${config.slug}] HTTP ${response.status}`);
      return null;
    }

    const json = await response.json();
    if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      console.warn(`  [${config.slug}] API status: ${json.status} — ${json.error_message ?? ''}`);
    }
    const results: Array<{ name: string; formatted_address?: string }> = json.results ?? [];
    if (results.length === 0) return null;

    items = results.slice(0, 10).map((result, rank) => ({
      id: `${config.slug}-${citySlug}-${rank}`,
      title: result.name,
      location: result.formatted_address ? parseLocation(result.formatted_address) : undefined,
      seedScore: Math.max(1, 28 - rank * 3),
    }));
  }

  const list: CommunityList = {
    id: `local-${config.slug}-${citySlug}`,
    title: config.title(cityName),
    category: config.appCategory,
    color: config.color,
    icon: config.icon,
    description: config.description(cityName),
    imageQuery: config.imageQuery(cityName),
    staticImageUrl: config.staticImageUrl,
    participantCount: config.emptyItems ? 0 : seedParticipantCount(`${config.slug}-${citySlug}`),
    items,
    region: cityName,
    findItemMode: config.findItemMode,
  };

  return list;
}

// ── Stale check ───────────────────────────────────────────────────────────────
async function getStaleCitySlugs(citySlugList: string[], maxAgeDays: number): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('local_lists')
    .select('city_slug')
    .in('city_slug', citySlugList)
    .lt('generated_at', cutoff);
  // Cities with NO rows (never generated) are always stale — capture them too
  const recentSlugs = new Set((data ?? []).map((r: any) => r.city_slug));
  // Cities that have rows but ALL of them are recent → skip
  const { data: recentData } = await supabase
    .from('local_lists')
    .select('city_slug')
    .in('city_slug', citySlugList)
    .gte('generated_at', cutoff);
  const allRecentSlugs = new Set((recentData ?? []).map((r: any) => r.city_slug));
  // A city is stale if it has at least one stale row OR no rows at all
  const stale = new Set<string>();
  for (const slug of citySlugList) {
    if (!allRecentSlugs.has(slug) || recentSlugs.has(slug)) stale.add(slug);
  }
  return stale;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Determine target cities
  let targetCities = TOP_500_CITIES;
  if (citiesArg) {
    const requestedSlugs = citiesArg.split(',').map((s) => s.trim().toLowerCase());
    targetCities = TOP_500_CITIES.filter((c) => requestedSlugs.includes(c.slug));
    if (targetCities.length === 0) {
      // Try matching by slugifying city names too
      targetCities = TOP_500_CITIES.filter((c) =>
        requestedSlugs.includes(slugify(c.name))
      );
    }
    if (targetCities.length === 0) {
      console.error(`No matching cities found for: ${citiesArg}`);
      process.exit(1);
    }
  }

  // Skip recently-generated cities if --stale-days provided
  if (staleDays !== null && !isDryRun) {
    console.log(`Checking for cities refreshed within ${staleDays} day(s)...`);
    const allSlugs = targetCities.map((c) => c.slug);
    const staleSlugs = await getStaleCitySlugs(allSlugs, staleDays);
    const before = targetCities.length;
    targetCities = targetCities.filter((c) => staleSlugs.has(c.slug));
    console.log(`Skipping ${before - targetCities.length} recently-generated cities. Generating ${targetCities.length}.`);
  }

  const totalCities = targetCities.length;
  const totalConfigs = PLACE_CONFIGS.length;
  const totalCalls = totalCities * totalConfigs;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Generating local lists`);
  console.log(`  Cities:  ${totalCities}`);
  console.log(`  Configs: ${totalConfigs}`);
  console.log(`  Total API calls: ${totalCalls}`);
  if (isDryRun) console.log(`  Mode: DRY RUN (no writes)`);
  console.log(`${'─'.repeat(60)}\n`);

  let totalGenerated = 0;
  let totalSkipped = 0;

  for (let ci = 0; ci < targetCities.length; ci++) {
    const city = targetCities[ci];
    const citySlug = city.slug;
    const cityLabel = `${city.name} (${ci + 1}/${totalCities})`;
    console.log(`\n▶ ${cityLabel}`);

    const rows: Array<{
      id: string;
      city_slug: string;
      city_name: string;
      neighborhood: null;
      config_slug: string;
      data: CommunityList;
      generated_at: string;
      sort_index: number;
    }> = [];

    for (let pi = 0; pi < PLACE_CONFIGS.length; pi++) {
      const config = PLACE_CONFIGS[pi];
      if (!isDryRun) await sleep(80); // stagger to avoid rate limits

      if (isDryRun) {
        console.log(`  [dry-run] Would fetch: best ${config.queryTerm} in ${city.name}`);
        totalGenerated++;
        continue;
      }

      try {
        const list = await fetchPlacesForConfig(config, city.name, citySlug);
        if (list) {
          rows.push({
            id: list.id,
            city_slug: citySlug,
            city_name: city.name,
            neighborhood: null,
            config_slug: config.slug,
            data: list,
            generated_at: new Date().toISOString(),
            sort_index: pi,
          });
          process.stdout.write(`  ✓ ${config.slug}\n`);
          totalGenerated++;
        } else {
          process.stdout.write(`  – ${config.slug} (no results)\n`);
          totalSkipped++;
        }
      } catch (err: any) {
        console.warn(`  ✗ ${config.slug}: ${err?.message ?? err}`);
        totalSkipped++;
      }
    }

    // Upsert all configs for this city in one batch
    if (!isDryRun && rows.length > 0) {
      const { error } = await supabase
        .from('local_lists')
        .upsert(rows, { onConflict: 'id' });
      if (error) {
        console.error(`  Supabase upsert error for ${city.name}:`, error.message);
      } else {
        console.log(`  ✓ Upserted ${rows.length} lists to Supabase`);
      }
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done.`);
  console.log(`  Generated: ${totalGenerated}`);
  console.log(`  Skipped:   ${totalSkipped}`);
  console.log(`${'─'.repeat(60)}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
