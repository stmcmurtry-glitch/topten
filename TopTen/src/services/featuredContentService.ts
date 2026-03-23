import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTopRatedMovies, getTopRatedTVShows, searchMovies, searchTVShows } from './tmdb';
import { FeaturedList } from '../data/featuredLists';

const CACHE_V = 'v9';
const ITEMS_PREFIX = `@topten_fitems_${CACHE_V}_`;
const IMAGE_PREFIX = `@topten_fimg_v8_`;

const UNSPLASH_KEY =
  process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ||
  'unqrIzAOMjppLYzOuOau81W5fKHuaUpyo8QPy8jesZI';

const SPORTSDB_KEY = process.env.EXPO_PUBLIC_SPORTSDB_KEY ?? '';
const SPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json';

const itemsMemCache = new Map<string, string[]>();
const imageMemCache = new Map<string, string | null>();

/** Strips stats suffix and year prefix from a list item title to get a clean search name.
 *  "Jack Nicklaus — 18 Majors" → "Jack Nicklaus"
 *  "1976-77 Montreal Canadiens (60-8-12)" → "Montreal Canadiens"
 */
function extractSportsName(raw: string): string {
  return raw
    .replace(/^\d{4}[-–]\d{2,4}\s+/, '')  // "1976-77 " prefix
    .replace(/^\d{4}\s+/, '')              // "1927 " prefix
    .replace(/\s*[-—]\s*.*$/, '')          // " — 18 Majors" suffix
    .replace(/\s*\(.*\)$/, '')             // " (60-8-12)" suffix
    .replace(/\s*\*$/, '')                 // trailing asterisk
    .trim();
}

/** Looks up a sports image via SportsDB. Tries player fanart first, then team fanart. */
async function fetchSportsDBImage(name: string): Promise<string | null> {
  if (!SPORTSDB_KEY || !name) return null;

  // Try player search
  try {
    const res = await fetch(
      `${SPORTSDB_BASE}/${SPORTSDB_KEY}/searchplayers.php?p=${encodeURIComponent(name)}`
    );
    if (res.ok) {
      const data = await res.json();
      const player = data.player?.[0];
      if (player) {
        const img = player.strFanart1 ?? player.strThumb ?? null;
        if (img) return img;
      }
    }
  } catch {}

  // Try team search
  try {
    const res = await fetch(
      `${SPORTSDB_BASE}/${SPORTSDB_KEY}/searchteams.php?t=${encodeURIComponent(name)}`
    );
    if (res.ok) {
      const data = await res.json();
      const team = data.teams?.[0];
      if (team) {
        const img = team.strFanart1 ?? team.strBadge ?? null;
        if (img) return img;
      }
    }
  } catch {}

  return null;
}

