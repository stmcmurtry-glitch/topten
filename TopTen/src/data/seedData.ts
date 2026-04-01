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
    category: 'Food',
    title: 'My Top 10 Restaurants',
    icon: 'restaurant-outline',
    items: [],
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
  {
    id: '3',
    category: 'Travel',
    title: 'My Top 10 Bucket List',
    icon: 'airplane-outline',
    items: [],
    createdAt: new Date().toISOString(),
    isCustom: false,
  },
];
