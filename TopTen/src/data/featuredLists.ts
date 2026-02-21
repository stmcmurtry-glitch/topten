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
    id: 'f-0',
    title: 'Best TV Shows Ever Made',
    category: 'TV',
    icon: 'tv-outline',
    color: CATEGORY_COLORS.TV,
    author: 'Top Ten Editors',
    previewItems: [
      'The Wire', 'Breaking Bad', 'The Sopranos',
      'Succession', 'Band of Brothers',
    ],
  },
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
    title: 'Greatest Sports Moments Ever',
    category: 'Sports',
    icon: 'trophy-outline',
    color: CATEGORY_COLORS.Sports,
    author: 'Top Ten Editors',
    previewItems: [
      'Jesse Owens 1936 Olympics', 'Miracle on Ice', 'Muhammad Ali vs Foreman',
      'Michael Jordan\'s Last Shot', 'Usain Bolt 9.58',
    ],
  },
  {
    id: 'f-4',
    title: 'Albums That Defined a Decade',
    category: 'Music',
    icon: 'musical-notes-outline',
    color: CATEGORY_COLORS.Music,
    author: 'Top Ten Editors',
    previewItems: [
      'Thriller', 'Nevermind', 'The Dark Side of the Moon',
      'Rumours', 'Kind of Blue',
    ],
  },
  {
    id: 'f-5',
    title: 'Dishes to Try Before You Die',
    category: 'Food',
    icon: 'restaurant-outline',
    color: CATEGORY_COLORS.Food,
    author: 'Top Ten Editors',
    previewItems: [
      'Peking Duck', 'Neapolitan Pizza', 'Wagyu Beef',
      'Fresh Truffle Pasta', 'Omakase Sushi',
    ],
  },
  {
    id: 'f-6',
    title: 'Drinks Worth Every Sip',
    category: 'Drinks',
    icon: 'wine-outline',
    color: CATEGORY_COLORS.Drinks,
    author: 'Top Ten Editors',
    previewItems: [
      'Château Pétrus', 'Pappy Van Winkle 23', 'Dom Pérignon',
      'Yamazaki 18', 'Romanée-Conti',
    ],
  },
];