// Curated static items — checked first regardless of category.
// Use this for any Movies/TV list that is editorial (villains, characters, etc.)
// rather than "best films/shows overall", so it isn't overridden by the TMDB fetch.
const STATIC_ITEMS: Record<string, string[]> = {
  'f-68': [
    'Salvator Mundi — da Vinci ($450.3M, 2017)',
    'Interchange — de Kooning ($300M private sale, 2015)',
    'The Card Players — Cézanne ($250M private sale, 2011)',
    'Nafea Faa Ipoipo — Gauguin ($210M private sale, 2014)',
    'Number 17A — Pollock ($200M private sale, 2015)',
    'Shot Sage Blue Marilyn — Warhol ($195M, 2022)',
    "Les Femmes d'Alger (Version O) — Picasso ($179.4M, 2015)",
    'Nu couché — Modigliani ($170.4M, 2015)',
    'Nu couché (sur le côté gauche) — Modigliani ($157.2M, 2018)',
    'Les Poseuses, Ensemble — Seurat ($149.2M, 2022)',
  ],
  'f-67': [
    'The Phantom of the Opera — 13,981 performances (1988–2023)',
    'Chicago (revival) — 11,500+ performances (1996–present)*',
    'The Lion King — 11,000+ performances (1997–present)*',
    'Wicked — ~8,500+ performances (2003–present)*',
    'Cats — 7,485 performances (1982–2000)',
    'Les Misérables — 6,680 performances (1987–2003)',
    'A Chorus Line — 6,137 performances (1975–1990)',
    'Oh! Calcutta! (revival) — 5,959 performances (1976–1989)',
    'Mamma Mia! — 5,765 performances (2001–2015)',
    'Beauty and the Beast — 5,461 performances (1994–2007)',
  ],
  'f-64': [
    'Michael Phelps (Swimming, USA) — 23 gold medals',
    'Johannes Høsflot Klæbo (Cross-Country Skiing, Norway) — 11 gold medals*',
    'Larisa Latynina (Gymnastics, USSR) — 9 gold medals',
    'Paavo Nurmi (Athletics, Finland) — 9 gold medals',
    'Mark Spitz (Swimming, USA) — 9 gold medals',
    'Carl Lewis (Athletics, USA) — 9 gold medals',
    'Usain Bolt (Athletics, Jamaica) — 8 gold medals',
    'Bjørn Dæhlie (Cross-Country Skiing, Norway) — 8 gold medals',
    'Birgit Fischer (Canoe/Kayak, Germany) — 8 gold medals',
    'Sawao Kato (Gymnastics, Japan) — 8 gold medals',
  ],
  'f-60': [
    'Gone with the Wind (1939) — ~$4.2B adjusted',
    'Star Wars: A New Hope (1977) — ~$3.6B adjusted',
    'The Sound of Music (1965) — ~$3.0B adjusted',
    'E.T. the Extra-Terrestrial (1982) — ~$2.9B adjusted',
    'Titanic (1997) — ~$2.4B adjusted',
    'The Ten Commandments (1956) — ~$2.4B adjusted',
    'Jaws (1975) — ~$2.3B adjusted',
    'Doctor Zhivago (1965) — ~$2.1B adjusted',
    'The Exorcist (1973) — ~$1.9B adjusted',
    'Snow White and the Seven Dwarfs (1937) — ~$1.8B adjusted',
  ],
  'f-58': [
    'Hannibal Lecter — The Silence of the Lambs',
    'Darth Vader — Star Wars',
    'The Joker — The Dark Knight',
    'Anton Chigurh — No Country for Old Men',
    'Nurse Ratched — One Flew Over the Cuckoo\'s Nest',
    'Thanos — Avengers: Infinity War',
    'Hans Landa — Inglourious Basterds',
    'Alex DeLarge — A Clockwork Orange',
    'Norman Bates — Psycho',
    'Patrick Bateman — American Psycho',
  ],
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
    'Barry Bonds — 762', 'Hank Aaron — 755', 'Babe Ruth — 714', 'Albert Pujols — 703',
    'Alex Rodriguez — 696', 'Willie Mays — 660', 'Ken Griffey Jr. — 630', 'Jim Thome — 612',
    'Sammy Sosa — 609', 'Frank Robinson — 586',
  ],
  'f-19': [
    'Ed Walsh — 1.82', 'Addie Joss — 1.89', 'Three Finger Brown — 2.06', 'Christy Mathewson — 2.13',
    'Rube Waddell — 2.16', 'Walter Johnson — 2.17', 'Orval Overall — 2.24',
    'Tommy Bond — 2.25', 'Will White — 2.28', 'Ed Reulbach — 2.28',
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
    'Graham Gano — 63 yds (Panthers, 2018)', 'Greg Zuerlein — 63 yds (Rams, 2017)',
    'Blair Walsh — 62 yds (Vikings, 2013)', 'Jake Elliott — 61 yds (Eagles, 2017)',
  ],
  'f-25': [
    'Eric Dickerson — 2,105 yds (Rams, 1984)', 'Adrian Peterson — 2,097 yds (Vikings, 2012)',
    'Jamal Lewis — 2,066 yds (Ravens, 2003)', 'Barry Sanders — 2,053 yds (Lions, 1997)',
    'Derrick Henry — 2,027 yds (Titans, 2020)', 'Terrell Davis — 2,008 yds (Broncos, 1998)',
    'Chris Johnson — 2,006 yds (Titans, 2009)', 'Saquon Barkley — 2,005 yds (Eagles, 2024)',
    'O.J. Simpson — 2,003 yds (Bills, 1973)', 'Earl Campbell — 1,934 yds (Oilers, 1980)',
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
    'Alex Ovechkin — 921*', 'Wayne Gretzky — 894', 'Gordie Howe — 801', 'Jaromír Jagr — 766',
    'Brett Hull — 741', 'Marcel Dionne — 731', 'Phil Esposito — 717', 'Mike Gartner — 708',
    'Mark Messier — 694', 'Steve Yzerman — 692',
  ],
  'f-29': [
    'Wayne Gretzky — 1,963', 'Ron Francis — 1,249', 'Mark Messier — 1,193', 'Ray Bourque — 1,169',
    'Jaromír Jagr — 1,155', 'Paul Coffey — 1,135', 'Joe Thornton — 1,109', 'Sidney Crosby — 1,094*',
    'Adam Oates — 1,079', 'Steve Yzerman — 1,063',
  ],
  'f-30': [
    'Montreal Canadiens — 24', 'Toronto Maple Leafs — 13', 'Detroit Red Wings — 11', 'Boston Bruins — 6',
    'Chicago Blackhawks — 6', 'Edmonton Oilers — 5', 'Pittsburgh Penguins — 5', 'New York Rangers — 4',
    'New York Islanders — 4', 'Colorado Avalanche — 3',
  ],
  'f-31': [
    'Bill Russell — 11 rings', 'Sam Jones — 10 rings', 'K.C. Jones — 8 rings', 'Satch Sanders — 8 rings',
    'John Havlicek — 8 rings', 'Tom Heinsohn — 8 rings', 'Frank Ramsey — 7 rings',
    'Robert Horry — 7 rings', 'Michael Jordan — 6 rings', 'Scottie Pippen — 6 rings',
  ],
  'f-32': [
    'Boston Celtics — 18', 'Los Angeles Lakers — 17', 'Golden State Warriors — 7', 'Chicago Bulls — 6',
    'San Antonio Spurs — 5', 'Miami Heat — 3', 'Philadelphia 76ers — 3', 'Detroit Pistons — 3',
    'Houston Rockets — 2', 'New York Knicks — 2',
  ],
  'f-33': [
    'LeBron James — 43,127*', 'Kareem Abdul-Jabbar — 38,387', 'Karl Malone — 36,928', 'Kobe Bryant — 33,643',
    'Michael Jordan — 32,292', 'Kevin Durant — 32,163*', 'Dirk Nowitzki — 31,560',
    'Wilt Chamberlain — 31,419', 'Julius Erving — 30,026', 'Moses Malone — 29,580',
  ],
  'f-34': [
    'Michael Jordan — 30.12 ppg', 'Wilt Chamberlain — 30.07 ppg', 'Luka Dončić — 29.03 ppg*',
    'Joel Embiid — 27.63 ppg*', 'Elgin Baylor — 27.36 ppg', 'Kevin Durant — 27.16 ppg*',
    'Jerry West — 27.03 ppg', 'LeBron James — 26.85 ppg*', 'Allen Iverson — 26.66 ppg',
    'Bob Pettit — 26.36 ppg',
  ],
};

