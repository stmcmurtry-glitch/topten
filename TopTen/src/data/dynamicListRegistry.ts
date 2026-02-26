import { CommunityList } from './communityLists';
import { COMMUNITY_LISTS, LOCAL_COMMUNITY_LISTS } from './communityLists';

let dynamicLists: CommunityList[] = [];

/** Merge new lists into the registry — later call wins on ID collision. */
export function registerDynamicLists(lists: CommunityList[]): void {
  for (const list of lists) {
    const idx = dynamicLists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      dynamicLists[idx] = list;
    } else {
      dynamicLists.push(list);
    }
  }
}

/** Look up a community list by ID across static arrays + dynamic registry. */
export function resolveCommunityList(id: string): CommunityList | undefined {
  return (
    COMMUNITY_LISTS.find((l) => l.id === id) ??
    LOCAL_COMMUNITY_LISTS.find((l) => l.id === id) ??
    dynamicLists.find((l) => l.id === id)
  );
}

export function getDynamicLists(): CommunityList[] {
  return dynamicLists;
}
