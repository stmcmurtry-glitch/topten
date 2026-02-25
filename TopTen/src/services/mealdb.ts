import { SearchResult } from '../data/suggestions';

const BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

const DEFAULT_MEALS: string[] = [
  'Pizza', 'Sushi', 'Tacos', 'Pasta', 'Ramen', 'Burger', 'Steak', 'Pad Thai',
  'Fried Chicken', 'Curry', 'Pho', 'Dumplings', 'Fish and Chips', 'Paella',
  'Risotto', 'Bibimbap', 'Falafel', 'Shawarma', 'Baozi', 'Poke Bowl',
  'Lasagna', 'Enchiladas', 'Gumbo', 'Clam Chowder', 'Lobster Bisque',
  'Peking Duck', 'Dim Sum', 'Tom Yum', 'Nasi Goreng', 'Jerk Chicken',
  'Moussaka', 'Coq au Vin', 'Beef Bourguignon', 'Bouillabaisse', 'Crêpes',
  'Tiramisu', 'Gelato', 'Baklava', 'Mochi', 'Churros',
  'Chocolate Cake', 'Cheesecake', 'Apple Pie', 'Croissant', 'Baguette',
  'Souvlaki', 'Kebab', 'Biryani', 'Butter Chicken', 'Masala Dosa',
  'Jollof Rice', 'Injera', 'Tagine', 'Ceviche', 'Empanadas',
  'Pierogi', 'Borscht', 'Schnitzel', 'Bratwurst', 'Fondue',
  'Sashimi', 'Tempura', 'Okonomiyaki', 'Tonkotsu Ramen', 'Takoyaki',
  'Poutine', 'Smoked Salmon', 'Eggs Benedict', 'French Toast', 'Pancakes',
  'Waffles', 'Granola', 'Açaí Bowl', 'Avocado Toast', 'BLT Sandwich',
];

const cache = new Map<string, SearchResult[]>();

export async function searchMeals(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return DEFAULT_MEALS.map((title) => ({ title }));
  }

  const key = `meals:${query.toLowerCase().trim()}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(`${BASE_URL}/search.php?s=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`MealDB ${res.status}`);
    const data = await res.json();

    const apiResults: SearchResult[] = (data.meals ?? []).map((m: any) => ({
      title: m.strMeal,
      imageUrl: m.strMealThumb ?? undefined,
    }));

    // Also filter static list for additional matches
    const q = query.toLowerCase();
    const staticMatches = DEFAULT_MEALS
      .filter((f) => f.toLowerCase().includes(q) && !apiResults.find((r) => r.title.toLowerCase() === f.toLowerCase()))
      .map((title) => ({ title }));

    const results = [...apiResults, ...staticMatches].slice(0, 20);
    cache.set(key, results);
    return results;
  } catch {
    const q = query.toLowerCase();
    return DEFAULT_MEALS
      .filter((f) => f.toLowerCase().includes(q))
      .map((title) => ({ title }));
  }
}
