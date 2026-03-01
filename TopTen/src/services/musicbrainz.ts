import { SearchResult } from '../data/suggestions';

const BASE_URL = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'TopTenApp/1.0 (toptenapp@gmail.com)';

const DEFAULT_ARTISTS: string[] = [
  // Rock
  'The Beatles', 'Led Zeppelin', 'The Rolling Stones', 'Pink Floyd', 'Queen',
  'Nirvana', 'Radiohead', 'U2', 'David Bowie', 'The Who', 'Jimi Hendrix',
  'Fleetwood Mac', 'Eagles', 'Bruce Springsteen', 'AC/DC', 'Guns N\'Roses',
  'Metallica', 'Pearl Jam', 'The Doors', 'R.E.M.',
  // Pop
  'Michael Jackson', 'Madonna', 'Prince', 'Whitney Houston', 'Beyoncé',
  'Taylor Swift', 'Adele', 'Lady Gaga', 'Rihanna', 'Justin Timberlake',
  'Mariah Carey', 'Britney Spears', 'Katy Perry', 'Ed Sheeran', 'Billie Eilish',
  'Ariana Grande', 'Bruno Mars', 'Harry Styles',
  // Hip-Hop
  'Jay-Z', 'Kendrick Lamar', 'Eminem', 'Drake', 'Tupac Shakur',
  'The Notorious B.I.G.', 'Nas', 'Kanye West', 'J. Cole', 'Lil Wayne',
  'Snoop Dogg', 'Ice Cube', 'Wu-Tang Clan', 'A Tribe Called Quest',
  'Outkast', 'Nicki Minaj', 'Cardi B', 'Travis Scott',
  // R&B / Soul
  'Stevie Wonder', 'Marvin Gaye', 'Aretha Franklin', 'James Brown',
  'Ray Charles', 'Sam Cooke', 'Otis Redding', 'Al Green', 'Frank Ocean',
  'The Weeknd', 'Usher', 'Alicia Keys', 'John Legend',
  // Jazz
  'Miles Davis', 'John Coltrane', 'Duke Ellington', 'Louis Armstrong',
  'Charlie Parker', 'Thelonious Monk', 'Billie Holiday', 'Ella Fitzgerald',
  'Chet Baker', 'Dave Brubeck',
  // Classical
  'Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Johann Sebastian Bach',
  'Frédéric Chopin', 'Claude Debussy', 'Pyotr Ilyich Tchaikovsky',
  // Electronic / Dance
  'Daft Punk', 'The Chemical Brothers', 'Aphex Twin', 'Kraftwerk',
  'Calvin Harris', 'David Guetta', 'Deadmau5', 'Disclosure',
  // Country
  'Johnny Cash', 'Dolly Parton', 'Willie Nelson', 'Garth Brooks',
  'Shania Twain', 'Kenny Rogers', 'Hank Williams',
  // Latin
  'Carlos Santana', 'Shakira', 'Bad Bunny', 'J Balvin', 'Daddy Yankee',
  // Other
  'Bob Dylan', 'Elton John', 'Bob Marley', 'Frank Sinatra', 'Tony Bennett',
  'Amy Winehouse', 'Adele', 'Sam Smith', 'Coldplay', 'Imagine Dragons',
];

// Keywords that indicate the list is about songs/tracks rather than artists
const SONG_KEYWORDS = ['song', 'songs', 'track', 'tracks', 'single', 'singles', 'hit', 'hits', 'anthem', 'anthems'];
const ALBUM_KEYWORDS = ['album', 'albums', 'record', 'records', 'lp', 'lps', 'discography', 'debut'];

function isSongList(listTitle?: string): boolean {
  if (!listTitle) return false;
  const t = listTitle.toLowerCase();
  return SONG_KEYWORDS.some((kw) => t.includes(kw));
}

function isAlbumList(listTitle?: string): boolean {
  if (!listTitle) return false;
  const t = listTitle.toLowerCase();
  return ALBUM_KEYWORDS.some((kw) => t.includes(kw));
}

