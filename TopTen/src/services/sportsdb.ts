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

  'NFL Stadiums': [
    { title: 'Lambeau Field',              year: 'Green Bay Packers' },
    { title: 'Arrowhead Stadium',          year: 'Kansas City Chiefs' },
    { title: 'Soldier Field',              year: 'Chicago Bears' },
    { title: 'AT&T Stadium',              year: 'Dallas Cowboys' },
    { title: 'Allegiant Stadium',          year: 'Las Vegas Raiders' },
    { title: 'SoFi Stadium',              year: 'LA Rams / Chargers' },
    { title: 'Lincoln Financial Field',    year: 'Philadelphia Eagles' },
    { title: 'Hard Rock Stadium',          year: 'Miami Dolphins' },
    { title: 'Gillette Stadium',           year: 'New England Patriots' },
    { title: 'MetLife Stadium',            year: 'NY Giants / Jets' },
    { title: 'Levi\'s Stadium',            year: 'San Francisco 49ers' },
    { title: 'M&T Bank Stadium',           year: 'Baltimore Ravens' },
    { title: 'Empower Field',              year: 'Denver Broncos' },
    { title: 'NRG Stadium',                year: 'Houston Texans' },
    { title: 'Paycor Stadium',             year: 'Cincinnati Bengals' },
  ],
  'Baseball Teams': [
    { title: '1927 New York Yankees',                  year: 'MLB · 110-44' },
    { title: '1998 New York Yankees',                  year: 'MLB · 114-48' },
    { title: '1976 Cincinnati Reds (Big Red Machine)', year: 'MLB · 102-60' },
    { title: '1906 Chicago Cubs',                      year: 'MLB · 116-36' },
    { title: '2001 Seattle Mariners',                  year: 'MLB · 116-46' },
    { title: '1961 New York Yankees',                  year: 'MLB · 109-53' },
    { title: '1969 New York Mets (Miracle Mets)',      year: 'MLB · 100-62' },
    { title: '1986 New York Mets',                     year: 'MLB · 108-54' },
    { title: '1995 Atlanta Braves',                    year: 'MLB · 90-54' },
    { title: '1975 Cincinnati Reds',                   year: 'MLB · 108-54' },
    { title: '2017 Houston Astros',                    year: 'MLB · 101-61' },
    { title: '2022 Los Angeles Dodgers',               year: 'MLB · 111-51' },
    { title: '1939 New York Yankees',                  year: 'MLB · 106-45' },
    { title: '1969 Baltimore Orioles',                 year: 'MLB · 109-53' },
    { title: '1902 Pittsburgh Pirates',                year: 'MLB · 103-36' },
  ],
  'NHL Teams': [
    { title: '1976-77 Montreal Canadiens',    year: 'NHL · 60-8-12' },
    { title: '1995-96 Detroit Red Wings',     year: 'NHL · 62-13-7' },
    { title: '1983-84 Edmonton Oilers',       year: 'NHL · 57-18-5' },
    { title: '1971-72 Boston Bruins',         year: 'NHL · 54-13-11' },
    { title: '1977-78 Montreal Canadiens',    year: 'NHL · 59-10-11' },
    { title: '1984-85 Edmonton Oilers',       year: 'NHL · 49-20-11' },
    { title: '1991-92 Pittsburgh Penguins',   year: 'NHL · 39-32-9' },
    { title: '2022-23 Boston Bruins',         year: 'NHL · 65-12-5' },
    { title: '1986-87 Edmonton Oilers',       year: 'NHL · 50-24-6' },
    { title: '2018-19 Tampa Bay Lightning',   year: 'NHL · 62-16-4' },
    { title: '1929-30 Boston Bruins',         year: 'NHL · 38-5-1' },
    { title: '2015-16 Washington Capitals',   year: 'NHL · 56-18-8' },
    { title: '1973-74 Philadelphia Flyers',   year: 'NHL · 50-16-12' },
    { title: '1996-97 Colorado Avalanche',    year: 'NHL · 49-24-9' },
    { title: '2009-10 Washington Capitals',   year: 'NHL · 54-15-13' },
  ],
  'NBA Teams': [
    { title: '1995-96 Chicago Bulls',              year: 'NBA · 72-10' },
    { title: '2015-16 Golden State Warriors',       year: 'NBA · 73-9' },
    { title: '1971-72 Los Angeles Lakers',          year: 'NBA · 69-13' },
    { title: '1966-67 Philadelphia 76ers',          year: 'NBA · 68-13' },
    { title: '1985-86 Boston Celtics',              year: 'NBA · 67-15' },
    { title: '2016-17 Golden State Warriors',       year: 'NBA · 67-15' },
    { title: '1982-83 Philadelphia 76ers',          year: 'NBA · 65-17' },
    { title: '2012-13 Miami Heat',                  year: 'NBA · 66-16' },
    { title: '1986-87 Los Angeles Lakers',          year: 'NBA · 65-17' },
    { title: '1996-97 Chicago Bulls',               year: 'NBA · 69-13' },
    { title: '2016-17 San Antonio Spurs',           year: 'NBA · 61-21' },
    { title: '1991-92 Chicago Bulls',               year: 'NBA · 67-15' },
    { title: '1999-00 Los Angeles Lakers',          year: 'NBA · 67-15' },
    { title: '2017-18 Golden State Warriors',       year: 'NBA · 58-24' },
    { title: '1986-87 Boston Celtics',              year: 'NBA · 59-23' },
  ],
  'World Cup Teams': [
    { title: 'Brazil 1970',       year: 'Pelé, Jairzinho, Rivelino' },
    { title: 'Netherlands 1974',  year: 'Cruyff & Total Football' },
    { title: 'Brazil 1958',       year: 'Pelé & Garrincha' },
    { title: 'France 1998',       year: 'Zidane, Henry, Desailly' },
    { title: 'Argentina 1986',    year: 'Maradona\'s tournament' },
    { title: 'Germany 1974',      year: 'Beckenbauer & Müller' },
    { title: 'Italy 1982',        year: 'Paolo Rossi & Zoff' },
    { title: 'Hungary 1954',      year: 'Puskás & the Golden Team' },
    { title: 'Brazil 1982',       year: 'Zico, Sócrates & Falcão' },
    { title: 'Argentina 2022',    year: 'Messi\'s World Cup' },
    { title: 'Spain 2010',        year: 'Xavi, Iniesta, Villa' },
    { title: 'France 2018',       year: 'Mbappé, Griezmann, Kanté' },
    { title: 'Germany 2014',      year: 'Müller, Neuer, Kroos' },
    { title: 'Brazil 1994',       year: 'Romário & Bebeto' },
    { title: 'Italy 2006',        year: 'Cannavaro, Buffon, Pirlo' },
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
  // Team / venue lists — check before generic sport keywords
  if (/\bstadium|stadiums|arena|arenas|venue\b/.test(t))             return 'NFL Stadiums';
  if (/\bworld cup team|world cup squad\b/.test(t))                  return 'World Cup Teams';
  if (/\bsingle.season\b.*\bbaseball\b|\bbaseball\b.*\bsingle.season\b/.test(t)) return 'Baseball Teams';
  if (/\bsingle.season\b.*\bnhl\b|\bnhl\b.*\bsingle.season\b/.test(t))           return 'NHL Teams';
  if (/\bsingle.season\b.*\bnba\b|\bnba\b.*\bsingle.season\b/.test(t))           return 'NBA Teams';
  // Individual player lists
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
