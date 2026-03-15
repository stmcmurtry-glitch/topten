export interface FeedPost {
  id: string;
  userId: string;
  listId: string;
  citySlug: string;
  cityName: string;
  title: string;
  category: string;
  blurb?: string | null;
  items: string[];          // top 3-5 item titles for preview
  coverImageUri?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  publishedAt: number;      // epoch ms
  likeCount: number;
}

export const FEED_MIN_POSTS = 5;
