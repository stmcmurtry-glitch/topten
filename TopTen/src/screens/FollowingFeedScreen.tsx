import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { FeedPost } from '../data/feedTypes';
import { rowToPost } from '../hooks/useCityFeedPreview';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { ReactionBar, ReactionType } from '../components/ReactionBar';
import { enrichPostsWithCounts } from '../hooks/usePostEnrichment';
import { colors, spacing, borderRadius } from '../theme';

const PAGE_SIZE = 20;

function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(epochMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const FollowingFeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!user || !supabase) {
      setFollowingIds([]);
      return;
    }
    Promise.resolve(
      supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')
    ).then(({ data }) => {
      const ids = (data ?? []).map((r: any) => r.following_id);
      setFollowingIds([user.id, ...ids.filter((id: string) => id !== user.id)]);
    }).catch(() => setFollowingIds([user.id]));
  }, [user?.id]);

  const fetchPage = useCallback(async (from: number, ids: string[]) => {
    if (!supabase || ids.length === 0) return;
    const { data } = await supabase
      .from('community_feed_posts')
      .select('*')
      .in('user_id', ids)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    const fetched = await enrichPostsWithCounts((data ?? []).map(rowToPost), user?.id);
    if (from === 0) {
      setPosts(fetched);
    } else {
      setPosts((prev) => [...prev, ...fetched]);
    }
    setHasMore(fetched.length === PAGE_SIZE);
  }, [user?.id]);

  useEffect(() => {
    // Still waiting for followingIds to resolve
    if (followingIds === null) return;
    setLoading(true);
    fetchPage(0, followingIds).finally(() => setLoading(false));
  }, [followingIds]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !followingIds || followingIds.length === 0) return;
    setLoadingMore(true);
    await fetchPage(posts.length, followingIds!);
    setLoadingMore(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Following</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color={colors.border} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>Follow people to see their lists here.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={colors.activeTab} style={{ marginVertical: spacing.lg }} />
              : null
          }
          renderItem={({ item }) => {
            const categoryColor = CATEGORY_COLORS[item.category] ?? '#CC0000';
            return (
              <View style={styles.postRowOuter}>
                <TouchableOpacity
                  style={styles.postRow}
                  onPress={() => navigation.navigate('PublishedList', { postId: item.id })}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
                    activeOpacity={0.8}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarFallback]}>
                        <Ionicons name="person" size={18} color={colors.secondaryText} />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Content */}
                  <View style={styles.contentCol}>
                    <View style={styles.postMeta}>
                      <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.userId })} activeOpacity={0.8}>
                        <Text style={styles.username} numberOfLines={1}>{item.username ?? 'Anonymous'}</Text>
                      </TouchableOpacity>
                      <Text style={styles.metaSep}>·</Text>
                      <Text style={styles.metaTime}>{timeAgo(item.publishedAt)}</Text>
                      <View style={{ flex: 1 }} />
                      <View style={[styles.categoryPill, { backgroundColor: categoryColor + '18' }]}>
                        <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.postTitle} numberOfLines={2}>{item.title.replace(/\s+/g, ' ').trim()}</Text>
                    {!!item.blurb && (
                      <Text style={styles.postBlurb} numberOfLines={2}>{item.blurb!.replace(/\s+/g, ' ').trim()}</Text>
                    )}
                    <View style={styles.itemsList}>
                      {item.items.slice(0, 3).map((t, i) => (
                        <View key={i} style={styles.itemRow}>
                          <Text style={[styles.itemNum, { color: categoryColor }]}>{i + 1}</Text>
                          <Text style={styles.itemText} numberOfLines={1}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Reaction bar + comment chip */}
                <View style={styles.interactionRow}>
                  <ReactionBar
                    postId={item.id}
                    counts={item.reactionCounts}
                    myReaction={item.myReaction}
                    compact
                    onReact={(type: ReactionType | null) => {
                      if (!user) { navigation.navigate('AuthScreen'); return; }
                      setPosts((prev) =>
                        prev.map((p) => {
                          if (p.id !== item.id) return p;
                          const prevReaction = p.myReaction;
                          const newCounts = { ...p.reactionCounts };
                          if (prevReaction && prevReaction in newCounts) newCounts[prevReaction] = Math.max(0, newCounts[prevReaction] - 1);
                          if (type && type in newCounts) newCounts[type]++;
                          return { ...p, reactionCounts: newCounts, myReaction: type };
                        })
                      );
                    }}
                  />
                  <TouchableOpacity
                    style={styles.commentChip}
                    onPress={() => navigation.navigate('PublishedList', { postId: item.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.commentChipText}>💬{item.commentCount > 0 ? ` ${item.commentCount}` : ''}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  postRowOuter: {
    backgroundColor: colors.cardBackground,
  },
  postRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  interactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg + 42 + spacing.md,
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  commentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  commentChipText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginTop: 2,
  },
  avatarFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
    gap: 4,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    flexShrink: 1,
  },
  metaSep: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  metaTime: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  postBlurb: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  itemsList: {
    gap: 3,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  itemNum: {
    fontSize: 12,
    fontWeight: '800',
    width: 16,
    textAlign: 'right',
  },
  itemText: {
    fontSize: 13,
    color: colors.primaryText,
    fontWeight: '500',
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  emptySub: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
