import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTopRatedMovies, getTopRatedTVShows } from './tmdb';
import { FeaturedList } from '../data/featuredLists';

const CACHE_V = 'v5';
const ITEMS_PREFIX = `@topten_fitems_${CACHE_V}_`;
const IMAGE_PREFIX = `@topten_fimg_${CACHE_V}_`;

const UNSPLASH_KEY =
  process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ||
  'unqrIzAOMjppLYzOuOau81W5fKHuaUpyo8QPy8jesZI';

const itemsMemCache = new Map<string, string[]>();
const imageMemCache = new Map<string, string | null>();

// Curated static items for non-API categories
const STATIC_ITEMS: Record<string, string[]> = {
  'f-2': [
    'To Kill a Mockingbird', '1984', 'The Great Gatsby',
    'Crime and Punishment', 'One Hundred Years of Solitude',
    'Pride and Prejudice', 'Brave New World',
    'The Catcher in the Rye', 'Don Quixote', 'War and Peace',
  ],
  'f-3': [
    'Jesse Owens, 1936 Berlin Olympics', 'Miracle on Ice, 1980',
    'Ali vs. Foreman, Rumble in the Jungle', 'Michael Jordan\'s Last Shot',
    'Usain Bolt 9.58s World Record', 'Tiger Woods, 2000 US Open',
    'Secretariat, 1973 Belmont Stakes', 'Nadia Comaneci\'s Perfect 10',
    'Roger Bannister Breaks 4-Minute Mile', 'The Hand of God',
  ],
  'f-4': [
    'Thriller — Michael Jackson', 'Nevermind — Nirvana',
    'The Dark Side of the Moon — Pink Floyd', 'Rumours — Fleetwood Mac',
    'Kind of Blue — Miles Davis', 'Abbey Road — The Beatles',
    'Purple Rain — Prince', 'What\'s Going On — Marvin Gaye',
    'Born to Run — Bruce Springsteen', 'Miseducation of Lauryn Hill',
  ],
  'f-5': [
    'Omakase Sushi, Tokyo', 'Peking Duck, Beijing',
    'Neapolitan Pizza, Naples', 'Wagyu Beef, Kobe',
    'Fresh Truffle Pasta, Alba', 'Bouillabaisse, Marseille',
    'Ceviche, Lima', 'Dim Sum, Hong Kong',
    'Croissant au Beurre, Paris', 'Rendang, Sumatra',
  ],
  'f-6': [
    'Château Pétrus 2000', 'Pappy Van Winkle 23yr',
    'Dom Pérignon 2008', 'Yamazaki 18yr',
    'Romanée-Conti Grand Cru', 'Negroni',
    'Old Fashioned', 'Dry Martini',
    'Sazerac', 'Aperol Spritz',
  ],
  'f-16': [
    'Jack Nicklaus — 18 Majors', 'Tiger Woods — 15 Majors', 'Walter Hagen — 11 Majors',
    'Ben Hogan — 9 Majors', 'Gary Player — 9 Majors', 'Tom Watson — 8 Majors',
    'Arnold Palmer — 7 Majors', 'Gene Sarazen — 7 Majors', 'Sam Snead — 7 Majors', 'Harry Vardon — 7 Majors',
  ],
  'f-17': [
    'Novak Djokovic — 24', 'Rafael Nadal — 22', 'Roger Federer — 20', 'Pete Sampras — 14',
    'Roy Emerson — 12', 'Björn Borg — 11', 'Rod Laver — 11', 'Bill Tilden — 10',
    'Jimmy Connors — 8', 'Ivan Lendl — 8',
  ],
  'f-18': [
    'Barry Bonds — 762', 'Hank Aaron — 755', 'Babe Ruth — 714', 'Albert Pujols — 700',
    'Alex Rodriguez — 696', 'Willie Mays — 660', 'Ken Griffey Jr. — 630', 'Jim Thome — 612',
    'Sammy Sosa — 609', 'Frank Robinson — 586',
  ],
  'f-19': [
    'Ed Walsh — 1.82', 'Addie Joss — 1.89', 'Three Finger Brown — 2.06', 'Christy Mathewson — 2.13',
    'Rube Waddell — 2.16', 'Walter Johnson — 2.17', 'Grover Cleveland Alexander — 2.56',
    'Clayton Kershaw — 2.48', 'Cy Young — 2.63', 'Tom Seaver — 2.86',
  ],
  'f-20': [
    'Cy Young — 511', 'Walter Johnson — 417', 'Grover Cleveland Alexander — 373', 'Christy Mathewson — 373',
    'Pud Galvin — 365', 'Warren Spahn — 363', 'Kid Nichols — 361', 'Greg Maddux — 355',
    'Roger Clemens — 354', 'Tim Keefe — 342',
  ],
  'f-21': [
    'New York Yankees — 27', 'St. Louis Cardinals — 11', 'Oakland Athletics — 9', 'Boston Red Sox — 9',
    'SF/NY Giants — 8', 'LA/Brooklyn Dodgers — 7', 'Cincinnati Reds — 5', 'Pittsburgh Pirates — 5',
    'Detroit Tigers — 4', 'Minnesota Twins — 3',
  ],
  'f-22': [
    'New England Patriots — 6', 'Pittsburgh Steelers — 6', 'San Francisco 49ers — 5', 'Dallas Cowboys — 5',
    'Kansas City Chiefs — 4', 'Green Bay Packers — 4', 'New York Giants — 4', 'Denver Broncos — 3',
    'Las Vegas Raiders — 3', 'Washington Commanders — 3',
  ],
  'f-23': [
    'Tom Brady — 89,214 yds', 'Drew Brees — 80,358 yds', 'Peyton Manning — 71,940 yds', 'Brett Favre — 71,838 yds',
    'Ben Roethlisberger — 64,088 yds', 'Philip Rivers — 63,440 yds', 'Matt Ryan — 62,584 yds',
    'Dan Marino — 61,361 yds', 'Eli Manning — 57,023 yds', 'John Elway — 51,475 yds',
  ],
  'f-24': [
    'Justin Tucker — 66 yds (Ravens, 2021)', 'Matt Prater — 64 yds (Broncos, 2013)',
    'Tom Dempsey — 63 yds (Saints, 1970)', 'Jason Elam — 63 yds (Broncos, 1998)',
    'Sebastian Janikowski — 63 yds (Raiders, 2011)', 'David Akers — 63 yds (49ers, 2012)',
    'Graham Gano — 63 yds (Panthers, 2018)', 'Jake Elliott — 61 yds (Eagles, 2017)',
    'Robbie Gould — 61 yds (49ers, 2020)', 'Ryan Succop — 61 yds (Buccaneers, 2020)',
  ],
  'f-25': [
    'Eric Dickerson — 2,105 yds (Rams, 1984)', 'Adrian Peterson — 2,097 yds (Vikings, 2012)',
    'Jamal Lewis — 2,066 yds (Ravens, 2003)', 'Barry Sanders — 2,053 yds (Lions, 1997)',
    'Derrick Henry — 2,027 yds (Titans, 2020)', 'Saquon Barkley — 2,005 yds (Eagles, 2024)',
    'O.J. Simpson — 2,003 yds (Bills, 1973)', 'Earl Campbell — 1,934 yds (Oilers, 1980)',
    'Jim Brown — 1,863 yds (Browns, 1963)', 'Tiki Barber — 1,860 yds (Giants, 2005)',
  ],
  'f-26': [
    'Brazil — 5 titles (1958, 62, 70, 94, 02)', 'Germany — 4 titles (1954, 74, 90, 2014)',
    'Italy — 4 titles (1934, 38, 82, 2006)', 'Argentina — 3 titles (1978, 86, 2022)',
    'France — 2 titles (1998, 2018)', 'Uruguay — 2 titles (1930, 1950)',
    'England — 1 title (1966)', 'Spain — 1 title (2010)',
    'Netherlands — 3 finals, 0 titles', 'Hungary — 2 finals, 0 titles',
  ],
  'f-27': [
    'Miroslav Klose — 16', 'Ronaldo (Brazil) — 15', 'Gerd Müller — 14', 'Just Fontaine — 13',
    'Pelé — 12', 'Kylian Mbappé — 12', 'Sándor Kocsis — 11', 'Jürgen Klinsmann — 11',
    'Helmut Rahn — 10', 'Gary Lineker — 10',
  ],
  'f-28': [
    'Wayne Gretzky — 894', 'Gordie Howe — 801', 'Jaromír Jagr — 766', 'Brett Hull — 741',
    'Marcel Dionne — 731', 'Phil Esposito — 717', 'Mike Gartner — 708', 'Mark Messier — 694',
    'Steve Yzerman — 692', 'Mario Lemieux — 690',
  ],
  'f-29': [
    'Wayne Gretzky — 1,963', 'Ron Francis — 1,249', 'Mark Messier — 1,193', 'Ray Bourque — 1,169',
    'Jaromír Jagr — 1,155', 'Paul Coffey — 1,135', 'Adam Oates — 1,079', 'Gordie Howe — 1,049',
    'Marcel Dionne — 1,040', 'Joe Sakic — 1,016',
  ],
  'f-30': [
    'Montreal Canadiens — 24', 'Toronto Maple Leafs — 13', 'Detroit Red Wings — 11', 'Boston Bruins — 6',
    'Chicago Blackhawks — 6', 'Edmonton Oilers — 5', 'Pittsburgh Penguins — 5', 'New York Rangers — 4',
    'New York Islanders — 4', 'Colorado Avalanche — 3',
  ],
  'f-31': [
    'Bill Russell — 11 rings', 'Sam Jones — 10 rings', 'K.C. Jones — 8 rings', 'Satch Sanders — 8 rings',
    'John Havlicek — 8 rings', 'Michael Jordan — 6 rings', 'Scottie Pippen — 6 rings',
    'Kareem Abdul-Jabbar — 6', 'Magic Johnson — 5 rings', 'Kobe Bryant — 5 rings',
  ],
  'f-32': [
    'Boston Celtics — 17', 'Los Angeles Lakers — 17', 'Golden State Warriors — 7', 'Chicago Bulls — 6',
    'San Antonio Spurs — 5', 'Miami Heat — 3', 'Philadelphia 76ers — 3', 'Detroit Pistons — 3',
    'Houston Rockets — 2', 'New York Knicks — 2',
  ],
  'f-33': [
    'LeBron James — 40,000+', 'Kareem Abdul-Jabbar — 38,387', 'Karl Malone — 36,928', 'Kobe Bryant — 33,643',
    'Michael Jordan — 32,292', 'Dirk Nowitzki — 31,560', 'Wilt Chamberlain — 31,419',
    "Shaquille O'Neal — 28,596", 'Carmelo Anthony — 28,289', 'Moses Malone — 27,409',
  ],
  'f-34': [
    'Wilt Chamberlain — 30.1 ppg', 'Michael Jordan — 30.1 ppg', 'Elgin Baylor — 27.4 ppg',
    'LeBron James — 27.1 ppg', 'Jerry West — 27.0 ppg', 'Kevin Durant — 27.0 ppg',
    'Allen Iverson — 26.7 ppg', 'George Gervin — 26.2 ppg', 'Oscar Robertson — 25.7 ppg',
    'Kobe Bryant — 25.0 ppg',
  ],
};

