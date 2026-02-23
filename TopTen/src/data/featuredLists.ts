import { CATEGORY_COLORS } from './categories';

export interface FeaturedList {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
  author: string;
  previewItems: string[];
  imageQuery: string;
  description: string;
}

export interface PopularList {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
}

export const POPULAR_LISTS: PopularList[] = [
  { id: 'p-1',  title: 'Greatest Athletes of All Time',      category: 'Sports',  icon: 'trophy-outline',         color: CATEGORY_COLORS.Sports  },
  { id: 'p-2',  title: 'Best Restaurants in the World',      category: 'Food',    icon: 'restaurant-outline',     color: CATEGORY_COLORS.Food    },
  { id: 'p-3',  title: 'Greatest Songs Ever Recorded',       category: 'Music',   icon: 'musical-notes-outline',  color: CATEGORY_COLORS.Music   },
  { id: 'p-4',  title: 'Most Iconic Movie Villains',         category: 'Movies',  icon: 'film-outline',           color: CATEGORY_COLORS.Movies  },
  { id: 'p-5',  title: 'Novels That Changed the World',      category: 'Books',   icon: 'book-outline',           color: CATEGORY_COLORS.Books   },
  { id: 'p-6',  title: 'Classic Cocktails Everyone Should Know', category: 'Drinks', icon: 'wine-outline',        color: CATEGORY_COLORS.Drinks  },
  { id: 'p-7',  title: 'Most Binge-Worthy TV Series',        category: 'TV',      icon: 'tv-outline',             color: CATEGORY_COLORS.TV      },
  { id: 'p-8',  title: 'Comfort Foods for Any Occasion',     category: 'Food',    icon: 'restaurant-outline',     color: CATEGORY_COLORS.Food    },
  { id: 'p-9',  title: 'Albums You Must Hear Before You Die', category: 'Music',  icon: 'musical-notes-outline',  color: CATEGORY_COLORS.Music   },
  { id: 'p-10', title: 'Most Thrilling Sporting Events Ever', category: 'Sports', icon: 'trophy-outline',         color: CATEGORY_COLORS.Sports  },
];

export const STARTER_LISTS: PopularList[] = [
  { id: 's-1', title: 'My Favorite Foods',       category: 'Food',    icon: 'restaurant-outline',    color: CATEGORY_COLORS.Food   },
  { id: 's-2', title: 'My Favorite Movies',      category: 'Movies',  icon: 'film-outline',          color: CATEGORY_COLORS.Movies },
  { id: 's-3', title: 'My Favorite TV Shows',    category: 'TV',      icon: 'tv-outline',            color: CATEGORY_COLORS.TV     },
  { id: 's-4', title: 'My Favorite Animals',     category: 'Nature',  icon: 'paw-outline',           color: CATEGORY_COLORS.Nature },
  { id: 's-5', title: 'My Favorite Colors',      category: 'Arts',    icon: 'color-palette-outline', color: CATEGORY_COLORS.Arts   },
  { id: 's-6', title: 'My Favorite Songs',       category: 'Music',   icon: 'musical-notes-outline', color: CATEGORY_COLORS.Music  },
  { id: 's-7', title: 'My Favorite Sports Teams',category: 'Sports',  icon: 'trophy-outline',        color: CATEGORY_COLORS.Sports },
  { id: 's-8', title: 'My Favorite Drinks',      category: 'Drinks',  icon: 'wine-outline',          color: CATEGORY_COLORS.Drinks },
];

