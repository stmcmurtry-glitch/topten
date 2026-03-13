/**
 * Seed real community votes for top-500 city lists in Supabase.
 *
 * Reads generated lists from the `local_lists` table (run generateLocalLists.ts first),
 * inserts 5–10 deterministic fake votes per list into `community_votes`, then calls
 * refresh_community_scores so participant counts and item scores are live immediately.
 *
 * Idempotent: fake device IDs are deterministic — re-running just upserts the same rows.
 *
 * Usage:
 *   npx tsx scripts/seedCommunityVotes.ts                        # all cities in local_lists
 *   npx tsx scripts/seedCommunityVotes.ts --cities=pittsburgh,chicago
 *   npx tsx scripts/seedCommunityVotes.ts --dry-run              # log without writing
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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
const citiesArg = args.find((a) => a.startsWith('--cities='))?.replace('--cities=', '');
const cityFilter = citiesArg ? new Set(citiesArg.split(',').map((c) => c.trim().toLowerCase())) : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stable vote count 5–10 derived from list ID. */
function seedVoteCount(listId: string): number {
  let h = 0;
  for (let i = 0; i < listId.length; i++) h = (Math.imul(31, h) + listId.charCodeAt(i)) | 0;
  return 5 + (Math.abs(h) % 6); // 5..10
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
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  for (let i = result.length - 1; i > 0; i--) {
    h = (Math.imul(31, h) + i) | 0;
    const j = Math.abs(h) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Fetching local lists from Supabase${cityFilter ? ` (cities: ${[...cityFilter].join(', ')})` : ''}…`);

  // Fetch in pages to avoid row limit
  let allLists: Array<{ id: string; city_slug: string; data: any }> = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let query = supabase
      .from('local_lists')
      .select('id, city_slug, data')
      .is('neighborhood', null)
      .range(from, from + PAGE - 1);
    if (cityFilter) {
      query = query.in('city_slug', [...cityFilter]);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allLists = allLists.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (allLists.length === 0) {
    console.log('No lists found in local_lists table. Run generateLocalLists.ts first.');
    return;
  }

  console.log(`Found ${allLists.length} lists. Building seed votes…`);

  const votes: Array<{
    device_id: string;
    list_id: string;
    slots: string[];
    submitted_at: string;
  }> = [];

  const submittedAt = new Date().toISOString();
  let skipped = 0;

  for (const row of allLists) {
    const items: string[] = (row.data?.items ?? [])
      .map((i: any) => (i.title ?? '').trim().toLowerCase())
      .filter(Boolean);

    if (items.length === 0) {
      skipped++;
      continue;
    }

    const voteCount = seedVoteCount(row.id);

    for (let v = 0; v < voteCount; v++) {
      const shuffled = seededShuffle(items, `${row.id}:${v}`);
      // Each fake voter picks their top items (up to 10), with slight variation
      const pickCount = Math.min(items.length, 5 + (v % (Math.min(items.length, 6))));
      const slots = shuffled
        .slice(0, pickCount)
        .concat(Array(Math.max(0, 10 - pickCount)).fill(''));

      votes.push({
        device_id: seedDeviceId(row.id, v),
        list_id: row.id,
        slots,
        submitted_at: submittedAt,
      });
    }
  }

  console.log(
    `Generated ${votes.length} seed votes across ${allLists.length - skipped} lists` +
    (skipped > 0 ? ` (${skipped} lists skipped — no items)` : '') + '.'
  );

  if (isDryRun) {
    console.log('\nDRY RUN — no writes.');
    console.log('Sample votes:');
    console.log(JSON.stringify(votes.slice(0, 3), null, 2));
    return;
  }

  // Upsert in batches of 500
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

  console.log('Refreshing community scores (this may take a moment)…');
  const { error: rpcError } = await supabase.rpc('refresh_community_scores');
  if (rpcError) throw rpcError;

  console.log(`\n✓ Done! ${votes.length} seed votes across ${allLists.length - skipped} lists.`);
  console.log('  participant_count will now show 5–10 per list in the app.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