const COMMUNITY_IMAGE_PREFIX = `@topten_cimg_v3_`;
const communityImageMemCache = new Map<string, string | null>();

// ── Community list images ──────────────────────────────────────────────────

export async function fetchCommunityImage(listId: string, imageQuery: string): Promise<string | null> {
  if (communityImageMemCache.has(listId)) return communityImageMemCache.get(listId)!;

  try {
    const stored = await AsyncStorage.getItem(COMMUNITY_IMAGE_PREFIX + listId);
    if (stored) {
      communityImageMemCache.set(listId, stored);
      return stored;
    }
  } catch {}

  let imageUrl: string | null = null;
  try {
    if (UNSPLASH_KEY) {
      const url =
        `https://api.unsplash.com/photos/random` +
        `?query=${encodeURIComponent(imageQuery)}` +
        `&orientation=landscape&client_id=${UNSPLASH_KEY}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        imageUrl = data.urls?.regular ?? null;
      }
    }
  } catch {}

  // Only cache successes — failures stay uncached so they retry on next load
  if (imageUrl) {
    communityImageMemCache.set(listId, imageUrl);
    try { await AsyncStorage.setItem(COMMUNITY_IMAGE_PREFIX + listId, imageUrl); } catch {}
  }
  return imageUrl;
}

// ── Items ──────────────────────────────────────────────────────────────────

export async function fetchFeaturedItems(list: FeaturedList): Promise<string[]> {
  if (itemsMemCache.has(list.id)) return itemsMemCache.get(list.id)!;

  try {
    const stored = await AsyncStorage.getItem(ITEMS_PREFIX + list.id);
    if (stored) {
      const items = JSON.parse(stored) as string[];
      itemsMemCache.set(list.id, items);
      return items;
    }
  } catch {}

  let items: string[] = [];
  try {
    if (list.category === 'Movies') {
      const movies = await getTopRatedMovies();
      items = movies.slice(0, 10).map((m) => m.title);
    } else if (list.category === 'TV') {
      const shows = await getTopRatedTVShows();
      items = shows.slice(0, 10).map((s) => s.title);
    } else {
      items = STATIC_ITEMS[list.id] ?? list.previewItems;
    }
  } catch {
    items = STATIC_ITEMS[list.id] ?? list.previewItems;
  }

  if (items.length > 0) {
    itemsMemCache.set(list.id, items);
    try { await AsyncStorage.setItem(ITEMS_PREFIX + list.id, JSON.stringify(items)); } catch {}
  }
  return items.length > 0 ? items : list.previewItems;
}

// ── Image ──────────────────────────────────────────────────────────────────

export async function fetchFeaturedImage(list: FeaturedList): Promise<string | null> {
  if (imageMemCache.has(list.id)) return imageMemCache.get(list.id)!;

  try {
    const stored = await AsyncStorage.getItem(IMAGE_PREFIX + list.id);
    if (stored) {
      imageMemCache.set(list.id, stored);
      return stored;
    }
  } catch {}

  let imageUrl: string | null = null;
  try {
    if (list.category === 'Movies') {
      const movies = await getTopRatedMovies();
      imageUrl = movies[0]?.backdropUrl ?? null;
    } else if (list.category === 'TV') {
      const shows = await getTopRatedTVShows();
      imageUrl = shows[0]?.backdropUrl ?? null;
    }
    // Fall back to Unsplash landscape for any category (including Movies/TV if backdrop missing)
    if (!imageUrl && UNSPLASH_KEY) {
      const url =
        `https://api.unsplash.com/photos/random` +
        `?query=${encodeURIComponent(list.imageQuery)}` +
        `&orientation=landscape&client_id=${UNSPLASH_KEY}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        imageUrl = data.urls?.regular ?? null;
      }
    }
  } catch {}

  // Only cache successes — failures stay uncached so they retry on next load
  if (imageUrl) {
    imageMemCache.set(list.id, imageUrl);
    try { await AsyncStorage.setItem(IMAGE_PREFIX + list.id, imageUrl); } catch {}
  }
  return imageUrl;
}
