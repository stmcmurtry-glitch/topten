import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@topten_location';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface DetectedLocation {
  city: string;
  region: string;   // state / province name, e.g. "Pennsylvania"
  country: string;  // ISO 3166-1 alpha-2, e.g. "US"
  detectedAt: number;
}

// In-memory fast path — undefined = not yet checked, null = failed/unavailable
let memCache: DetectedLocation | null | undefined = undefined;

/**
 * Returns the device's detected location via ipinfo.io.
 * Results are cached in AsyncStorage for 7 days and in-memory for the session.
 * Returns null if the request fails or if no network is available.
 */
export async function getDetectedLocation(): Promise<DetectedLocation | null> {
  if (memCache !== undefined) return memCache;

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
 * Clears both the in-memory and on-disk cache.
 * Call this when the user resets their location in Settings.
 * The next call to getDetectedLocation() will re-fetch from ipinfo.
 */
export async function clearLocationCache(): Promise<void> {
  memCache = undefined;
  try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
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
export function regionMatches(listRegion: string, loc: DetectedLocation): boolean {
  const r = listRegion.toLowerCase().trim();
  return (
    r === loc.city.toLowerCase() ||
    r === loc.region.toLowerCase() ||
    r === loc.country.toLowerCase()
  );
}
