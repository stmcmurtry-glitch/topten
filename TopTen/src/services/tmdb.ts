import { TopTenItem } from '../data/schema';

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY ?? '';
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

async function fetchResults(
  url: string,
  key: string,
  mapper: (item: any) => MovieResult,
): Promise<MovieResult[]> {
  if (cache.has(key)) return cache.get(key)!;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  const results: MovieResult[] = (data.results ?? []).map(mapper);
  cache.set(key, results);
  return results;
}

// ── TV mapping ─────────────────────────────────────────────────────────────

function toTVResult(show: any): MovieResult {
  return {
    id: String(show.id),
    title: show.name,
    imageUrl: show.poster_path ? `${IMAGE_BASE}${show.poster_path}` : undefined,
    year: show.first_air_date ? show.first_air_date.slice(0, 4) : '',
    overview: show.overview ?? '',
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getPopularMovies(): Promise<MovieResult[]> {
  const url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`;
  return fetchResults(url, 'popular', toMovieResult);
}

export async function searchMovies(query: string): Promise<MovieResult[]> {
  if (!query.trim()) return getPopularMovies();
  const key = `movie-search:${query.toLowerCase().trim()}`;
  const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
  return fetchResults(url, key, toMovieResult);
}

export async function getTopRatedMovies(): Promise<MovieResult[]> {
  const url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`;
  return fetchResults(url, 'movies-top-rated', toMovieResult);
}

export async function getTopRatedTVShows(): Promise<MovieResult[]> {
  const url = `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US&page=1`;
  return fetchResults(url, 'tv-top-rated', toTVResult);
}

export async function getPopularTVShows(): Promise<MovieResult[]> {
  const url = `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=1`;
  return fetchResults(url, 'tv-popular', toTVResult);
}

export async function searchTVShows(query: string): Promise<MovieResult[]> {
  if (!query.trim()) return getPopularTVShows();
  const key = `tv-search:${query.toLowerCase().trim()}`;
  const url = `${BASE_URL}/search/tv?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`;
  return fetchResults(url, key, toTVResult);
}
