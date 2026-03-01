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
    { title: 'Empower Field at Mile High', year: 'Denver Broncos' },
    { title: 'NRG Stadium',                year: 'Houston Texans' },
    { title: 'Paycor Stadium',             year: 'Cincinnati Bengals' },
    { title: 'Acrisure Stadium',           year: 'Pittsburgh Steelers' },
    { title: 'Bank of America Stadium',    year: 'Carolina Panthers' },
    { title: 'Caesars Superdome',          year: 'New Orleans Saints' },
    { title: 'Commanders Field',           year: 'Washington Commanders' },
    { title: 'Ford Field',                 year: 'Detroit Lions' },
    { title: 'Highmark Stadium',           year: 'Buffalo Bills' },
    { title: 'Huntington Bank Field',      year: 'Cleveland Browns' },
    { title: 'Lumen Field',                year: 'Seattle Seahawks' },
    { title: 'Lucas Oil Stadium',          year: 'Indianapolis Colts' },
    { title: 'Mercedes-Benz Stadium',      year: 'Atlanta Falcons' },
    { title: 'Nissan Stadium',             year: 'Tennessee Titans' },
    { title: 'Raymond James Stadium',      year: 'Tampa Bay Buccaneers' },
    { title: 'State Farm Stadium',         year: 'Arizona Cardinals' },
    { title: 'U.S. Bank Stadium',          year: 'Minnesota Vikings' },
    { title: 'EverBank Stadium',           year: 'Jacksonville Jaguars' },
    { title: 'Wembley Stadium',            year: 'International Series' },
    { title: 'Tottenham Hotspur Stadium',  year: 'International Series' },
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
  'Golf Courses': [
    { title: 'Augusta National Golf Club',       year: 'Augusta, GA — Masters venue' },
    { title: 'Pebble Beach Golf Links',          year: 'Pebble Beach, CA' },
    { title: 'St Andrews Links (Old Course)',    year: 'St Andrews, Scotland — Home of Golf' },
    { title: 'Pinehurst No. 2',                  year: 'Pinehurst, NC — US Open venue' },
    { title: 'Cypress Point Club',               year: 'Pebble Beach, CA' },
    { title: 'Shinnecock Hills Golf Club',       year: 'Southampton, NY — US Open venue' },
    { title: 'Merion Golf Club (East)',          year: 'Ardmore, PA' },
    { title: 'Oakmont Country Club',             year: 'Oakmont, PA — US Open venue' },
    { title: 'Royal County Down',                year: 'Newcastle, Northern Ireland' },
    { title: 'Royal Portrush Golf Club',         year: 'Portrush, Northern Ireland' },
    { title: 'Muirfield',                        year: 'Gullane, Scotland — The Open venue' },
    { title: 'Carnoustie Golf Links',            year: 'Carnoustie, Scotland — The Open venue' },
    { title: 'Turnberry (Ailsa Course)',         year: 'Turnberry, Scotland' },
    { title: 'Royal Birkdale Golf Club',         year: 'Southport, England — The Open venue' },
    { title: 'Winged Foot Golf Club (West)',     year: 'Mamaroneck, NY — US Open venue' },
    { title: 'TPC Sawgrass (Stadium Course)',    year: 'Ponte Vedra Beach, FL — THE PLAYERS venue' },
    { title: 'Bethpage Black',                   year: 'Farmingdale, NY — US Open venue' },
    { title: 'Torrey Pines (South Course)',      year: 'La Jolla, CA' },
    { title: 'Whistling Straits',                year: 'Kohler, WI — Ryder Cup venue' },
    { title: 'Kiawah Island (Ocean Course)',     year: 'Kiawah Island, SC' },
    { title: 'Congressional Country Club (Blue)', year: 'Bethesda, MD — US Open venue' },
    { title: 'Quail Hollow Club',                year: 'Charlotte, NC — PGA Championship venue' },
    { title: 'Riviera Country Club',             year: 'Pacific Palisades, CA — Genesis Invitational' },
    { title: 'Medinah Country Club (No. 3)',     year: 'Medinah, IL — Ryder Cup venue' },
    { title: 'Seminole Golf Club',               year: 'Juno Beach, FL' },
    { title: 'Sand Hills Golf Club',             year: 'Mullen, NE' },
    { title: 'Pacific Dunes',                    year: 'Bandon, OR — Bandon Dunes Resort' },
    { title: 'Bandon Dunes Golf Course',         year: 'Bandon, OR' },
    { title: 'Crystal Downs Country Club',       year: 'Frankfort, MI' },
    { title: 'Chicago Golf Club',                year: 'Wheaton, IL — oldest 18-hole US course' },
    { title: 'Garden City Golf Club',            year: 'Garden City, NY' },
    { title: 'Prairie Dunes Country Club',       year: 'Hutchinson, KS' },
    { title: 'Los Angeles Country Club (North)', year: 'Los Angeles, CA — US Open 2023' },
    { title: 'Erin Hills',                       year: 'Erin, WI — US Open 2017' },
    { title: 'Harbour Town Golf Links',          year: 'Hilton Head Island, SC — RBC Heritage' },
    { title: 'Spyglass Hill Golf Course',        year: 'Pebble Beach, CA' },
    { title: 'Kapalua (Plantation Course)',      year: 'Maui, HI — Sentry Tournament' },
    { title: 'Amen Corner (Augusta National)',   year: 'Augusta, GA — holes 11–13' },
    { title: 'Royal Melbourne Golf Club (West)', year: 'Melbourne, Australia' },
    { title: 'Kingston Heath Golf Club',         year: 'Melbourne, Australia' },
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
    // The undisputed legends
    { title: 'Brazil 1970',              year: 'Pelé, Jairzinho, Rivelino' },
    { title: 'Netherlands 1974',         year: 'Cruyff & Total Football' },
    { title: 'Brazil 1958',              year: 'Pelé & Garrincha' },
    { title: 'France 1998',              year: 'Zidane, Henry, Desailly' },
    { title: 'Argentina 1986',           year: "Maradona's tournament" },
    { title: 'West Germany 1974',        year: 'Beckenbauer & Müller' },
    { title: 'Italy 1982',               year: 'Paolo Rossi & Zoff' },
    { title: 'Hungary 1954',             year: 'Puskás & the Golden Team' },
    { title: 'Brazil 1982',              year: 'Zico, Sócrates & Falcão' },
    { title: 'Argentina 2022',           year: "Messi's World Cup" },
    { title: 'Spain 2010',               year: 'Xavi, Iniesta, Villa' },
    { title: 'France 2018',              year: 'Mbappé, Griezmann, Kanté' },
    { title: 'Germany 2014',             year: 'Müller, Neuer, Kroos' },
    { title: 'Brazil 1994',              year: 'Romário & Bebeto' },
    { title: 'Italy 2006',               year: 'Cannavaro, Buffon, Pirlo' },
    // Early era champions & runners-up
    { title: 'Uruguay 1930',             year: 'Nasazzi, Cea — first champions' },
    { title: 'Argentina 1930',           year: 'Stábile — runners-up' },
    { title: 'Italy 1934',               year: 'Meazza, Schiavio — host winners' },
    { title: 'Czechoslovakia 1934',      year: 'Nejedlý — runners-up' },
    { title: 'Italy 1938',               year: 'Piola, Meazza — back-to-back' },
    { title: 'Hungary 1938',             year: 'Zsengellér, Sárosi — runners-up' },
    { title: 'Brazil 1938',              year: 'Leônidas da Silva — third place' },
    { title: 'Uruguay 1950',             year: 'Ghiggia, Schiaffino — Maracanazo' },
    { title: 'Brazil 1950',              year: 'Zizinho, Ademir — runners-up (host)' },
    { title: 'West Germany 1954',        year: 'Fritz Walter — Miracle of Bern' },
    // 1960s
    { title: 'Brazil 1962',              year: 'Garrincha, Amarildo — winners' },
    { title: 'Czechoslovakia 1962',      year: 'Masopust — runners-up' },
    { title: 'England 1966',             year: 'Moore, Charlton, Hurst — host winners' },
    { title: 'West Germany 1966',        year: 'Seeler, Beckenbauer — runners-up' },
    { title: 'Portugal 1966',            year: 'Eusébio (9 goals) — third place' },
    { title: 'Soviet Union 1966',        year: 'Yashin — fourth place' },
    { title: 'North Korea 1966',         year: 'Beat Italy — giant killers' },
    // 1970s
    { title: 'Italy 1970',               year: 'Riva, Rivera, Mazzola — runners-up' },
    { title: 'West Germany 1970',        year: 'Müller, Beckenbauer — third place' },
    { title: 'Poland 1974',              year: 'Lato, Szarmach — third place' },
    { title: 'Argentina 1978',           year: 'Kempes, Ardiles — host winners' },
    { title: 'Netherlands 1978',         year: 'Rensenbrink, Rep — runners-up' },
    { title: 'Brazil 1978',              year: 'Zico, Cerezo — third place' },
    { title: 'Italy 1978',               year: 'Rossi, Zoff — fourth place' },
    // 1980s
    { title: 'West Germany 1982',        year: 'Rummenigge, Breitner — runners-up' },
    { title: 'Poland 1982',              year: 'Boniek — third place' },
    { title: 'France 1982',              year: 'Platini, Tigana, Giresse' },
    { title: 'West Germany 1986',        year: 'Rummenigge, Matthäus — runners-up' },
    { title: 'France 1986',              year: 'Platini — third place' },
    { title: 'Brazil 1986',              year: 'Sócrates, Zico, Careca' },
    { title: 'Belgium 1986',             year: 'Pfaff, Ceulemans — fourth place' },
    { title: 'West Germany 1990',        year: 'Matthäus, Klinsmann, Brehme — winners' },
    { title: 'Argentina 1990',           year: "Maradona, Caniggia — runners-up" },
    { title: 'Italy 1990',               year: 'Schillaci (host) — third place' },
    { title: 'England 1990',             year: 'Lineker, Gascoigne — semi-finals' },
    // 1990s
    { title: 'Italy 1994',               year: "Baggio's penalty — runners-up" },
    { title: 'Bulgaria 1994',            year: 'Stoichkov — fourth place' },
    { title: 'Romania 1994',             year: 'Hagi, Dumitrescu — quarter-finals' },
    { title: 'Netherlands 1994',         year: 'Bergkamp, Rijkaard, Gullit' },
    { title: 'Brazil 1998',              year: 'Ronaldo, Rivaldo — runners-up' },
    { title: 'Croatia 1998',             year: 'Šuker (Golden Boot) — third place' },
    { title: 'Netherlands 1998',         year: 'Bergkamp, Seedorf — fourth place' },
    { title: 'Italy 1998',               year: 'Del Piero, Maldini — quarter-finals' },
    // 2000s
    { title: 'Brazil 2002',              year: 'Ronaldo, Ronaldinho, Rivaldo — winners' },
    { title: 'Germany 2002',             year: 'Kahn, Ballack, Klose — runners-up' },
    { title: 'South Korea 2002',         year: 'Park Ji-sung — semi-finals (host)' },
    { title: 'Senegal 2002',             year: 'El-Hadji Diouf — quarter-finals' },
    { title: 'Turkey 2002',              year: 'Hakan Şükür — third place' },
    { title: 'Germany 2006',             year: 'Klose, Podolski, Ballack — third (host)' },
    { title: 'France 2006',              year: "Zidane's last game — runners-up" },
    { title: 'Portugal 2006',            year: 'Figo, Cristiano, Deco — fourth place' },
    { title: 'Brazil 2006',              year: 'Ronaldo, Ronaldinho, Kaká' },
    // 2010s
    { title: 'Netherlands 2010',         year: 'Robben, Sneijder, Van Persie — runners-up' },
    { title: 'Germany 2010',             year: 'Müller (5 goals), Klose' },
    { title: 'Uruguay 2010',             year: 'Forlán, Suárez — fourth place' },
    { title: 'Argentina 2014',           year: 'Messi, Di María, Higuaín — runners-up' },
    { title: 'Brazil 2014',              year: 'Neymar, Oscar — fourth (host, 7-1 loss)' },
    { title: 'Netherlands 2014',         year: 'Van Persie, Robben — third place' },
    { title: 'Colombia 2014',            year: 'James Rodríguez (Golden Boot)' },
    { title: 'Croatia 2018',             year: 'Modric, Rakitic — runners-up' },
    { title: 'Belgium 2018',             year: 'De Bruyne, Hazard, Lukaku — third' },
    { title: 'England 2018',             year: 'Kane (Golden Boot) — fourth place' },
    { title: 'Uruguay 2018',             year: 'Suárez, Cavani — quarter-finals' },
    // 2022
    { title: 'France 2022',              year: 'Mbappé (8 goals) — runners-up' },
    { title: 'Morocco 2022',             year: 'Bounou, En-Nesyri — first African SF' },
    { title: 'Croatia 2022',             year: 'Modric, Gvardiol — third place' },
    { title: 'Netherlands 2022',         year: 'Virgil van Dijk, Depay' },
    { title: 'Brazil 2022',              year: 'Vinícius Jr., Richarlison, Neymar' },
    { title: 'England 2022',             year: 'Bellingham, Kane — quarter-finals' },
    { title: 'Portugal 2022',            year: 'Cristiano, Félix — quarter-finals' },
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
  // Golf courses vs golfers
  if (/\bgolf.course|golf.courses|course.*golf|links\b/.test(t))      return 'Golf Courses';
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

// Sports lists that are purely static — typed queries filter the local list, not the API
const STATIC_SPORTS = ['NFL Stadiums', 'Baseball Teams', 'NHL Teams', 'NBA Teams', 'World Cup Teams', 'Golf Courses'];

export async function searchSports(query: string, listTitle?: string): Promise<SearchResult[]> {
  const sport = listTitle ? detectSport(listTitle) : null;

  if (!query.trim()) {
    return sport ? (DEFAULTS[sport] ?? DEFAULT_SPORTS_MIXED) : DEFAULT_SPORTS_MIXED;
  }

  // Venue/team lists: filter the static defaults list locally; the API has no stadium data
  if (sport && STATIC_SPORTS.includes(sport)) {
    const q = query.toLowerCase();
    return (DEFAULTS[sport] ?? []).filter(
      (r) => r.title.toLowerCase().includes(q) || (r.year ?? '').toLowerCase().includes(q)
    );
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
