import { UserCommunityRanking } from '../context/CommunityContext';

const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000;

export type PriorityBucket = 'recent' | 'new' | 'done';

export function getCommunityBucket(
  listId: string,
  userRankings: Record<string, UserCommunityRanking>
): PriorityBucket {
  const ranking = userRankings[listId];
  if (!ranking || !ranking.submitted) return 'new';
  const submittedAt = (ranking as any).submittedAt as number | undefined;
  if (submittedAt && Date.now() - submittedAt < RECENT_WINDOW_MS) return 'recent';
  return 'done';
}

export function sortCommunityLists<T extends { id: string; participantCount: number }>(
  lists: T[],
  userRankings: Record<string, UserCommunityRanking>
): { recent: T[]; newLists: T[]; done: T[] } {
  const recent: T[] = [];
  const newLists: T[] = [];
  const done: T[] = [];

  for (const list of lists) {
    const bucket = getCommunityBucket(list.id, userRankings);
    if (bucket === 'recent') recent.push(list);
    else if (bucket === 'new') newLists.push(list);
    else done.push(list);
  }

  newLists.sort((a, b) => b.participantCount - a.participantCount);

  return { recent, newLists, done };
}
