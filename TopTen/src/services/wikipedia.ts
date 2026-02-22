import { SearchResult } from '../data/suggestions';

const WP_API = 'https://en.wikipedia.org/w/api.php';

const DEFAULT_ATHLETE_NAMES: string[] = [
  // Basketball
  'Michael Jordan', 'LeBron James', 'Kobe Bryant', 'Magic Johnson', 'Larry Bird',
  'Kareem Abdul-Jabbar', 'Shaquille O\'Neal', 'Stephen Curry', 'Kevin Durant',
  'Bill Russell', 'Wilt Chamberlain', 'Oscar Robertson', 'Charles Barkley',
  'Hakeem Olajuwon', 'Tim Duncan',
  // American Football
  'Tom Brady', 'Jerry Rice', 'Jim Brown', 'Lawrence Taylor', 'Joe Montana',
  'Walter Payton', 'Barry Sanders', 'Peyton Manning', 'Emmitt Smith',
  'Reggie White', 'Randy Moss', 'Dick Butkus', 'Patrick Mahomes',
  // Soccer
  'Lionel Messi', 'Cristiano Ronaldo', 'Pelé', 'Diego Maradona', 'Zinedine Zidane',
  'Ronaldo (Brazilian footballer)', 'Johan Cruyff', 'Ronaldinho', 'Thierry Henry',
  'Marta (footballer)', 'Megan Rapinoe', 'Neymar', 'Erling Haaland',
  // Baseball
  'Babe Ruth', 'Willie Mays', 'Hank Aaron', 'Ted Williams', 'Lou Gehrig',
  'Jackie Robinson', 'Sandy Koufax', 'Derek Jeter', 'Mike Trout', 'Mickey Mantle',
  // Tennis
  'Roger Federer', 'Serena Williams', 'Rafael Nadal', 'Novak Djokovic',
  'Steffi Graf', 'Pete Sampras', 'Martina Navratilova', 'Rod Laver',
  'Billie Jean King', 'Arthur Ashe',
  // Golf
  'Tiger Woods', 'Jack Nicklaus', 'Arnold Palmer', 'Gary Player', 'Phil Mickelson',
  // Track & Field
  'Usain Bolt', 'Jesse Owens', 'Carl Lewis', 'Florence Griffith-Joyner',
  'Jackie Joyner-Kersee', 'Michael Johnson', 'Allyson Felix', 'Eliud Kipchoge',
  // Swimming
  'Michael Phelps', 'Mark Spitz', 'Katie Ledecky',
  // Gymnastics
  'Simone Biles', 'Nadia Comaneci', 'Mary Lou Retton',
  // Boxing
  'Muhammad Ali', 'Joe Louis', 'Sugar Ray Robinson', 'Floyd Mayweather',
  'Mike Tyson', 'Rocky Marciano', 'George Foreman', 'Sugar Ray Leonard',
  // Hockey
  'Wayne Gretzky', 'Mario Lemieux', 'Gordie Howe', 'Bobby Orr', 'Sidney Crosby',
  'Bobby Hull',
  // Cycling
  'Eddy Merckx',
  // Multi-sport / Other
  'Bo Jackson', 'Jim Thorpe', 'Deion Sanders', 'Bruce Jenner',
  // Rugby
  'Jonah Lomu', 'Dan Carter', 'Richie McCaw',
  // Cricket
  'Sachin Tendulkar', 'Don Bradman', 'Vivian Richards',
  // MMA / Wrestling
  'Anderson Silva', 'Jon Jones', 'Conor McGregor',
  // Figure skating / Winter
  'Sonja Henie', 'Scott Hamilton',
];

// Cache for default list (with images) and search queries
const imageCache = new Map<string, string>(); // title → imageUrl
const searchCache = new Map<string, SearchResult[]>();
let defaultListFetched = false;

async function fetchImagesForTitles(titles: string[]): Promise<void> {
  const params = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '185',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${WP_API}?${params}`);
  if (!res.ok) return;
  const data = await res.json();
  const pages: Record<string, any> = data.query?.pages ?? {};
  Object.values(pages).forEach((page: any) => {
    if (page.title && page.thumbnail?.source) {
      imageCache.set(page.title, page.thumbnail.source);
    }
  });
}

async function ensureDefaultImages(): Promise<void> {
  if (defaultListFetched) return;
  defaultListFetched = true;
  // Wikipedia allows up to 50 titles per request
  const batches: string[][] = [];
  for (let i = 0; i < DEFAULT_ATHLETE_NAMES.length; i += 50) {
    batches.push(DEFAULT_ATHLETE_NAMES.slice(i, i + 50));
  }
  await Promise.all(batches.map(fetchImagesForTitles));
}

export async function searchAthletes(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    await ensureDefaultImages();
    return DEFAULT_ATHLETE_NAMES.map((name) => ({
      title: name,
      imageUrl: imageCache.get(name),
    }));
  }

  const key = `search:${query.toLowerCase().trim()}`;
  if (searchCache.has(key)) return searchCache.get(key)!;

  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '20',
    gsrnamespace: '0',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '185',
    format: 'json',
    origin: '*',
  });

  const res = await fetch(`${WP_API}?${params}`);
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const data = await res.json();

  const pages: Record<string, any> = data.query?.pages ?? {};
  const results: SearchResult[] = Object.values(pages)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => ({
      title: page.title,
      imageUrl: page.thumbnail?.source,
    }));

  searchCache.set(key, results);
  return results;
}
