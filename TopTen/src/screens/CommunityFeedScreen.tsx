import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { FeedPost } from '../data/feedTypes';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { colors, spacing, borderRadius } from '../theme';
import { rowToPost } from '../hooks/useCityFeedPreview';

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

function clean(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

interface RouteParams {
  citySlug: string;
  cityName: string;
}

const PostRow: React.FC<{ item: FeedPost; onPress: () => void; onUserPress: () => void }> = ({ item, onPress, onUserPress }) => {
  const categoryColor = CATEGORY_COLORS[item.category] ?? '#CC0000';
  return (
    <TouchableOpacity style={styles.postRow} onPress={onPress} activeOpacity={0.7}>
      {/* Left: avatar */}
      <TouchableOpacity style={styles.avatarCol} onPress={onUserPress} activeOpacity={0.8}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={18} color={colors.secondaryText} />
          </View>
        )}
      </TouchableOpacity>

      {/* Right: content */}
      <View style={styles.contentCol}>
        {/* Username · time · category */}
        <View style={styles.postMeta}>
          <TouchableOpacity onPress={onUserPress} activeOpacity={0.8}>
            <Text style={styles.username} numberOfLines={1}>{item.username ?? 'Anonymous'}</Text>
          </TouchableOpacity>
          <Text style={styles.metaSep}>·</Text>
          <Text style={styles.metaTime}>{timeAgo(item.publishedAt)}</Text>
          <View style={styles.metaSpacer} />
          <View style={[styles.categoryPill, { backgroundColor: categoryColor + '18' }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.postTitle}>{clean(item.title)}</Text>

        {/* Blurb */}
        {!!item.blurb && (
          <Text style={styles.postBlurb} numberOfLines={3}>{clean(item.blurb)}</Text>
        )}

        {/* Numbered items */}
        <View style={styles.itemsList}>
          {item.items.slice(0, 3).map((t, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={[styles.itemNum, { color: categoryColor }]}>{i + 1}</Text>
              <Text style={styles.itemText} numberOfLines={1}>{clean(t)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.postFooter}>
          <Ionicons name="location-sharp" size={11} color={colors.secondaryText} />
          <Text style={styles.footerCity}>{item.cityName}</Text>
          {item.likeCount > 0 && (
            <>
              <Text style={styles.footerSep}>·</Text>
              <Ionicons name="heart-outline" size={11} color={colors.secondaryText} />
              <Text style={styles.footerLikes}>{item.likeCount}</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const CommunityFeedScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { citySlug, cityName } = route.params as RouteParams;
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(async (from: number) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('community_feed_posts')
      .select('*')
      .eq('city_slug', citySlug)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    const fetched = (data ?? []).map(rowToPost);
    if (from === 0) {
      setPosts(fetched);
    } else {
      setPosts((prev) => [...prev, ...fetched]);
    }
    setHasMore(fetched.length === PAGE_SIZE);
  }, [citySlug]);

  useEffect(() => {
    setLoading(true);
    fetchPage(0).finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPage(posts.length);
    setLoadingMore(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Local Feed</Text>
          <Text style={styles.headerSub}>{cityName}</Text>
        </View>
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
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={44} color={colors.border} />
              <Text style={styles.emptyTitle}>No posts in {cityName} yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to share a list with your city.</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={colors.activeTab} style={{ marginVertical: spacing.lg }} />
              : null
          }
          renderItem={({ item }) => (
            <PostRow
              item={item}
              onPress={() => navigation.navigate('PublishedList', { postId: item.id })}
              onUserPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
            />
          )}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  headerSub: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  /* ── Post row (X-style) ── */
  postRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  avatarCol: {
    paddingTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  metaSpacer: {
    flex: 1,
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
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  footerCity: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  footerSep: {
    fontSize: 12,
    color: colors.border,
  },
  footerLikes: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  /* ── Empty state ── */
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