export const FEATURED_LISTS: FeaturedList[] = [
  {
    id: 'f-0',
    title: 'Best TV Shows Ever Made',
    category: 'TV',
    icon: 'tv-outline',
    color: CATEGORY_COLORS.TV,
    author: 'Top Ten Editors',
    imageQuery: 'television drama dark moody cinematic',
    previewItems: ['The Wire', 'Breaking Bad', 'The Sopranos', 'Succession', 'Band of Brothers'],
    description: 'Ranked by a combined score drawn from TMDB audience ratings, Rotten Tomatoes critic consensus, and Emmy Award recognition across a show\'s full run.',
  },
  {
    id: 'f-1',
    title: 'Top 10 Films of All Time',
    category: 'Movies',
    icon: 'film-outline',
    color: CATEGORY_COLORS.Movies,
    author: 'Top Ten Editors',
    imageQuery: 'classic cinema vintage film projector',
    previewItems: ['The Godfather', 'Schindler\'s List', 'Citizen Kane', 'Casablanca', '2001: A Space Odyssey'],
    description: 'Ranked by a weighted combination of TMDB audience score, Metacritic critic score, and all-time global box office revenue adjusted for inflation.',
  },
  {
    id: 'f-2',
    title: 'Books Everyone Should Read',
    category: 'Books',
    icon: 'book-outline',
    color: CATEGORY_COLORS.Books,
    author: 'Top Ten Editors',
    imageQuery: 'vintage books library antique warm',
    previewItems: ['To Kill a Mockingbird', '1984', 'The Great Gatsby', 'Pride and Prejudice', 'One Hundred Years of Solitude'],
    description: 'Ranked by cultural and literary impact, Goodreads community ratings, and enduring critical reputation sustained across multiple decades.',
  },
  {
    id: 'f-3',
    title: 'Greatest Sports Moments Ever',
    category: 'Sports',
    icon: 'trophy-outline',
    color: CATEGORY_COLORS.Sports,
    author: 'Top Ten Editors',
    imageQuery: 'sports stadium crowd championship',
    previewItems: ['Jesse Owens, 1936 Berlin Olympics', 'Miracle on Ice 1980', 'Ali vs. Foreman, Rumble in the Jungle', 'Michael Jordan\'s Last Shot', 'Usain Bolt 9.58s World Record'],
    description: 'Ranked by historical significance, global broadcast viewership at the time, and long-term influence on the sport and the era it defined.',
  },
  {
    id: 'f-4',
    title: 'Albums That Defined a Decade',
    category: 'Music',
    icon: 'musical-notes-outline',
    color: CATEGORY_COLORS.Music,
    author: 'Top Ten Editors',
    imageQuery: 'vinyl record music concert stage',
    previewItems: ['Thriller — Michael Jackson', 'Nevermind — Nirvana', 'The Dark Side of the Moon — Pink Floyd', 'Rumours — Fleetwood Mac', 'Kind of Blue — Miles Davis'],
    description: 'Ranked by cultural impact, combined critical scores from Rolling Stone and Pitchfork, and certified units sold worldwide across all formats.',
  },
  {
    id: 'f-5',
    title: 'Dishes to Try Before You Die',
    category: 'Food',
    icon: 'restaurant-outline',
    color: CATEGORY_COLORS.Food,
    author: 'Top Ten Editors',
    imageQuery: 'fine dining gourmet plating chef',
    previewItems: ['Omakase Sushi, Tokyo', 'Peking Duck, Beijing', 'Neapolitan Pizza, Naples', 'Wagyu Beef, Kobe', 'Fresh Truffle Pasta, Alba'],
    description: 'Ranked by Michelin recognition, ingredient rarity and technical craftsmanship, and the dish\'s cultural significance to its region of origin.',
  },
  {
    id: 'f-6',
    title: 'Drinks Worth Every Sip',
    category: 'Drinks',
    icon: 'wine-outline',
    color: CATEGORY_COLORS.Drinks,
    author: 'Top Ten Editors',
    imageQuery: 'cocktail wine bar elegant dark',
    previewItems: ['Château Pétrus 2000', 'Pappy Van Winkle 23yr', 'Dom Pérignon 2008', 'Yamazaki 18yr', 'Romanée-Conti Grand Cru'],
    description: 'Ranked by vintage rarity and scarcity, collector market demand, and scores from leading industry critics and sommeliers worldwide.',
  },
];