const DEFAULT_ALBUMS: SearchResult[] = [
  { title: 'Sgt. Pepper\'s Lonely Hearts Club Band', year: 'The Beatles · 1967' },
  { title: 'Pet Sounds',                             year: 'The Beach Boys · 1966' },
  { title: 'Revolver',                               year: 'The Beatles · 1966' },
  { title: 'Abbey Road',                             year: 'The Beatles · 1969' },
  { title: 'The Dark Side of the Moon',              year: 'Pink Floyd · 1973' },
  { title: 'Rumours',                                year: 'Fleetwood Mac · 1977' },
  { title: 'What\'s Going On',                       year: 'Marvin Gaye · 1971' },
  { title: 'Kind of Blue',                           year: 'Miles Davis · 1959' },
  { title: 'Purple Rain',                            year: 'Prince · 1984' },
  { title: 'Thriller',                               year: 'Michael Jackson · 1982' },
  { title: 'Born to Run',                            year: 'Bruce Springsteen · 1975' },
  { title: 'Nevermind',                              year: 'Nirvana · 1991' },
  { title: 'OK Computer',                            year: 'Radiohead · 1997' },
  { title: 'Led Zeppelin IV',                        year: 'Led Zeppelin · 1971' },
  { title: 'Exile on Main St.',                      year: 'The Rolling Stones · 1972' },
  { title: 'Highway 61 Revisited',                   year: 'Bob Dylan · 1965' },
  { title: 'Blonde on Blonde',                       year: 'Bob Dylan · 1966' },
  { title: 'The White Album',                        year: 'The Beatles · 1968' },
  { title: 'A Love Supreme',                         year: 'John Coltrane · 1965' },
  { title: 'Innervisions',                           year: 'Stevie Wonder · 1973' },
  { title: 'Songs in the Key of Life',               year: 'Stevie Wonder · 1976' },
  { title: 'The Joshua Tree',                        year: 'U2 · 1987' },
  { title: 'Achtung Baby',                           year: 'U2 · 1991' },
  { title: 'Tapestry',                               year: 'Carole King · 1971' },
  { title: 'Blue',                                   year: 'Joni Mitchell · 1971' },
  { title: 'Court and Spark',                        year: 'Joni Mitchell · 1974' },
  { title: 'Astral Weeks',                           year: 'Van Morrison · 1968' },
  { title: 'Electric Ladyland',                      year: 'Jimi Hendrix · 1968' },
  { title: 'Are You Experienced',                    year: 'Jimi Hendrix · 1967' },
  { title: 'Wish You Were Here',                     year: 'Pink Floyd · 1975' },
  { title: 'The Wall',                               year: 'Pink Floyd · 1979' },
  { title: 'London Calling',                         year: 'The Clash · 1979' },
  { title: 'Never Mind the Bollocks',                year: 'Sex Pistols · 1977' },
  { title: 'The Velvet Underground & Nico',          year: 'The Velvet Underground · 1967' },
  { title: 'Marquee Moon',                           year: 'Television · 1977' },
  { title: 'Remain in Light',                        year: 'Talking Heads · 1980' },
  { title: 'Fear of Music',                          year: 'Talking Heads · 1979' },
  { title: 'Appetite for Destruction',               year: 'Guns N\'Roses · 1987' },
  { title: 'Master of Puppets',                      year: 'Metallica · 1986' },
  { title: 'The Black Album',                        year: 'Metallica · 1991' },
  { title: 'Ten',                                    year: 'Pearl Jam · 1991' },
  { title: 'Vs.',                                    year: 'Pearl Jam · 1993' },
  { title: 'In Utero',                               year: 'Nirvana · 1993' },
  { title: 'The Bends',                              year: 'Radiohead · 1995' },
  { title: 'Kid A',                                  year: 'Radiohead · 2000' },
  { title: 'Discovery',                              year: 'Daft Punk · 2001' },
  { title: 'Random Access Memories',                 year: 'Daft Punk · 2013' },
  { title: '21',                                     year: 'Adele · 2011' },
  { title: '25',                                     year: 'Adele · 2015' },
  { title: 'Lemonade',                               year: 'Beyoncé · 2016' },
  { title: 'Fearless',                               year: 'Taylor Swift · 2008' },
  { title: '1989',                                   year: 'Taylor Swift · 2014' },
  { title: 'Midnights',                              year: 'Taylor Swift · 2022' },
  { title: 'good kid, m.A.A.d city',                 year: 'Kendrick Lamar · 2012' },
  { title: 'To Pimp a Butterfly',                    year: 'Kendrick Lamar · 2015' },
  { title: 'The Marshall Mathers LP',                year: 'Eminem · 2000' },
  { title: 'The Chronic',                            year: 'Dr. Dre · 1992' },
  { title: 'Illmatic',                               year: 'Nas · 1994' },
  { title: 'Reasonable Doubt',                       year: 'Jay-Z · 1996' },
  { title: 'Ready to Die',                           year: 'The Notorious B.I.G. · 1994' },
  { title: 'Me Against the World',                   year: 'Tupac · 1995' },
  { title: 'All Eyez on Me',                         year: 'Tupac · 1996' },
  { title: 'My Beautiful Dark Twisted Fantasy',      year: 'Kanye West · 2010' },
  { title: 'The College Dropout',                    year: 'Kanye West · 2004' },
  { title: 'If You\'re Reading This It\'s Too Late', year: 'Drake · 2015' },
  { title: 'Channel Orange',                         year: 'Frank Ocean · 2012' },
  { title: 'Blonde',                                 year: 'Frank Ocean · 2016' },
  { title: 'After Hours',                            year: 'The Weeknd · 2020' },
  { title: 'Back in Black',                          year: 'AC/DC · 1980' },
  { title: 'Paranoid',                               year: 'Black Sabbath · 1970' },
  { title: 'Boston',                                 year: 'Boston · 1976' },
  { title: 'Hotel California',                       year: 'Eagles · 1976' },
];

