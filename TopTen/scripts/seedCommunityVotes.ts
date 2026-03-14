/**
 * Seed real community votes into Supabase.
 *
 * Handles two list sources:
 *   local     — reads from `local_lists` table (city-specific, 10–50 votes each)
 *   community — reads COMMUNITY_LISTS + FEATURED_LISTS from src/data/*.ts
 *               uses hardcoded participantCount as vote target, weights by seedScore
 *
 * Both sources are idempotent: device IDs are deterministic, re-running upserts the same rows.
 *
 * Usage:
 *   npx tsx scripts/seedCommunityVotes.ts                        # community only (most common)
 *   npx tsx scripts/seedCommunityVotes.ts --type=local            # 500-city local lists only
 *   npx tsx scripts/seedCommunityVotes.ts --type=all              # both
 *   npx tsx scripts/seedCommunityVotes.ts --cities=pittsburgh     # local + city filter
 *   npx tsx scripts/seedCommunityVotes.ts --dry-run               # log without writing
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { COMMUNITY_LISTS } from '../src/data/communityLists';

// ── Env ───────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const typeArg = args.find((a) => a.startsWith('--type='))?.replace('--type=', '') ?? 'community';
const citiesArg = args.find((a) => a.startsWith('--cities='))?.replace('--cities=', '');
const cityFilter = citiesArg ? new Set(citiesArg.split(',').map((c) => c.trim().toLowerCase())) : null;

const doLocal = typeArg === 'local' || typeArg === 'all';
const doCommunity = typeArg === 'community' || typeArg === 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fast integer hash of a string. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/** Stable vote count 5–10 derived from list ID (used for local lists). */
function localVoteCount(listId: string): number {
  return 10 + (Math.abs(hashStr(listId)) % 41); // 10..50
}

/** Deterministic UUID v4-format device ID for a specific seed vote. */
function seedDeviceId(listId: string, voteIndex: number): string {
  const hex = createHash('sha1')
    .update(`topten_seed:${listId}:${voteIndex}`)
    .digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-');
}

/** Deterministic Fisher-Yates shuffle seeded by a string. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let h = hashStr(seed);
  for (let i = result.length - 1; i > 0; i--) {
    h = (Math.imul(31, h) + i) | 0;
    const j = Math.abs(h) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Build slots for a community/featured list vote.
 * Items are selected proportionally to their seedScore — higher-scored items
 * reliably appear in top positions while lower-scored items appear less often.
 * Produces natural-looking variation across votes so scores aggregate realistically.
 */
function buildWeightedSlots(
  items: Array<{ title: string; seedScore: number }>,
  listId: string,
  voteIndex: number,
): string[] {
  const seed = `community_seed:${listId}:${voteIndex}`;
  // Add seeded noise to each item's score: high-score items remain on top but not identically
  const scored = items.map((item, i) => {
    const noise = ((Math.abs(hashStr(`${seed}:${i}`)) % 1000) / 1000); // 0..0.999
    return {
      title: item.title.toLowerCase().trim(),
      weighted: item.seedScore * (0.55 + 0.45 * noise),
    };
  });
  scored.sort((a, b) => b.weighted - a.weighted);

  // Pick count varies 5–10 across voters (simulates different engagement levels)
  const base = Math.abs(hashStr(seed));
  const pickCount = Math.min(items.length, 5 + (base % 6));

  return scored
    .slice(0, pickCount)
    .map((s) => s.title)
    .concat(Array(Math.max(0, 10 - pickCount)).fill(''));
}

/** ISO timestamp spread across the past 90 days (most recent vote = voteIndex 0). */
function spreadTimestamp(voteIndex: number, totalVotes: number): string {
  const SPAN_MS = 90 * 24 * 60 * 60 * 1000;
  const offset = totalVotes > 1 ? (voteIndex / (totalVotes - 1)) * SPAN_MS : 0;
  return new Date(Date.now() - offset).toISOString();
}

// ── Vote row type ──────────────────────────────────────────────────────────────
interface VoteRow {
  device_id: string;
  list_id: string;
  slots: string[];
  submitted_at: string;
}

