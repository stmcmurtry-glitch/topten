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

const cache = new Map<string, SearchResult[]>();

export async function searchMusic(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return DEFAULT_ARTISTS.map((name) => ({ title: name }));
  }

  const key = `music:${query.toLowerCase().trim()}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    // Search artists and recordings in parallel
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
          title: artist ? `${r.title} — ${artist}` : r.title,
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
    // Fall back to filtering static list
    const q = query.toLowerCase();
    return DEFAULT_ARTISTS
      .filter((a) => a.toLowerCase().includes(q))
      .map((title) => ({ title }));
  }
}
