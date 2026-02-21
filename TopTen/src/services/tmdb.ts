import { TopTenItem } from '../data/schema';

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '0be08905ddb2c05e17e3ed29150e6ad3';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TmdbMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
}

/** Rich movie result — superset of TopTenItem */
export interface MovieResult {
  id: string;
  title: string;
  imageUrl?: string;
  year: string;
  overview: string;
}

// ── Mapping ────────────────────────────────────────────────────────────────

function toMovieResult(m: TmdbMovie): MovieResult {
  return {
    id: String(m.id),
    title: m.title,
    imageUrl: m.poster_path ? `${IMAGE_BASE}${m.poster_path}` : undefined,
    year: m.release_date ? m.release_date.slice(0, 4) : '',
    overview: m.overview ?? '',
  };
}

/** Maps a MovieResult into a TopTenItem at a given rank */
export function toTopTenItem(movie: MovieResult, rank: number): TopTenItem {
  return {
    id: `tmdb-${movie.id}-${rank}`,
    rank,
    title: movie.title,
    imageUrl: movie.imageUrl,
  };
}

// ── Cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, MovieResult[]>();

async function fetchMovies(url: string, key: string): Promise<MovieResult[]> {
  if (cache.has(key)) return cache.get(key)!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  const results: MovieResult[] = (data.results ?? []).map(toMovieResult);
  cache.set(key, results);
  return results;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getPopularMovies(): Promise<MovieResult[]> {
  const url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`;
  return fetchMovies(url, 'popular');
}

export async function searchMovies(query: string): Promise<MovieResult[]> {
  if (!query.trim()) return getPopularMovies();
  const key = `search:${query.toLowerCase().trim()}`;
  const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
  return fetchMovies(url, key);
}

/** Convenience: returns just titles (for slot-filling SearchScreen) */
export async function searchMovieTitles(query: string): Promise<string[]> {
  const results = await searchMovies(query);
  return results.map((m) => m.title);
}
