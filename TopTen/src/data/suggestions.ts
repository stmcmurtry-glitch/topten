import { searchMovies, searchTVShows } from '../services/tmdb';

export interface SearchResult {
  title: string;
  imageUrl?: string;
  year?: string;
}

const foods = [
  'Pizza', 'Sushi', 'Tacos', 'Pasta', 'Burgers', 'Ramen', 'Steak',
  'Pad Thai', 'Ice Cream', 'Fried Chicken', 'Curry', 'Pho',
  'Dumplings', 'Fish and Chips', 'Chocolate Cake',
];

const staticLists: Record<string, string[]> = {
  Foods: foods,
};

async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    const res = await fetch('https://openlibrary.org/trending/yearly.json?limit=20');
    const data = await res.json();
    return (data.works ?? []).map((b: any) => ({ title: b.title }));
  }
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=title`
  );
  const data = await res.json();
  return (data.docs ?? []).map((b: any) => ({ title: b.title }));
}

function searchStatic(category: string, query: string): SearchResult[] {
  const list = staticLists[category] ?? [];
  const filtered = query.trim()
    ? list.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : list;
  return filtered.map((title) => ({ title }));
}

export type SearchCategory = 'Movies' | 'Books' | string;

export const isApiCategory = (category: string): boolean =>
  category === 'Movies' || category === 'TV' || category === 'Books';

export async function searchSuggestions(
  category: string,
  query: string,
): Promise<SearchResult[]> {
  if (category === 'Movies') {
    const movies = await searchMovies(query);
    return movies.map((m) => ({ title: m.title, imageUrl: m.imageUrl, year: m.year }));
  }
  if (category === 'TV') {
    const shows = await searchTVShows(query);
    return shows.map((s) => ({ title: s.title, imageUrl: s.imageUrl, year: s.year }));
  }
  if (category === 'Books') return searchBooks(query);
  return searchStatic(category, query);
}
