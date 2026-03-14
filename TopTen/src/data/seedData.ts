import { TopTenList } from './schema';

export const seedLists: TopTenList[] = [
  {
    id: '1',
    category: 'Movies',
    title: 'My Top 10 Movies',
    icon: 'film-outline',
    items: [],
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
  {
    id: '2',
    category: 'Books',
    title: 'My Top 10 Books',
    icon: 'book-outline',
    items: [],
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
  {
    id: '3',
    category: 'Food',
    title: 'My Top 10 Foods',
    icon: 'restaurant-outline',
    items: [],
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
  {
    id: '4',
    category: 'Arts',
    title: 'My Top 10 Favorite Colors',
    icon: 'color-palette-outline',
    items: [],
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
  {
    id: '5',
    category: 'TV',
    title: 'My Top 10 TV Shows',
    icon: 'tv-outline',
    items: [],
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
];