// ── Local lists (from Supabase `local_lists` table) ───────────────────────────
async function buildLocalVotes(): Promise<VoteRow[]> {
  console.log(`\nFetching local lists from Supabase${cityFilter ? ` (cities: ${[...cityFilter].join(', ')})` : ''}…`);

  let allRows: Array<{ id: string; data: any }> = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let query = supabase
      .from('local_lists')
      .select('id, data')
      .is('neighborhood', null)
      .range(from, from + PAGE - 1);
    if (cityFilter) query = query.in('city_slug', [...cityFilter]);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (allRows.length === 0) {
    console.log('  No local_lists found. Run generateLocalLists.ts first.');
    return [];
  }

  const votes: VoteRow[] = [];
  let skipped = 0;

  for (const row of allRows) {
    const items: string[] = (row.data?.items ?? [])
      .map((i: any) => (i.title ?? '').trim().toLowerCase())
      .filter(Boolean);
    if (items.length === 0) { skipped++; continue; }

    const voteCount = localVoteCount(row.id);
    for (let v = 0; v < voteCount; v++) {
      const shuffled = seededShuffle(items, `${row.id}:${v}`);
      const pickCount = Math.min(items.length, 5 + (v % Math.min(items.length, 6)));
      votes.push({
        device_id: seedDeviceId(row.id, v),
        list_id: row.id,
        slots: shuffled.slice(0, pickCount).concat(Array(Math.max(0, 10 - pickCount)).fill('')),
        submitted_at: spreadTimestamp(v, voteCount),
      });
    }
  }

  console.log(`  ${allRows.length} local lists → ${votes.length} votes (${skipped} skipped).`);
  return votes;
}

// ── Community lists (from JS data files) ─────────────────────────────────────
function buildCommunityVotes(): VoteRow[] {
  const allLists = COMMUNITY_LISTS.map((l) => ({
    id: l.id,
    participantCount: l.participantCount,
    items: l.items.map((i) => ({ title: i.title, seedScore: i.seedScore })),
  }));

  const votes: VoteRow[] = [];

  for (const list of allLists) {
    if (!list.items || list.items.length === 0) continue;
    const voteCount = list.participantCount;
    for (let v = 0; v < voteCount; v++) {
      votes.push({
        device_id: seedDeviceId(list.id, v),
        list_id: list.id,
        slots: buildWeightedSlots(list.items, list.id, v),
        submitted_at: spreadTimestamp(v, voteCount),
      });
    }
  }

  const totalLists = allLists.filter((l) => l.items.length > 0).length;
  console.log(`\n  ${totalLists} community lists → ${votes.length} votes.`);
  return votes;
}

// ── Upsert helper ─────────────────────────────────────────────────────────────
async function upsertVotes(votes: VoteRow[]): Promise<void> {
  const BATCH = 500;
  for (let i = 0; i < votes.length; i += BATCH) {
    const batch = votes.slice(i, i + BATCH);
    const { error } = await supabase
      .from('community_votes')
      .upsert(batch, { onConflict: 'device_id,list_id' });
    if (error) throw error;
    process.stdout.write(`\r  Upserted ${Math.min(i + BATCH, votes.length)} / ${votes.length} votes`);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Mode: --type=${typeArg}${isDryRun ? ' --dry-run' : ''}`);

  const allVotes: VoteRow[] = [];

  if (doCommunity) {
    const cv = buildCommunityVotes();
    allVotes.push(...cv);
  }

  if (doLocal) {
    const lv = await buildLocalVotes();
    allVotes.push(...lv);
  }

  console.log(`\nTotal: ${allVotes.length} votes to upsert.`);

  if (isDryRun) {
    console.log('\nDRY RUN — no writes. Sample:');
    console.log(JSON.stringify(allVotes.slice(0, 3), null, 2));
    return;
  }

  await upsertVotes(allVotes);

  console.log('Refreshing community scores…');
  const { error: rpcError } = await supabase.rpc('refresh_community_scores');
  if (rpcError) throw rpcError;

  console.log(`\n✓ Done! ${allVotes.length} seed votes written.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
