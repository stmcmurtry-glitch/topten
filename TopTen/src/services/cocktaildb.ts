import { SearchResult } from '../data/suggestions';

const BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';

const DEFAULT_DRINKS: string[] = [
  'Old Fashioned', 'Negroni', 'Manhattan', 'Martini', 'Margarita',
  'Mojito', 'Daiquiri', 'Cosmopolitan', 'Whiskey Sour', 'Espresso Martini',
  'Aperol Spritz', 'Paloma', 'Moscow Mule', 'Dark and Stormy', 'Gimlet',
  'Tom Collins', 'French 75', 'Sidecar', 'Last Word', 'Paper Plane',
  'Champagne', 'Prosecco', 'Red Wine', 'White Wine', 'Rosé',
  'IPA', 'Stout', 'Lager', 'Pale Ale', 'Sour Beer',
  'Coffee', 'Espresso', 'Cappuccino', 'Latte', 'Matcha Latte',
  'Whisky Neat', 'Bourbon', 'Scotch', 'Tequila', 'Gin and Tonic',
  'Pina Colada', 'Mai Tai', 'Blue Lagoon', 'Sex on the Beach', 'Long Island Iced Tea',
];

const cache = new Map<string, SearchResult[]>();

export async function searchDrinks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return DEFAULT_DRINKS.map((title) => ({ title }));
  }

  const key = `drinks:${query.toLowerCase().trim()}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`CocktailDB ${res.status}`);
    const data = await res.json();

    const apiResults: SearchResult[] = (data.drinks ?? []).map((d: any) => ({
      title: d.strDrink,
      imageUrl: d.strDrinkThumb ?? undefined,
    }));

    const q = query.toLowerCase();
    const staticMatches = DEFAULT_DRINKS
      .filter((d) => d.toLowerCase().includes(q) && !apiResults.find((r) => r.title.toLowerCase() === d.toLowerCase()))
      .map((title) => ({ title }));

    const results = [...apiResults, ...staticMatches].slice(0, 20);
    cache.set(key, results);
    return results;
  } catch {
    const q = query.toLowerCase();
    return DEFAULT_DRINKS
      .filter((d) => d.toLowerCase().includes(q))
      .map((title) => ({ title }));
  }
}
