import { searchMovieTitles } from '../services/tmdb';

const foods = [
  'Pizza', 'Sushi', 'Tacos', 'Pasta', 'Burgers', 'Ramen', 'Steak',
  'Pad Thai', 'Ice Cream', 'Fried Chicken', 'Curry', 'Pho',
  'Dumplings', 'Fish and Chips', 'Chocolate Cake',
];

const staticLists: Record<string, string[]> = {
  Foods: foods,
};

async function searchBooks(query: string): Promise<string[]> {
  if (!query.trim()) {
    const res = await fetch('https://openlibrary.org/trending/yearly.json?limit=20');
    const data = await res.json();
    return (data.works ?? []).map((b: any) => b.title);
  }
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=title`
  );
  const data = await res.json();
  return (data.docs ?? []).map((b: any) => b.title);
}

function searchStatic(category: string, query: string): string[] {
  const list = staticLists[category] ?? [];
  if (!query.trim()) return list;
  const q = query.toLowerCase();
  return list.filter((s) => s.toLowerCase().includes(q));
}

export type SearchCategory = 'Movies' | 'Books' | string;

export const isApiCategory = (category: string): boolean =>
  category === 'Movies' || category === 'Books';

export async function searchSuggestions(
  category: string,
  query: string,
): Promise<string[]> {
  if (category === 'Movies') return searchMovieTitles(query);
  if (category === 'Books') return searchBooks(query);
  return searchStatic(category, query);
}
