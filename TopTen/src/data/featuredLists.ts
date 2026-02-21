import { CATEGORY_COLORS } from '../components/FeedRow';

export interface FeaturedList {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  author: string;
  previewItems: string[];
}

export const FEATURED_LISTS: FeaturedList[] = [
  {
    id: 'f-1',
    title: 'Top 10 Films of All Time',
    category: 'Movies',
    icon: 'film-outline',
    color: CATEGORY_COLORS.Movies,
    author: 'Top Ten Editors',
    previewItems: [
      'The Godfather', 'Schindler\'s List', 'Citizen Kane',
      'Casablanca', '2001: A Space Odyssey',
    ],
  },
  {
    id: 'f-2',
    title: 'Books Everyone Should Read',
    category: 'Books',
    icon: 'book-outline',
    color: CATEGORY_COLORS.Books,
    author: 'Top Ten Editors',
    previewItems: [
      'To Kill a Mockingbird', '1984', 'The Great Gatsby',
      'Pride and Prejudice', 'One Hundred Years of Solitude',
    ],
  },
  {
    id: 'f-3',
    title: 'Greatest Golf Courses',
    category: 'Golf',
    icon: 'golf-outline',
    color: CATEGORY_COLORS.Golf,
    author: 'Top Ten Editors',
    previewItems: [
      'Augusta National', 'St Andrews Old Course', 'Pebble Beach',
      'Cypress Point', 'Pine Valley',
    ],
  },
  {
    id: 'f-4',
    title: 'Wines Worth Every Sip',
    category: 'Wine',
    icon: 'wine-outline',
    color: CATEGORY_COLORS.Wine,
    author: 'Top Ten Editors',
    previewItems: [
      'Château Pétrus', 'Screaming Eagle', 'Sassicaia',
      'Opus One', 'Romanée-Conti',
    ],
  },
  {
    id: 'f-5',
    title: 'Foods to Try Before You Die',
    category: 'Foods',
    icon: 'restaurant-outline',
    color: CATEGORY_COLORS.Foods,
    author: 'Top Ten Editors',
    previewItems: [
      'Peking Duck', 'Neapolitan Pizza', 'Wagyu Beef',
      'Fresh Truffle Pasta', 'Omakase Sushi',
    ],
  },
];