const COMMUNITY_IMAGE_PREFIX = `@topten_cimg_v3_`;
const communityImageMemCache = new Map<string, string | null>();

// ── City images via Wikipedia (no rate limits) ─────────────────────────────
const CITY_IMAGE_PREFIX = `@topten_cityimg_v2_`;
const cityImageMemCache = new Map<string, string | null>();

export async function fetchCityImage(
  cityId: string,
  wikiTitle: string,
): Promise<string | null> {
  if (cityImageMemCache.has(cityId)) return cityImageMemCache.get(cityId)!;

  try {
    const stored = await AsyncStorage.getItem(CITY_IMAGE_PREFIX + cityId);
    if (stored) {
      cityImageMemCache.set(cityId, stored);
      return stored;
    }
  } catch {}

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'TopTenApp/1.0' } });
    if (res.ok) {
      const data = await res.json();
      // Prefer thumbnail (fast, ~320px) over full originalimage (can be 3–5 MB)
      const imageUrl: string | null =
        data.thumbnail?.source ?? data.originalimage?.source ?? null;
      if (imageUrl) {
        cityImageMemCache.set(cityId, imageUrl);
        try { await AsyncStorage.setItem(CITY_IMAGE_PREFIX + cityId, imageUrl); } catch {}
        return imageUrl;
      }
    }
  } catch {}

  cityImageMemCache.set(cityId, null);
  return null;
}


// ── Community list images ──────────────────────────────────────────────────

export async function fetchCommunityImage(
  listId: string,
  imageQuery: string | undefined,
  category?: string,
  firstItemTitle?: string,
  staticImageUrl?: string,
): Promise<string | null> {
  if (staticImageUrl) return staticImageUrl;

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
    // Use TMDB title search for Movies/TV community lists — gets the actual #1 item backdrop
    if (firstItemTitle && category === 'Movies') {
      const results = await searchMovies(firstItemTitle);
      imageUrl = results[0]?.backdropUrl ?? null;
    } else if (firstItemTitle && category === 'TV') {
      const results = await searchTVShows(firstItemTitle);
      imageUrl = results[0]?.backdropUrl ?? null;
    }

    // Fall back to Unsplash for everything else
    if (!imageUrl && UNSPLASH_KEY && imageQuery) {
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
  // Static items always win — never overridden by cache or API.
  if (STATIC_ITEMS[list.id]) return STATIC_ITEMS[list.id];

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
      items = list.previewItems;
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
  // Return pinned image immediately — no API call needed
  if (list.staticImageUrl) return list.staticImageUrl;

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
    if (list.category === 'Movies' && list.previewItems[0]) {
      // Search by the specific #1 title so the backdrop matches the actual list
      const movies = await searchMovies(list.previewItems[0]);
      imageUrl = movies[0]?.backdropUrl ?? null;
      if (!imageUrl) {
        const topRated = await getTopRatedMovies();
        imageUrl = topRated[0]?.backdropUrl ?? null;
      }
    } else if (list.category === 'TV' && list.previewItems[0]) {
      const shows = await searchTVShows(list.previewItems[0]);
      imageUrl = shows[0]?.backdropUrl ?? null;
      if (!imageUrl) {
        const topRated = await getTopRatedTVShows();
        imageUrl = topRated[0]?.backdropUrl ?? null;
      }
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