const DEFAULT_SONGS: SearchResult[] = [
  { title: 'Bohemian Rhapsody',          year: 'Queen' },
  { title: 'Stairway to Heaven',          year: 'Led Zeppelin' },
  { title: 'Imagine',                     year: 'John Lennon' },
  { title: 'Like a Rolling Stone',        year: 'Bob Dylan' },
  { title: 'Smells Like Teen Spirit',     year: 'Nirvana' },
  { title: 'Purple Haze',                 year: 'Jimi Hendrix' },
  { title: 'What\'s Going On',            year: 'Marvin Gaye' },
  { title: 'Respect',                     year: 'Aretha Franklin' },
  { title: 'Hotel California',            year: 'Eagles' },
  { title: 'Born to Run',                 year: 'Bruce Springsteen' },
  { title: 'Good Vibrations',             year: 'The Beach Boys' },
  { title: 'A Change Is Gonna Come',      year: 'Sam Cooke' },
  { title: 'Johnny B. Goode',             year: 'Chuck Berry' },
  { title: 'Hey Jude',                    year: 'The Beatles' },
  { title: 'Yesterday',                   year: 'The Beatles' },
  { title: 'Let It Be',                   year: 'The Beatles' },
  { title: 'Purple Rain',                 year: 'Prince' },
  { title: 'Superstition',                year: 'Stevie Wonder' },
  { title: 'Billie Jean',                 year: 'Michael Jackson' },
  { title: 'Thriller',                    year: 'Michael Jackson' },
  { title: 'London Calling',              year: 'The Clash' },
  { title: 'Waterloo Sunset',             year: 'The Kinks' },
  { title: 'Papa\'s Got a Brand New Bag', year: 'James Brown' },
  { title: 'God Only Knows',              year: 'The Beach Boys' },
  { title: 'Satisfaction',               year: 'The Rolling Stones' },
  { title: 'Sympathy for the Devil',      year: 'The Rolling Stones' },
  { title: 'Comfortably Numb',            year: 'Pink Floyd' },
  { title: 'Wish You Were Here',          year: 'Pink Floyd' },
  { title: 'One',                         year: 'U2' },
  { title: 'With or Without You',         year: 'U2' },
  { title: 'Creep',                       year: 'Radiohead' },
  { title: 'Everlong',                    year: 'Foo Fighters' },
  { title: 'Black',                       year: 'Pearl Jam' },
  { title: 'Under the Bridge',            year: 'Red Hot Chili Peppers' },
  { title: 'Enter Sandman',               year: 'Metallica' },
  { title: 'Nothing Else Matters',        year: 'Metallica' },
  { title: 'Sweet Child O\' Mine',        year: 'Guns N\'Roses' },
  { title: 'November Rain',               year: 'Guns N\'Roses' },
  { title: 'Dream On',                    year: 'Aerosmith' },
  { title: 'Jump',                        year: 'Van Halen' },
  { title: 'Black Dog',                   year: 'Led Zeppelin' },
  { title: 'Whole Lotta Love',            year: 'Led Zeppelin' },
  { title: 'Light My Fire',               year: 'The Doors' },
  { title: 'People Are Strange',          year: 'The Doors' },
  { title: 'Space Oddity',                year: 'David Bowie' },
  { title: 'Heroes',                      year: 'David Bowie' },
  { title: 'We Will Rock You',            year: 'Queen' },
  { title: 'Don\'t Stop Me Now',          year: 'Queen' },
  { title: 'Dancing Queen',               year: 'ABBA' },
  { title: 'Take On Me',                  year: 'a-ha' },
  { title: 'Girls Just Want to Have Fun', year: 'Cyndi Lauper' },
  { title: 'Material Girl',               year: 'Madonna' },
  { title: 'Like a Prayer',               year: 'Madonna' },
  { title: 'Beat It',                     year: 'Michael Jackson' },
  { title: 'I Will Always Love You',      year: 'Whitney Houston' },
  { title: 'I Want to Dance with Somebody', year: 'Whitney Houston' },
  { title: 'Crazy in Love',               year: 'Beyoncé' },
  { title: 'Halo',                        year: 'Beyoncé' },
  { title: 'Rolling in the Deep',         year: 'Adele' },
  { title: 'Someone Like You',            year: 'Adele' },
  { title: 'Shake It Off',                year: 'Taylor Swift' },
  { title: 'Anti-Hero',                   year: 'Taylor Swift' },
  { title: 'Bad Guy',                     year: 'Billie Eilish' },
  { title: 'Uptown Funk',                 year: 'Bruno Mars' },
  { title: 'Shape of You',                year: 'Ed Sheeran' },
  { title: 'HUMBLE.',                     year: 'Kendrick Lamar' },
  { title: 'Lose Yourself',               year: 'Eminem' },
  { title: 'Nuthin\' But a G Thang',      year: 'Dr. Dre' },
  { title: 'Juicy',                       year: 'The Notorious B.I.G.' },
  { title: 'Changes',                     year: 'Tupac Shakur' },
  { title: 'Empire State of Mind',        year: 'Jay-Z ft. Alicia Keys' },
  { title: 'Gold Digger',                 year: 'Kanye West' },
  { title: 'God\'s Plan',                 year: 'Drake' },
  { title: 'Redbone',                     year: 'Childish Gambino' },
  { title: 'Tennessee Whiskey',           year: 'Chris Stapleton' },
  { title: 'Ring of Fire',                year: 'Johnny Cash' },
  { title: 'Jolene',                      year: 'Dolly Parton' },
  { title: 'Blinding Lights',             year: 'The Weeknd' },
  { title: 'Levitating',                  year: 'Dua Lipa' },
];

