import { SearchResult } from '../data/suggestions';

// Free key '3' works for basic queries; replace with a Patreon key for full search results.
const KEY = process.env.EXPO_PUBLIC_SPORTSDB_KEY ?? '3';
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

const cache = new Map<string, SearchResult[]>();

// ── Sport-specific default lists ──────────────────────────────────────────────

const DEFAULTS: Record<string, SearchResult[]> = {
  Golf: [
    { title: 'Jack Nicklaus',    year: 'Golf' },
    { title: 'Tiger Woods',      year: 'Golf' },
    { title: 'Arnold Palmer',    year: 'Golf' },
    { title: 'Ben Hogan',        year: 'Golf' },
    { title: 'Gary Player',      year: 'Golf' },
    { title: 'Sam Snead',        year: 'Golf' },
    { title: 'Tom Watson',       year: 'Golf' },
    { title: 'Phil Mickelson',   year: 'Golf' },
    { title: 'Rory McIlroy',     year: 'Golf' },
    { title: 'Seve Ballesteros', year: 'Golf' },
    { title: 'Greg Norman',      year: 'Golf' },
    { title: 'Nick Faldo',       year: 'Golf' },
    { title: 'Lee Trevino',      year: 'Golf' },
    { title: 'Byron Nelson',     year: 'Golf' },
    { title: 'Vijay Singh',      year: 'Golf' },
  ],
  Tennis: [
    { title: 'Roger Federer',         year: 'Tennis' },
    { title: 'Serena Williams',       year: 'Tennis' },
    { title: 'Novak Djokovic',        year: 'Tennis' },
    { title: 'Rafael Nadal',          year: 'Tennis' },
    { title: 'Steffi Graf',           year: 'Tennis' },
    { title: 'Pete Sampras',          year: 'Tennis' },
    { title: 'Martina Navratilova',   year: 'Tennis' },
    { title: 'Rod Laver',             year: 'Tennis' },
    { title: 'Billie Jean King',      year: 'Tennis' },
    { title: 'Andre Agassi',          year: 'Tennis' },
    { title: 'Chris Evert',           year: 'Tennis' },
    { title: 'Jimmy Connors',         year: 'Tennis' },
    { title: 'Björn Borg',            year: 'Tennis' },
    { title: 'John McEnroe',          year: 'Tennis' },
    { title: 'Margaret Court',        year: 'Tennis' },
  ],
  Baseball: [
    { title: 'Babe Ruth',         year: 'MLB · RF'  },
    { title: 'Willie Mays',       year: 'MLB · CF'  },
    { title: 'Hank Aaron',        year: 'MLB · RF'  },
    { title: 'Ted Williams',      year: 'MLB · LF'  },
    { title: 'Lou Gehrig',        year: 'MLB · 1B'  },
    { title: 'Mickey Mantle',     year: 'MLB · CF'  },
    { title: 'Sandy Koufax',      year: 'MLB · P'   },
    { title: 'Walter Johnson',    year: 'MLB · P'   },
    { title: 'Cy Young',          year: 'MLB · P'   },
    { title: 'Barry Bonds',       year: 'MLB · LF'  },
    { title: 'Ken Griffey Jr.',   year: 'MLB · CF'  },
    { title: 'Derek Jeter',       year: 'MLB · SS'  },
    { title: 'Mike Trout',        year: 'MLB · CF'  },
    { title: 'Cal Ripken Jr.',    year: 'MLB · SS'  },
    { title: 'Honus Wagner',      year: 'MLB · SS'  },
  ],
  Football: [
    { title: 'Tom Brady',         year: 'NFL · QB'  },
    { title: 'Jerry Rice',        year: 'NFL · WR'  },
    { title: 'Jim Brown',         year: 'NFL · RB'  },
    { title: 'Lawrence Taylor',   year: 'NFL · LB'  },
    { title: 'Joe Montana',       year: 'NFL · QB'  },
    { title: 'Barry Sanders',     year: 'NFL · RB'  },
    { title: 'Reggie White',      year: 'NFL · DE'  },
    { title: 'Walter Payton',     year: 'NFL · RB'  },
    { title: 'Peyton Manning',    year: 'NFL · QB'  },
    { title: 'Emmitt Smith',      year: 'NFL · RB'  },
    { title: 'Patrick Mahomes',   year: 'NFL · QB'  },
    { title: 'Randy Moss',        year: 'NFL · WR'  },
    { title: 'Dan Marino',        year: 'NFL · QB'  },
    { title: 'Dick Butkus',       year: 'NFL · LB'  },
    { title: 'Johnny Unitas',     year: 'NFL · QB'  },
  ],
  Soccer: [
    { title: 'Lionel Messi',       year: 'Soccer · FW' },
    { title: 'Cristiano Ronaldo',  year: 'Soccer · FW' },
    { title: 'Pelé',               year: 'Soccer · FW' },
    { title: 'Diego Maradona',     year: 'Soccer · FW' },
    { title: 'Zinedine Zidane',    year: 'Soccer · MF' },
    { title: 'Ronaldo (Brazilian)',year: 'Soccer · FW' },
    { title: 'Johan Cruyff',       year: 'Soccer · FW' },
    { title: 'Ronaldinho',         year: 'Soccer · MF' },
    { title: 'Thierry Henry',      year: 'Soccer · FW' },
    { title: 'Franz Beckenbauer',  year: 'Soccer · DF' },
    { title: 'Kylian Mbappé',      year: 'Soccer · FW' },
    { title: 'Neymar',             year: 'Soccer · FW' },
    { title: 'Lev Yashin',         year: 'Soccer · GK' },
    { title: 'Michel Platini',     year: 'Soccer · MF' },
    { title: 'Erling Haaland',     year: 'Soccer · FW' },
  ],
  Hockey: [
    { title: 'Wayne Gretzky',    year: 'NHL · C'   },
    { title: 'Mario Lemieux',    year: 'NHL · C'   },
    { title: 'Gordie Howe',      year: 'NHL · RW'  },
    { title: 'Bobby Orr',        year: 'NHL · D'   },
    { title: 'Sidney Crosby',    year: 'NHL · C'   },
    { title: 'Maurice Richard',  year: 'NHL · RW'  },
    { title: 'Bobby Hull',       year: 'NHL · LW'  },
    { title: 'Mark Messier',     year: 'NHL · C'   },
    { title: 'Jaromír Jagr',     year: 'NHL · RW'  },
    { title: 'Martin Brodeur',   year: 'NHL · G'   },
    { title: 'Steve Yzerman',    year: 'NHL · C'   },
    { title: 'Phil Esposito',    year: 'NHL · C'   },
    { title: 'Guy Lafleur',      year: 'NHL · RW'  },
    { title: 'Patrick Roy',      year: 'NHL · G'   },
    { title: 'Ray Bourque',      year: 'NHL · D'   },
  ],
  Basketball: [
    { title: 'Michael Jordan',       year: 'NBA · SG' },
    { title: 'LeBron James',         year: 'NBA · SF' },
    { title: 'Kobe Bryant',          year: 'NBA · SG' },
    { title: 'Magic Johnson',        year: 'NBA · PG' },
    { title: 'Larry Bird',           year: 'NBA · SF' },
    { title: 'Kareem Abdul-Jabbar',  year: 'NBA · C'  },
    { title: 'Bill Russell',         year: 'NBA · C'  },
    { title: 'Wilt Chamberlain',     year: 'NBA · C'  },
    { title: 'Stephen Curry',        year: 'NBA · PG' },
    { title: 'Kevin Durant',         year: 'NBA · SF' },
    { title: 'Shaquille O\'Neal',    year: 'NBA · C'  },
    { title: 'Tim Duncan',           year: 'NBA · PF' },
    { title: 'Charles Barkley',      year: 'NBA · PF' },
    { title: 'Oscar Robertson',      year: 'NBA · PG' },
    { title: 'Hakeem Olajuwon',      year: 'NBA · C'  },
  ],
};

