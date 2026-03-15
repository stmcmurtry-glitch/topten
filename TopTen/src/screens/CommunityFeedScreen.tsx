import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../services/supabase';
import { FeedPost } from '../data/feedTypes';
import { FeedPostCard } from '../components/FeedPostCard';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { rowToPost } from '../hooks/useCityFeedPreview';

const PAGE_SIZE = 20;

interface RouteParams {
  citySlug: string;
  cityName: string;
}

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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <BlurView intensity={50} tint="light" style={styles.backBtnInner}>
            <Ionicons name="chevron-back" size={20} color={colors.primaryText} />
          </BlurView>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Community Feed</Text>
          <Text style={styles.headerSub}>{cityName}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
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
            <View style={styles.itemWrap}>
              <TouchableOpacity
                style={styles.fullCard}
                onPress={() => navigation.navigate('PublishedList', { postId: item.id })}
                activeOpacity={0.85}
              >
                <View style={styles.fullCardLeft}>
                  <View style={[styles.categoryPill, { backgroundColor: 'rgba(204,0,0,0.08)' }]}>
                    <Text style={styles.categoryPillText}>{item.category}</Text>
                  </View>
                  <Text style={styles.fullCardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.fullCardUser} numberOfLines={1}>
                    by {item.username ?? 'Anonymous'}
                  </Text>
                  {item.blurb ? (
                    <Text style={styles.fullCardBlurb} numberOfLines={2}>{item.blurb}</Text>
                  ) : null}
                  {item.items.slice(0, 3).map((t, i) => (
                    <Text key={i} style={styles.fullCardItem} numberOfLines={1}>
                      {i + 1}. {t}
                    </Text>
                  ))}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    flexShrink: 0,
  },
  backBtnInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
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
    fontSize: 13,
    color: colors.secondaryText,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  itemWrap: {
    marginBottom: spacing.sm,
  },
  fullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
    shadowOpacity: 0.06,
  },
  fullCardLeft: {
    flex: 1,
    gap: 3,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 4,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.activeTab,
  },
  fullCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
  },
  fullCardUser: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 2,
  },
  fullCardBlurb: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.secondaryText,
    lineHeight: 18,
  },
  fullCardItem: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
