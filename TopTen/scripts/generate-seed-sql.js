const fs = require('fs');
let content = fs.readFileSync(__dirname + '/../src/data/communityLists.ts', 'utf8');

// Replace escaped quotes so they don't break parsing
content = content.replace(/\\'/g, '__ESC__');

const results = [];
const listRegex = /id: '(community-[^']+)',[\s\S]*?participantCount: (\d+),[\s\S]*?items: \[([\s\S]*?)\],\n  \}/g;

let match;
while ((match = listRegex.exec(content)) !== null) {
  const listId = match[1];
  const participantCount = parseInt(match[2]);
  const itemsBlock = match[3];

  if (participantCount === 0) continue;

  const items = [];
  const itemMatches = [...itemsBlock.matchAll(/title: '([^']+)'.*?seedScore:\s*(\d+)/g)];
  itemMatches.forEach(m => {
    items.push({ title: m[1].replace(/__ESC__/g, "'"), seedScore: parseInt(m[2]) });
  });

  if (items.length > 0) {
    results.push({ listId, participantCount, items });
  }
}

const SQL_PARTICIPANT_CAP = 28;
const lines = [];
lines.push('-- Seed community_scores with initial baseline data');
lines.push('-- Run once in Supabase SQL editor');
lines.push('');
lines.push('INSERT INTO community_scores (list_id, item_title, total_score, participant_count)');
lines.push('VALUES');

const rows = [];
results.forEach(({ listId, participantCount, items }) => {
  const cappedCount = Math.min(participantCount, SQL_PARTICIPANT_CAP);
  const maxSeedScore = Math.max(...items.map(i => i.seedScore));
  const targetMax = cappedCount * 7;

  items.forEach(item => {
    const scaled = Math.round((item.seedScore / maxSeedScore) * targetMax);
    const escapedTitle = item.title.replace(/'/g, "''");
    rows.push(`  ('${listId}', '${escapedTitle}', ${scaled}, ${cappedCount})`);
  });
});

lines.push(rows.join(',\n'));
lines.push('ON CONFLICT (list_id, item_title)');
lines.push('DO UPDATE SET');
lines.push('  total_score = EXCLUDED.total_score,');
lines.push('  participant_count = EXCLUDED.participant_count;');

const sql = lines.join('\n');
fs.writeFileSync(__dirname + '/seed-community-scores.sql', sql);
console.log('Generated ' + results.length + ' lists, ' + rows.length + ' rows');
console.log('Output: scripts/seed-community-scores.sql');