// Mixed list for unrecognized sport lists
const DEFAULT_SPORTS_MIXED: SearchResult[] = [
  ...DEFAULTS.Basketball.slice(0, 5),
  ...DEFAULTS.Football.slice(0, 5),
  ...DEFAULTS.Soccer.slice(0, 4),
  ...DEFAULTS.Baseball.slice(0, 4),
  ...DEFAULTS.Hockey.slice(0, 4),
  ...DEFAULTS.Tennis.slice(0, 4),
  ...DEFAULTS.Golf.slice(0, 4),
  { title: 'Usain Bolt',    year: 'Track & Field' },
  { title: 'Michael Phelps', year: 'Swimming'     },
  { title: 'Muhammad Ali',  year: 'Boxing'        },
];

// ── Sport detection from list title ───────────────────────────────────────────

function detectSport(title: string): string | null {
  const t = title.toLowerCase();
  if (/\bgolf|golfer|pga|masters\b/.test(t))                          return 'Golf';
  if (/\btennis|wimbledon|grand slam|atp|wta\b/.test(t))             return 'Tennis';
  if (/\bbaseball|mlb|pitcher|home run|world series\b/.test(t))      return 'Baseball';
  if (/\bnfl|football|quarterback|super bowl|rushing|passing\b/.test(t)) return 'Football';
  if (/\bsoccer|fifa|world cup goal|premier league|champions league\b/.test(t)) return 'Soccer';
  if (/\bhockey|nhl|stanley cup\b/.test(t))                          return 'Hockey';
  if (/\bbasketball|nba\b/.test(t))                                   return 'Basketball';
  return null;
}

// ── API fetch helpers ─────────────────────────────────────────────────────────

async function fetchPlayers(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/searchplayers.php?p=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.player ?? []).map((p: any) => ({
    title: p.strPlayer,
    imageUrl: p.strThumb || undefined,
    year: [p.strPosition, p.strTeam].filter(Boolean).join(' · ') || undefined,
  }));
}

async function fetchTeams(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.teams ?? []).map((t: any) => ({
    title: t.strTeam,
    imageUrl: t.strBadge || undefined,
    year: t.strLeague || undefined,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function searchSports(query: string, listTitle?: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    const sport = listTitle ? detectSport(listTitle) : null;
    return sport ? (DEFAULTS[sport] ?? DEFAULT_SPORTS_MIXED) : DEFAULT_SPORTS_MIXED;
  }

  const cacheKey = `sdb:${query.toLowerCase().trim()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const [playersResult, teamsResult] = await Promise.allSettled([
    fetchPlayers(query),
    fetchTeams(query),
  ]);

  const combined: SearchResult[] = [];
  if (playersResult.status === 'fulfilled') combined.push(...playersResult.value);
  if (teamsResult.status === 'fulfilled') combined.push(...teamsResult.value);

  const seen = new Set<string>();
  const results = combined.filter((r) => {
    const key = r.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);

  if (results.length > 0) cache.set(cacheKey, results);
  return results;
}
