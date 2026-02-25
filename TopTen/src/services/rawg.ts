import { SearchResult } from '../data/suggestions';

const API_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY ?? '';
const BASE_URL = 'https://api.rawg.io/api';

const cache = new Map<string, SearchResult[]>();

export async function searchGames(query: string): Promise<SearchResult[]> {
  const key = `games:${query.toLowerCase().trim()}`;
  if (cache.has(key)) return cache.get(key)!;

  const url = query.trim()
    ? `${BASE_URL}/games?key=${API_KEY}&search=${encodeURIComponent(query)}&page_size=20`
    : `${BASE_URL}/games?key=${API_KEY}&ordering=-rating&metacritic=80,100&page_size=20`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`RAWG ${res.status}`);
  const data = await res.json();

  const results: SearchResult[] = (data.results ?? []).map((g: any) => ({
    title: g.name,
    imageUrl: g.background_image ?? undefined,
    year: g.released ? g.released.slice(0, 4) : undefined,
  }));

  cache.set(key, results);
  return results;
}
