const TMDB_API_KEY = '0be08905ddb2c05e17e3ed29150e6ad3';

const foods = [
  'Pizza', 'Sushi', 'Tacos', 'Pasta', 'Burgers', 'Ramen', 'Steak',
  'Pad Thai', 'Ice Cream', 'Fried Chicken', 'Curry', 'Pho',
  'Dumplings', 'Fish and Chips', 'Chocolate Cake',
];

const generic = [
  'Option A', 'Option B', 'Option C', 'Option D', 'Option E',
];

const staticLists: Record<string, string[]> = {
  Foods: foods,
};

async function searchMovies(query: string): Promise<string[]> {
  if (!query.trim()) {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    const data = await res.json();
    return (data.results ?? []).map((m: any) => m.title);
  }
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`
  );
  const data = await res.json();
  return (data.results ?? []).map((m: any) => m.title);
}

async function searchBooks(query: string): Promise<string[]> {
  if (!query.trim()) {
    const res = await fetch(
      'https://openlibrary.org/trending/yearly.json?limit=20'
    );
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
  const list = staticLists[category] ?? generic;
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
  if (category === 'Movies') return searchMovies(query);
  if (category === 'Books') return searchBooks(query);
  return searchStatic(category, query);
}
