import { supabase } from '../services/supabase';
import { FeedPost } from '../data/feedTypes';
import { ReactionType } from '../components/ReactionBar';

export async function enrichPostsWithCounts(
  posts: FeedPost[],
  userId?: string
): Promise<FeedPost[]> {
  if (!supabase || posts.length === 0) return posts;

  const ids = posts.map((p) => p.id);

  // Fetch all reactions for these posts
  const [reactionsResult, commentsResult, myReactionsResult] = await Promise.all([
    supabase.from('post_reactions').select('post_id, reaction_type').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
    userId
      ? supabase
          .from('post_reactions')
          .select('post_id, reaction_type')
          .in('post_id', ids)
          .eq('user_id', userId)
      : Promise.resolve({ data: [] }),
  ]);

  // Aggregate reaction counts per post
  const reactionMap: Record<string, { like: number; hot: number; debatable: number; agree: number }> = {};
  for (const row of reactionsResult.data ?? []) {
    if (!reactionMap[row.post_id]) {
      reactionMap[row.post_id] = { like: 0, hot: 0, debatable: 0, agree: 0 };
    }
    const type = row.reaction_type as ReactionType;
    if (type in reactionMap[row.post_id]) {
      reactionMap[row.post_id][type]++;
    }
  }

  // Aggregate comment counts per post
  const commentMap: Record<string, number> = {};
  for (const row of commentsResult.data ?? []) {
    commentMap[row.post_id] = (commentMap[row.post_id] ?? 0) + 1;
  }

  // Build myReaction map
  const myReactionMap: Record<string, ReactionType> = {};
  for (const row of (myReactionsResult.data ?? []) as any[]) {
    myReactionMap[row.post_id] = row.reaction_type as ReactionType;
  }

  return posts.map((p) => ({
    ...p,
    reactionCounts: reactionMap[p.id] ?? { like: 0, hot: 0, debatable: 0, agree: 0 },
    commentCount: commentMap[p.id] ?? 0,
    myReaction: myReactionMap[p.id] ?? null,
  }));
}
