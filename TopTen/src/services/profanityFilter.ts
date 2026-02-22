// Common profanity/slur list — lowercase, matched at word boundaries
const BLOCKED_WORDS: string[] = [
  'fuck', 'shit', 'ass', 'asshole', 'bitch', 'bastard', 'cunt', 'dick',
  'cock', 'pussy', 'prick', 'twat', 'wanker', 'whore', 'slut', 'fag',
  'faggot', 'dyke', 'nigger', 'nigga', 'kike', 'spic', 'chink', 'gook',
  'wetback', 'cracker', 'honky', 'raghead', 'towelhead', 'spook', 'coon',
  'jigaboo', 'darkie', 'paki', 'wop', 'dago', 'kraut', 'gypsy', 'tranny',
  'retard', 'retarded', 'spaz', 'moron', 'idiot', 'imbecile', 'cripple',
  'midget', 'beaner', 'gringo', 'zipperhead', 'slope', 'squaw', 'redskin',
  'injun', 'porchmonkey', 'sambo', 'pickaninny', 'mulatto', 'octoroon',
  'jiggaboo', 'shemale', 'heshe', 'buttfuck', 'motherfucker', 'motherfucking',
  'cocksucker', 'bullshit', 'horseshit', 'dipshit', 'fuckhead', 'shithead',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`);
    return regex.test(lower);
  });
}
