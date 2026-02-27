import { SearchResult } from '../data/suggestions';

// Free key '3' works for basic queries; replace with a Patreon key for full search results.
const KEY = process.env.EXPO_PUBLIC_SPORTSDB_KEY ?? '3';
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

const cache = new Map<string, SearchResult[]>();

// Curated default list — shown when search field is empty.
// Covers all major sports with names users are most likely to add.
const DEFAULT_SPORTS: SearchResult[] = [
  // Basketball
  { title: 'Michael Jordan',      year: 'NBA · SG'  },
  { title: 'LeBron James',        year: 'NBA · SF'  },
  { title: 'Kobe Bryant',         year: 'NBA · SG'  },
  { title: 'Stephen Curry',       year: 'NBA · PG'  },
  { title: 'Kevin Durant',        year: 'NBA · SF'  },
  { title: 'Magic Johnson',       year: 'NBA · PG'  },
  { title: 'Kareem Abdul-Jabbar', year: 'NBA · C'   },
  { title: 'Shaquille O\'Neal',   year: 'NBA · C'   },
  // Football
  { title: 'Tom Brady',           year: 'NFL · QB'  },
  { title: 'Jerry Rice',          year: 'NFL · WR'  },
  { title: 'Patrick Mahomes',     year: 'NFL · QB'  },
  { title: 'Lawrence Taylor',     year: 'NFL · LB'  },
  { title: 'Barry Sanders',       year: 'NFL · RB'  },
  { title: 'Peyton Manning',      year: 'NFL · QB'  },
  { title: 'Joe Montana',         year: 'NFL · QB'  },
  // Soccer
  { title: 'Lionel Messi',        year: 'Soccer · FW' },
  { title: 'Cristiano Ronaldo',   year: 'Soccer · FW' },
  { title: 'Pelé',                year: 'Soccer · FW' },
  { title: 'Diego Maradona',      year: 'Soccer · FW' },
  { title: 'Zinedine Zidane',     year: 'Soccer · MF' },
  { title: 'Ronaldinho',          year: 'Soccer · MF' },
  // Baseball
  { title: 'Babe Ruth',           year: 'MLB · RF'  },
  { title: 'Willie Mays',         year: 'MLB · CF'  },
  { title: 'Hank Aaron',          year: 'MLB · RF'  },
  { title: 'Ted Williams',        year: 'MLB · LF'  },
  { title: 'Mike Trout',          year: 'MLB · CF'  },
  // Hockey
  { title: 'Wayne Gretzky',       year: 'NHL · C'   },
  { title: 'Mario Lemieux',       year: 'NHL · C'   },
  { title: 'Bobby Orr',           year: 'NHL · D'   },
  { title: 'Sidney Crosby',       year: 'NHL · C'   },
  // Tennis
  { title: 'Roger Federer',       year: 'Tennis'    },
  { title: 'Serena Williams',     year: 'Tennis'    },
  { title: 'Novak Djokovic',      year: 'Tennis'    },
  { title: 'Rafael Nadal',        year: 'Tennis'    },
  // Golf
  { title: 'Tiger Woods',         year: 'Golf'      },
  { title: 'Jack Nicklaus',       year: 'Golf'      },
  { title: 'Rory McIlroy',        year: 'Golf'      },
  // Other
  { title: 'Usain Bolt',          year: 'Track & Field' },
  { title: 'Michael Phelps',      year: 'Swimming'  },
  { title: 'Simone Biles',        year: 'Gymnastics'},
  { title: 'Muhammad Ali',        year: 'Boxing'    },
];

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

export async function searchSports(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return DEFAULT_SPORTS;

  const cacheKey = `sdb:${query.toLowerCase().trim()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const [playersResult, teamsResult] = await Promise.allSettled([
    fetchPlayers(query),
    fetchTeams(query),
  ]);

  const combined: SearchResult[] = [];
  if (playersResult.status === 'fulfilled') combined.push(...playersResult.value);
  if (teamsResult.status === 'fulfilled') combined.push(...teamsResult.value);

  // Deduplicate by lowercase title
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
