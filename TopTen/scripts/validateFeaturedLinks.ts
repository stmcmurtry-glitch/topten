/**
 * Validates external links generated for featured list items.
 * Run: npx tsx scripts/validateFeaturedLinks.ts
 *
 * - Wikipedia items: checked via the Wikipedia JSON API (definitive existence check)
 * - IMDB / Goodreads: checked via HTTP HEAD (always search pages, so 200 = reachable)
 * - Lists with disableItemLinks or non-linked categories are skipped
 */

import { FEATURED_LISTS, FeaturedList } from '../src/data/featuredLists';

// Mirror of getItemUrl in FeaturedListScreen.tsx — keep in sync if routing changes
function getItemUrl(list: FeaturedList, item: string): string | null {
  if (list.disableItemLinks) return null;
  const name = item.split(/\s[—–]\s/)[0].trim();
  const q = encodeURIComponent(name);
  switch (list.category) {
    case 'Movies':
    case 'TV':
      return `https://www.imdb.com/find?q=${q}&s=tt`;
    case 'Sports':
    case 'People':
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`;
    case 'Books':
      return `https://www.goodreads.com/search?q=${q}`;
    default:
      return null;
  }
}

async function checkWikipedia(wikiUrl: string): Promise<{ exists: boolean; resolvedTitle?: string }> {
  const title = decodeURIComponent(wikiUrl.split('/wiki/')[1]).replace(/_/g, ' ');
  const api = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&format=json&redirects=1`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(api, { headers: { 'User-Agent': 'TopTenLinkValidator/1.0' } });
      if (res.status === 429 || res.status === 503) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return { exists: false };
      const data = await res.json() as any;
      const pages = data.query?.pages ?? {};
      const key = Object.keys(pages)[0];
      if (!key || key === '-1') return { exists: false };
      return { exists: true, resolvedTitle: pages[key]?.title };
    } catch {
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return { exists: false };
}

async function checkHttp(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const filterId = args.find(a => a.startsWith('--id='))?.split('=')[1];
  const filterCat = args.find(a => a.startsWith('--category='))?.split('=')[1];

  let ok = 0, broken = 0, skipped = 0;
  const issues: string[] = [];

  const lists = FEATURED_LISTS.filter(l => {
    if (filterId && l.id !== filterId) return false;
    if (filterCat && l.category.toLowerCase() !== filterCat.toLowerCase()) return false;
    return true;
  });

  for (const list of lists) {
    const linked = list.previewItems.filter(item => getItemUrl(list, item) !== null);
    if (linked.length === 0) {
      console.log(`\n[${list.id}] ${list.title} — skipped (no links)`);
      skipped++;
      continue;
    }

    console.log(`\n[${list.id}] ${list.title} (${list.category})`);

    for (const item of list.previewItems) {
      const url = getItemUrl(list, item);
      if (!url) continue;

      const name = item.split(/\s[—–]\s/)[0].trim();

      if (url.includes('wikipedia.org/wiki/')) {
        const { exists, resolvedTitle } = await checkWikipedia(url);
        if (exists) {
          console.log(`  ✓  ${name}  →  "${resolvedTitle}"`);
          ok++;
        } else {
          console.log(`  ✗  ${name}  →  NO WIKIPEDIA PAGE`);
          broken++;
          issues.push(`[${list.id}] "${item}"  →  ${url}`);
        }
      } else {
        const status = await checkHttp(url);
        if (status >= 200 && status < 400) {
          console.log(`  ✓  ${name}  (HTTP ${status})`);
          ok++;
        } else {
          console.log(`  ✗  ${name}  (HTTP ${status})`);
          broken++;
          issues.push(`[${list.id}] "${item}"  →  ${url}  (HTTP ${status})`);
        }
      }

      // Avoid hammering APIs
      await new Promise(r => setTimeout(r, 400));
    }
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${ok} ok  ·  ${broken} broken  ·  ${skipped} lists skipped`);

  if (issues.length > 0) {
    console.log(`\nBroken links:`);
    issues.forEach(i => console.log(`  ${i}`));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
