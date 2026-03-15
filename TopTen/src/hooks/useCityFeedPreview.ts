import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { FeedPost, FEED_MIN_POSTS } from '../data/feedTypes';

interface CityFeedPreview {
  posts: FeedPost[];
  total: number;
  loading: boolean;
}

function rowToPost(row: any): FeedPost {
  return {
    id: row.id,
    userId: row.user_id,
    listId: row.list_id,
    citySlug: row.city_slug,
    cityName: row.city_name,
    title: row.title,
    category: row.category,
    blurb: row.blurb ?? null,
    items: Array.isArray(row.items) ? row.items : [],
    coverImageUri: row.cover_image_uri ?? null,
    username: row.username ?? null,
    avatarUrl: row.avatar_url ?? null,
    publishedAt: new Date(row.published_at).getTime(),
    likeCount: row.like_count ?? 0,
  };
}

export function useCityFeedPreview(citySlug: string | null): CityFeedPreview {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!citySlug || !supabase) {
      setPosts([]);
      setTotal(0);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Cheap count first
      const { count } = await supabase!
        .from('community_feed_posts')
        .select('id', { count: 'exact', head: true })
        .eq('city_slug', citySlug);

      const total = count ?? 0;
      if (cancelled) return;

      if (total < FEED_MIN_POSTS) {
        setTotal(total);
        setPosts([]);
        setLoading(false);
        return;
      }

      setTotal(total);

      // Fetch preview posts
      const { data } = await supabase!
        .from('community_feed_posts')
        .select('*')
        .eq('city_slug', citySlug)
        .order('published_at', { ascending: false })
        .limit(3);

      if (cancelled) return;
      setPosts((data ?? []).map(rowToPost));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [citySlug]);

  return { posts, total, loading };
}

export { rowToPost };