const cache = new Map<string, SearchResult[]>();

export async function searchMusic(query: string, listTitle?: string): Promise<SearchResult[]> {
  const songList = isSongList(listTitle);
  const albumList = !songList && isAlbumList(listTitle);

  if (!query.trim()) {
    if (songList)  return DEFAULT_SONGS;
    if (albumList) return DEFAULT_ALBUMS;
    return DEFAULT_ARTISTS.map((name) => ({ title: name }));
  }

  const key = `music:${songList ? 'songs:' : albumList ? 'albums:' : ''}${query.toLowerCase().trim()}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    if (songList) {
      // Song list: use iTunes Search API — popularity-ranked, no key needed
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25&media=music`
      );
      if (!res.ok) throw new Error('iTunes search failed');
      const data = await res.json();
      const results: SearchResult[] = (data.results ?? []).map((r: any) => ({
        title: r.trackName,
        year: r.artistName && r.collectionName
          ? `${r.artistName} · ${r.collectionName}`
          : r.artistName,
      }));
      cache.set(key, results);
      return results;
    }

    if (albumList) {
      // Album list: use iTunes Search API with entity=album
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=25&media=music`
      );
      if (!res.ok) throw new Error('iTunes album search failed');
      const data = await res.json();
      const results: SearchResult[] = (data.results ?? []).map((r: any) => ({
        title: r.collectionName,
        year: r.artistName ? `${r.artistName} · ${new Date(r.releaseDate).getFullYear()}` : undefined,
      }));
      cache.set(key, results);
      return results;
    }

    // Artist list: search artists and recordings in parallel
    const [artistRes, recordingRes] = await Promise.all([
      fetch(
        `${BASE_URL}/artist?query=${encodeURIComponent(query)}&limit=10&fmt=json`,
        { headers: { 'User-Agent': USER_AGENT } }
      ),
      fetch(
        `${BASE_URL}/recording?query=${encodeURIComponent(query)}&limit=10&fmt=json`,
        { headers: { 'User-Agent': USER_AGENT } }
      ),
    ]);

    const artists: SearchResult[] = [];
    const recordings: SearchResult[] = [];

    if (artistRes.ok) {
      const data = await artistRes.json();
      (data.artists ?? []).forEach((a: any) => {
        artists.push({ title: a.name });
      });
    }

    if (recordingRes.ok) {
      const data = await recordingRes.json();
      (data.recordings ?? []).forEach((r: any) => {
        const artist = r['artist-credit']?.[0]?.artist?.name;
        recordings.push({
          title: r.title,
          year: artist,
        });
      });
    }

    // Interleave: artist, song, artist, song...
    const results: SearchResult[] = [];
    const max = Math.max(artists.length, recordings.length);
    for (let i = 0; i < max; i++) {
      if (artists[i]) results.push(artists[i]);
      if (recordings[i]) results.push(recordings[i]);
    }

    cache.set(key, results);
    return results;
  } catch {
    const q = query.toLowerCase();
    if (songList) {
      return DEFAULT_SONGS.filter(
        (s) => s.title.toLowerCase().includes(q) || (s.year ?? '').toLowerCase().includes(q)
      );
    }
    if (albumList) {
      return DEFAULT_ALBUMS.filter(
        (a) => a.title.toLowerCase().includes(q) || (a.year ?? '').toLowerCase().includes(q)
      );
    }
    return DEFAULT_ARTISTS
      .filter((a) => a.toLowerCase().includes(q))
      .map((title) => ({ title }));
  }
}
