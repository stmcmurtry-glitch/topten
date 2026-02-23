export interface CommunityItem {
  id: string;
  title: string;
  seedScore: number;
}

export interface CommunityList {
  id: string;
  title: string;
  category: string;
  color: string;
  icon: string;
  description: string;
  participantCount: number;
  items: CommunityItem[];
  region?: string; // e.g. 'Philadelphia' — present only on local/area lists
}

export const COMMUNITY_LISTS: CommunityList[] = [
  {
    id: 'community-movies',
    title: 'Greatest Movies',
    category: 'Movies',
    color: '#FF6B6B',
    icon: 'film-outline',
    description: 'The films that defined cinema. Cast your vote for the greatest of all time.',
    participantCount: 3142,
    items: [
      { id: 'cm-1', title: 'The Godfather', seedScore: 962 },
      { id: 'cm-2', title: 'Schindler\'s List', seedScore: 891 },
      { id: 'cm-3', title: 'The Shawshank Redemption', seedScore: 874 },
      { id: 'cm-4', title: 'Pulp Fiction', seedScore: 820 },
      { id: 'cm-5', title: '2001: A Space Odyssey', seedScore: 751 },
      { id: 'cm-6', title: 'Citizen Kane', seedScore: 683 },
      { id: 'cm-7', title: 'Casablanca', seedScore: 614 },
      { id: 'cm-8', title: 'Parasite', seedScore: 532 },
      { id: 'cm-9', title: 'The Dark Knight', seedScore: 418 },
      { id: 'cm-10', title: 'Spirited Away', seedScore: 287 },
    ],
  },
  {
    id: 'community-tv',
    title: 'Best TV Shows',
    category: 'TV',
    color: '#5B8DEF',
    icon: 'tv-outline',
    description: 'Peak television. Which series changed the way we watch forever?',
    participantCount: 2847,
    items: [
      { id: 'ct-1', title: 'Breaking Bad', seedScore: 988 },
      { id: 'ct-2', title: 'The Wire', seedScore: 921 },
      { id: 'ct-3', title: 'The Sopranos', seedScore: 879 },
      { id: 'ct-4', title: 'Game of Thrones', seedScore: 803 },
      { id: 'ct-5', title: 'Succession', seedScore: 742 },
      { id: 'ct-6', title: 'Chernobyl', seedScore: 668 },
      { id: 'ct-7', title: 'Fleabag', seedScore: 589 },
      { id: 'ct-8', title: 'The Bear', seedScore: 501 },
      { id: 'ct-9', title: 'Fargo', seedScore: 397 },
      { id: 'ct-10', title: 'Arrested Development', seedScore: 263 },
    ],
  },
  {
    id: 'community-songs',
    title: 'Greatest Songs',
    category: 'Music',
    color: '#A29BFE',
    icon: 'musical-notes-outline',
    description: 'The tracks that stopped time. What\'s the greatest song ever recorded?',
    participantCount: 4501,
    items: [
      { id: 'cs-1', title: 'Bohemian Rhapsody', seedScore: 1043 },
      { id: 'cs-2', title: 'Imagine', seedScore: 971 },
      { id: 'cs-3', title: 'Smells Like Teen Spirit', seedScore: 894 },
      { id: 'cs-4', title: 'What\'s Going On', seedScore: 812 },
      { id: 'cs-5', title: 'Like a Rolling Stone', seedScore: 759 },
      { id: 'cs-6', title: 'God Only Knows', seedScore: 681 },
      { id: 'cs-7', title: 'Purple Rain', seedScore: 597 },
      { id: 'cs-8', title: 'Good Vibrations', seedScore: 498 },
      { id: 'cs-9', title: 'Waterloo Sunset', seedScore: 372 },
      { id: 'cs-10', title: 'I Will Always Love You', seedScore: 241 },
    ],
  },
  {
    id: 'community-athletes',
    title: 'Greatest Athletes',
    category: 'Sports',
    color: '#FF9F43',
    icon: 'trophy-outline',
    description: 'The GOAT debate, settled by you. Who is the greatest athlete of all time?',
    participantCount: 5218,
    items: [
      { id: 'ca-1', title: 'Michael Jordan', seedScore: 1102 },
      { id: 'ca-2', title: 'Muhammad Ali', seedScore: 1038 },
      { id: 'ca-3', title: 'Serena Williams', seedScore: 944 },
      { id: 'ca-4', title: 'Lionel Messi', seedScore: 867 },
      { id: 'ca-5', title: 'Usain Bolt', seedScore: 775 },
      { id: 'ca-6', title: 'Michael Phelps', seedScore: 692 },
      { id: 'ca-7', title: 'Simone Biles', seedScore: 603 },
      { id: 'ca-8', title: 'Tiger Woods', seedScore: 511 },
      { id: 'ca-9', title: 'LeBron James', seedScore: 404 },
      { id: 'ca-10', title: 'Roger Federer', seedScore: 318 },
    ],
  },
  {
    id: 'community-books',
    title: 'Best Books',
    category: 'Books',
    color: '#4ECDC4',
    icon: 'book-outline',
    description: 'Literature that endures. Which books belong in every library?',
    participantCount: 1983,
    items: [
      { id: 'cb-1', title: 'To Kill a Mockingbird', seedScore: 874 },
      { id: 'cb-2', title: '1984', seedScore: 831 },
      { id: 'cb-3', title: 'The Great Gatsby', seedScore: 763 },
      { id: 'cb-4', title: 'One Hundred Years of Solitude', seedScore: 698 },
      { id: 'cb-5', title: 'Pride and Prejudice', seedScore: 641 },
      { id: 'cb-6', title: 'Crime and Punishment', seedScore: 573 },
      { id: 'cb-7', title: 'Beloved', seedScore: 492 },
      { id: 'cb-8', title: 'Don Quixote', seedScore: 411 },
      { id: 'cb-9', title: 'Middlemarch', seedScore: 334 },
      { id: 'cb-10', title: 'The Brothers Karamazov', seedScore: 247 },
    ],
  },
];

