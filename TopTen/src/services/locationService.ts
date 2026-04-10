import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@topten_location';
const MANUAL_OVERRIDE_KEY = '@topten_location_manual';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface DetectedLocation {
  city: string;
  region: string;   // state / province name, e.g. "Pennsylvania"
  country: string;  // ISO 3166-1 alpha-2, e.g. "US"
  detectedAt: number;
  isManual?: boolean;
}

// In-memory fast path — undefined = not yet checked, null = failed/unavailable
let memCache: DetectedLocation | null | undefined = undefined;

// Prime memCache from AsyncStorage at module load time so it's ready before
// any component mounts. This eliminates the cold-start gap where location is
// undefined even though a valid cached value exists on disk.
(async () => {
  try {
    const manual = await AsyncStorage.getItem(MANUAL_OVERRIDE_KEY);
    if (manual) { memCache = JSON.parse(manual); return; }
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: DetectedLocation = JSON.parse(stored);
      if (Date.now() - parsed.detectedAt < CACHE_TTL_MS) memCache = parsed;
    }
  } catch {}
})();

/**
 * Returns the device's detected location via ipinfo.io.
 * Results are cached in AsyncStorage for 7 days and in-memory for the session.
 * Returns null if the request fails or if no network is available.
 */
export async function getDetectedLocation(): Promise<DetectedLocation | null> {
  // Uncomment + set EXPO_PUBLIC_MOCK_CITY in .env to simulate a city during testing
  // const mockCity = process.env.EXPO_PUBLIC_MOCK_CITY;
  // if (mockCity) return { city: mockCity, region: '', country: 'US', detectedAt: Date.now() };

  if (memCache !== undefined) return memCache;

  // Check manual override first
  try {
    const manual = await AsyncStorage.getItem(MANUAL_OVERRIDE_KEY);
    if (manual) {
      const parsed: DetectedLocation = JSON.parse(manual);
      memCache = parsed;
      return parsed;
    }
  } catch {}

  // Try the on-disk cache first
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: DetectedLocation = JSON.parse(stored);
      if (Date.now() - parsed.detectedAt < CACHE_TTL_MS) {
        memCache = parsed;
        return parsed;
      }
    }
  } catch {}

  // Fetch from ipinfo.io — free tier: 50k req/month, no API key required
  try {
    const res = await fetch('https://ipinfo.io/json');
    if (!res.ok) throw new Error(`ipinfo returned ${res.status}`);
    const data = await res.json();
    const loc: DetectedLocation = {
      city:       (data.city    ?? '').trim(),
      region:     (data.region  ?? '').trim(),
      country:    (data.country ?? '').trim(),
      detectedAt: Date.now(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    memCache = loc;
    return loc;
  } catch (e) {
    console.warn('[Location] ipinfo fetch failed:', e);
    memCache = null;
    return null;
  }
}

/**
 * Saves a manually entered city as the active location.
 * Reads existing auto-detect cache for region/country context.
 * Returns the new DetectedLocation with isManual: true.
 */
export async function setManualCity(city: string, region?: string): Promise<DetectedLocation> {
  let resolvedRegion = region ?? '';
  let country = 'US';
  if (!resolvedRegion) {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: DetectedLocation = JSON.parse(stored);
        country = parsed.country;
      }
    } catch {}
  }
  const loc: DetectedLocation = {
    city: city.trim(),
    region: resolvedRegion,
    country,
    detectedAt: Date.now(),
    isManual: true,
  };
  await AsyncStorage.setItem(MANUAL_OVERRIDE_KEY, JSON.stringify(loc));
  memCache = loc;
  return loc;
}

/**
 * Clears both the in-memory and on-disk cache, including any manual override.
 * Call this when the user resets their location in Settings.
 * The next call to getDetectedLocation() will re-fetch from ipinfo.
 */
export async function clearLocationCache(): Promise<void> {
  memCache = undefined;
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
  try { await AsyncStorage.removeItem(MANUAL_OVERRIDE_KEY); } catch {}
}

/**
 * Returns true when a CommunityList's `region` field matches the
 * detected location at city, state/province, or country level.
 *
 * Examples:
 *   list.region = 'Philadelphia'  →  matches  loc.city = 'Philadelphia'
 *   list.region = 'Pennsylvania'  →  matches  loc.region = 'Pennsylvania'
 *   list.region = 'US'            →  matches  loc.country = 'US'
 */
const US_STATE_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH',
  'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC',
  'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
  'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN',
  'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC',
};

/**
 * Returns a short location label, e.g. "Pittsburgh, PA" for US locations
 * or "Pittsburgh, Ontario" for non-US. Falls back gracefully if no region.
 */
export function formatLocationLabel(loc: DetectedLocation): string {
  const city = loc.city || loc.region;
  if (!city) return '';
  if (!loc.region) return city;
  const abbr = loc.country === 'US' ? (US_STATE_ABBR[loc.region] ?? loc.region) : loc.region;
  return `${city}, ${abbr}`;
}

export function regionMatches(listRegion: string, loc: DetectedLocation): boolean {
  const r = listRegion.toLowerCase().trim();
  return (
    r === loc.city.toLowerCase() ||
    r === loc.region.toLowerCase() ||
    r === loc.country.toLowerCase()
  );
}
