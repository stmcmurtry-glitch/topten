import { searchMovies, searchTVShows } from '../services/tmdb';
import { searchAthletes, searchWikipedia } from '../services/wikipedia';
import { searchSports } from '../services/sportsdb';
import { searchMusic } from '../services/musicbrainz';
import { searchMeals } from '../services/mealdb';
import { searchDrinks } from '../services/cocktaildb';
import { searchGames } from '../services/rawg';
import {
  TRAVEL_DESTINATIONS,
  NATIONAL_PARKS,
  BEACHES,
  ISLANDS,
  PEOPLE_NAMES,
  US_PRESIDENTS,
  FASHION_ITEMS,
  HEALTH_ITEMS,
  TECH_ITEMS,
  NATURE_ITEMS,
  ARTS_ITEMS,
  MISC_ITEMS,
} from './staticSearchLists';

export interface SearchResult {
  title: string;
  imageUrl?: string;
  year?: string;
}

const COVERS_BASE = 'https://covers.openlibrary.org/b/id';

function coverUrl(coverId: number | undefined): string | undefined {
  return coverId ? `${COVERS_BASE}/${coverId}-M.jpg` : undefined;
}

async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    const res = await fetch('https://openlibrary.org/trending/yearly.json?limit=20');
    const data = await res.json();
    return (data.works ?? []).map((b: any) => ({
      title: b.title,
      imageUrl: coverUrl(b.cover_i),
    }));
  }
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=title,cover_i,first_publish_year`
  );
  const data = await res.json();
  return (data.docs ?? []).map((b: any) => ({
    title: b.title,
    imageUrl: coverUrl(b.cover_i),
    year: b.first_publish_year ? String(b.first_publish_year) : undefined,
  }));
}

function searchStaticList(list: string[], query: string): SearchResult[] {
  const filtered = query.trim()
    ? list.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : list;
  return filtered.slice(0, 40).map((title) => ({ title }));
}

export type SearchCategory = 'Movies' | 'Books' | string;

export const isApiCategory = (category: string): boolean => [
  'Movies', 'TV', 'Books', 'Sports', 'Music', 'Food', 'Drinks',
  'Gaming', 'People', 'Travel', 'Fashion', 'Health', 'Tech',
  'Nature', 'Arts', 'Miscellaneous',
].includes(category);

export async function searchSuggestions(
  category: string,
  query: string,
  listTitle?: string,
): Promise<SearchResult[]> {
  switch (category) {
    case 'Movies': {
      const movies = await searchMovies(query);
      return movies.map((m) => ({ title: m.title, imageUrl: m.imageUrl, year: m.year }));
    }
    case 'TV': {
      const shows = await searchTVShows(query);
      return shows.map((s) => ({ title: s.title, imageUrl: s.imageUrl, year: s.year }));
    }
    case 'Books':
      return searchBooks(query);
    case 'Sports':
      return searchSports(query, listTitle).catch(() => searchAthletes(query));
    case 'Music':
      return searchMusic(query, listTitle);
    case 'Food':
      return searchMeals(query);
    case 'Drinks':
      return searchDrinks(query);
    case 'Gaming':
      return searchGames(query);
    case 'People': {
      const t = listTitle?.toLowerCase() ?? '';
      if (/\bpresident|presidents\b/.test(t)) {
        const q = query.toLowerCase();
        const list = US_PRESIDENTS.filter(
          (p) => !q || p.title.toLowerCase().includes(q) || p.year.toLowerCase().includes(q)
        );
        return list;
      }
      if (!query.trim()) return searchStaticList(PEOPLE_NAMES, query);
      return searchWikipedia(query).catch(() => searchStaticList(PEOPLE_NAMES, query));
    }
    case 'Travel': {
      const t = listTitle?.toLowerCase() ?? '';
      if (/\bnational.park|national.parks\b/.test(t))
        return searchStaticList(NATIONAL_PARKS, query);
      if (/\bbeach|beaches\b/.test(t))
        return searchStaticList(BEACHES, query);
      if (/\bisland|islands\b/.test(t))
        return searchStaticList(ISLANDS, query);
      return searchStaticList(TRAVEL_DESTINATIONS, query);
    }
    case 'Fashion':
      return searchStaticList(FASHION_ITEMS, query);
    case 'Health':
      return searchStaticList(HEALTH_ITEMS, query);
    case 'Tech':
      return searchStaticList(TECH_ITEMS, query);
    case 'Nature':
      return searchStaticList(NATURE_ITEMS, query);
    case 'Arts':
      return searchStaticList(ARTS_ITEMS, query);
    case 'Miscellaneous':
      return searchStaticList(MISC_ITEMS, query);
    default:
      return [];
  }
}