// ── Local / "In your area" lists ─────────────────────────────────────────────
// These are shown in the dedicated "In your area" section on the home screen.
// Add or remove entries here as regional coverage expands.

export const LOCAL_COMMUNITY_LISTS: CommunityList[] = [
  {
    id: 'local-philly-pizza',
    title: 'Top Pizza in Philadelphia Region',
    category: 'Food',
    color: '#FFB347',
    icon: 'restaurant-outline',
    region: 'Philadelphia',
    description: 'Philly takes its pizza seriously. Which slice reigns supreme in the region?',
    participantCount: 412,
    items: [
      { id: 'lpp-1',  title: "Angelo's Pizzeria",                 seedScore: 310 },
      { id: 'lpp-2',  title: "Santucci's Original Square Pizza",  seedScore: 284 },
      { id: 'lpp-3',  title: "Pizzeria Beddia",                   seedScore: 261 },
      { id: 'lpp-4',  title: "Tacconelli's Pizzeria",             seedScore: 233 },
      { id: 'lpp-5',  title: "Pizza Brain",                       seedScore: 198 },
      { id: 'lpp-6',  title: "Nomad Pizza",                       seedScore: 172 },
      { id: 'lpp-7',  title: "Pizzeria Vetri",                    seedScore: 149 },
      { id: 'lpp-8',  title: "Lorenzo and Sons Pizza",            seedScore: 121 },
      { id: 'lpp-9',  title: "Criniti's",                         seedScore:  96 },
      { id: 'lpp-10', title: "South Street Pizza",                seedScore:  68 },
    ],
  },
  {
    id: 'local-philly-things',
    title: 'Best Things to Do in Philly',
    category: 'Travel',
    color: '#0984E3',
    icon: 'airplane-outline',
    region: 'Philadelphia',
    description: "From the Rocky steps to Reading Terminal — what makes Philly worth the trip?",
    participantCount: 287,
    items: [
      { id: 'lpt-1',  title: 'Philadelphia Museum of Art (Rocky Steps)', seedScore: 298 },
      { id: 'lpt-2',  title: 'Liberty Bell & Independence Hall',          seedScore: 271 },
      { id: 'lpt-3',  title: 'Reading Terminal Market',                   seedScore: 249 },
      { id: 'lpt-4',  title: 'Eastern State Penitentiary',                seedScore: 214 },
      { id: 'lpt-5',  title: 'Philadelphia Zoo',                          seedScore: 183 },
      { id: 'lpt-6',  title: 'Rittenhouse Square',                        seedScore: 158 },
      { id: 'lpt-7',  title: 'Penn Museum',                               seedScore: 131 },
      { id: 'lpt-8',  title: 'Magic Gardens',                             seedScore: 107 },
      { id: 'lpt-9',  title: 'South Street',                              seedScore:  84 },
      { id: 'lpt-10', title: 'Franklin Institute',                        seedScore:  61 },
    ],
  },
];
