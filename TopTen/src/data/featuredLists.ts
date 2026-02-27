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
  sponsored?: { name: string; cta: string; url: string };
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
    sponsored: {
      name: 'Drops of God',
      cta: 'Watch now on Apple TV+',
      url: 'https://tv.apple.com/show/drops-of-god',
    },
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
    imageQuery: 'red wine glass pour dark moody cellar',
    previewItems: ['Château Pétrus 2000', 'Pappy Van Winkle 23yr', 'Dom Pérignon 2008', 'Yamazaki 18yr', 'Romanée-Conti Grand Cru'],
    description: 'Ranked by vintage rarity and scarcity, collector market demand, and scores from leading industry critics and sommeliers worldwide.',
  },
  {
    id: 'f-7',
    title: 'Places to Visit Before You Die',
    category: 'Travel',
    icon: 'airplane-outline',
    color: CATEGORY_COLORS.Travel,
    author: 'Top Ten Editors',
    imageQuery: 'travel landscape mountains ocean destination',
    previewItems: ['Machu Picchu, Peru', 'The Amalfi Coast, Italy', 'Kyoto in Cherry Blossom Season', 'Safari in the Serengeti', 'The Northern Lights, Iceland'],
    description: 'Ranked by UNESCO World Heritage status, traveler volume and sentiment across major booking platforms, and documented once-in-a-lifetime significance.',
  },
  {
    id: 'f-8',
    title: 'Greatest Video Games of All Time',
    category: 'Gaming',
    icon: 'game-controller-outline',
    color: CATEGORY_COLORS.Gaming,
    author: 'Top Ten Editors',
    imageQuery: 'zelda nintendo video game landscape adventure',
    previewItems: ['The Legend of Zelda: Ocarina of Time', 'Tetris', 'Super Mario Bros.', 'The Last of Us', 'Red Dead Redemption 2'],
    description: 'Ranked by aggregate critic scores across Metacritic and IGN, lifetime units sold, and lasting cultural impact on the medium since release.',
  },
  {
    id: 'f-9',
    title: 'Most Influential People in History',
    category: 'People',
    icon: 'people-outline',
    color: CATEGORY_COLORS.People,
    author: 'Top Ten Editors',
    imageQuery: 'historical portrait iconic leader black and white',
    previewItems: ['Isaac Newton', 'Leonardo da Vinci', 'Abraham Lincoln', 'Marie Curie', 'Nelson Mandela'],
    description: 'Ranked by breadth of historical impact, enduring influence across subsequent generations, and recognition by leading historians and academic institutions.',
  },
  {
    id: 'f-10',
    title: 'Most Iconic Fashion Moments',
    category: 'Fashion',
    icon: 'shirt-outline',
    color: CATEGORY_COLORS.Fashion,
    author: 'Top Ten Editors',
    imageQuery: 'fashion runway model elegant style',
    previewItems: ["Audrey Hepburn's little black dress, Breakfast at Tiffany's", "Princess Diana's revenge dress, 1994", "Coco Chanel's tweed suit", 'David Bowie as Ziggy Stardust', "Rihanna's Met Gala yellow gown, 2015"],
    description: 'Ranked by cultural resonance, media reproduction frequency, and influence on subsequent fashion trends as documented by Vogue, WWD, and fashion historians.',
  },
  {
    id: 'f-11',
    title: 'Habits That Actually Change Your Life',
    category: 'Health',
    icon: 'fitness-outline',
    color: CATEGORY_COLORS.Health,
    author: 'Top Ten Editors',
    imageQuery: 'health fitness morning routine wellness',
    previewItems: ['Daily exercise (30 min)', 'Consistent sleep schedule', 'Meditation or mindfulness', 'Drinking enough water', 'Journaling'],
    description: 'Ranked by volume of peer-reviewed supporting research, adoption rates among high performers, and documented long-term impact on mental and physical health outcomes.',
  },
  {
    id: 'f-12',
    title: 'Technologies That Changed Everything',
    category: 'Tech',
    icon: 'laptop-outline',
    color: CATEGORY_COLORS.Tech,
    author: 'Top Ten Editors',
    imageQuery: 'technology computer circuit board innovation',
    previewItems: ['The Internet', 'The Printing Press', 'The Smartphone', 'Electricity', 'The Steam Engine'],
    description: 'Ranked by scale of societal transformation, speed of global adoption, and long-term economic and cultural disruption documented by historians of science and technology.',
  },
  {
    id: 'f-13',
    title: 'Natural Wonders You Must See',
    category: 'Nature',
    icon: 'leaf-outline',
    color: CATEGORY_COLORS.Nature,
    author: 'Top Ten Editors',
    imageQuery: 'nature landscape waterfall mountains wilderness',
    previewItems: ['The Grand Canyon, USA', 'The Amazon Rainforest', 'The Great Barrier Reef', 'Victoria Falls, Zimbabwe/Zambia', 'The Aurora Borealis'],
    description: 'Ranked by ecological uniqueness, UNESCO and IUCN designation, annual visitor awe ratings, and scientific significance to our understanding of the natural world.',
  },
  {
    id: 'f-14',
    title: 'Artworks That Defined Human Creativity',
    category: 'Arts',
    icon: 'color-palette-outline',
    color: CATEGORY_COLORS.Arts,
    author: 'Top Ten Editors',
    imageQuery: 'art museum painting gallery masterpiece',
    previewItems: ['The Mona Lisa — da Vinci', 'The Starry Night — van Gogh', 'The Sistine Chapel Ceiling — Michelangelo', 'Guernica — Picasso', 'The Birth of Venus — Botticelli'],
    description: 'Ranked by art historical significance, museum attendance and reproduction frequency, influence on subsequent movements, and auction and insurance valuation.',
  },
  {
    id: 'f-15',
    title: 'Experiences Everyone Should Have Once',
    category: 'Miscellaneous',
    icon: 'grid-outline',
    color: CATEGORY_COLORS.Miscellaneous,
    author: 'Top Ten Editors',
    imageQuery: 'adventure travel experience bucket list journey',
    previewItems: ['Watch a live World Cup or Olympics', 'Sleep under the stars', 'Learn a second language', 'Live abroad for at least a year', 'See a total solar eclipse'],
    description: 'Ranked by frequency of appearance on bucket lists across major travel and lifestyle publications, and breadth of life-enrichment value reported by those who have done them.',
  },
];
