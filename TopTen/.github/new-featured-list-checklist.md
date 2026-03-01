# New Featured List Checklist

Run through this every time a new entry is added to `FEATURED_LISTS` in `src/data/featuredLists.ts`.

---

## Required fields
- [ ] **ID** — next sequential `f-N`, no duplicates, no gaps
- [ ] **Category** — one of the 16 canonical categories; color uses `CATEGORY_COLORS[category]`
- [ ] **10 items** — `previewItems` has exactly 10 entries, in correct rank order
- [ ] **Description** — explains *how* the list was ranked (not just a restatement of the title)

## Factual vs. Debatable
- [ ] **Factual list** (objective records, verifiable rankings)?
  - [ ] `updatedAt: 'Month YYYY'` set to current month
  - [ ] `statsSource` set to the canonical URL (Sports Reference, Wikipedia, official org)
  - [ ] Active players/entities marked with `*` in the item string
  - [ ] Description footnotes active items: `(* still active — will shift)`
- [ ] **Debatable list** (editorial, "best of", opinion)?
  - [ ] Description states the ranking methodology clearly (e.g. "Ranked by critic scores, box office, and cultural impact")
  - [ ] No `updatedAt` / `statsSource` needed

## Image
- [ ] `staticImageUrl` set (preferred) — verify the Unsplash image actually matches the list topic
- [ ] If no static URL, `imageQuery` is specific enough to return a relevant hero image
- [ ] Image subject matches list `#1` item where possible

## Active entities
- [ ] If any entry can change (active career, living record, ongoing season): marked with `*` and noted in description
- [ ] Lists with active entries will auto-appear in the monthly GitHub stats reminder

## Spot-check
- [ ] Open the list in the app — hero image loads, all 10 items display, "Verified" badge shows if factual
- [ ] No spelling errors in item names (especially accented characters: Dončić, Jagr, etc.)
