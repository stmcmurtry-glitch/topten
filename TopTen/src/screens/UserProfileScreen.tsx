import React, { useState, useEffect } from 'react';
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
import { rowToPost } from '../hooks/useCityFeedPreview';
import { FollowButton } from '../components/FollowButton';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { CATEGORY_COLORS } from '../components/FeedRow';

interface UserProfile {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

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

export const UserProfileScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { userId } = route.params as { userId: string };
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !userId) return;

    Promise.all([
      supabase.from('user_profiles').select('id, username, nickname, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
      supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
      supabase.from('community_feed_posts').select('*').eq('user_id', userId).order('published_at', { ascending: false }).limit(20),
    ]).then(([profileRes, followersRes, followingRes, postsRes]) => {
      if (profileRes.data) setProfile(profileRes.data as UserProfile);
      setFollowerCount(followersRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setPosts((postsRes.data ?? []).map(rowToPost));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl }} />
      </View>
    );
  }

  const displayName = profile?.nickname ?? (profile?.username ? `@${profile.username}` : 'User');
  const username = profile?.username ? `@${profile.username}` : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ListHeaderComponent={
          <View>
            {/* Nav */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
              </TouchableOpacity>
            </View>

            {/* Profile info */}
            <View style={styles.profileSection}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={32} color={colors.secondaryText} />
                </View>
              )}
              <View style={styles.nameRow}>
                <View style={styles.nameInfo}>
                  <Text style={styles.displayName}>{displayName}</Text>
                  {username && profile?.nickname ? (
                    <Text style={styles.username}>{username}</Text>
                  ) : null}
                </View>
                <FollowButton targetUserId={userId} />
              </View>

              {/* Counts */}
              <View style={styles.countsRow}>
                <View style={styles.countItem}>
                  <Text style={styles.countNum}>{followerCount}</Text>
                  <Text style={styles.countLabel}>Followers</Text>
                </View>
                <View style={styles.countDivider} />
                <View style={styles.countItem}>
                  <Text style={styles.countNum}>{followingCount}</Text>
                  <Text style={styles.countLabel}>Following</Text>
                </View>
                <View style={styles.countDivider} />
                <View style={styles.countItem}>
                  <Text style={styles.countNum}>{posts.length}</Text>
                  <Text style={styles.countLabel}>Lists</Text>
                </View>
              </View>
            </View>

            {posts.length > 0 && (
              <Text style={styles.postsHeader}>Published Lists</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={40} color={colors.border} />
            <Text style={styles.emptyText}>No published lists yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const categoryColor = CATEGORY_COLORS[item.category] ?? '#CC0000';
          return (
            <TouchableOpacity
              style={styles.postCard}
              onPress={() => navigation.navigate('PublishedList', { postId: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.postCardHeader}>
                <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.postCategory, { color: categoryColor }]}>{item.category}</Text>
                <Text style={styles.postTime}>{timeAgo(item.publishedAt)}</Text>
              </View>
              <Text style={styles.postTitle} numberOfLines={2}>{item.title}</Text>
              {item.items.slice(0, 3).map((t, i) => (
                <View key={i} style={styles.postItemRow}>
                  <Text style={[styles.postItemNum, { color: categoryColor }]}>{i + 1}</Text>
                  <Text style={styles.postItemText} numberOfLines={1}>{t}</Text>
                </View>
              ))}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.cardBackground,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.md,
  },
  avatarFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  nameInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 2,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  countItem: {
    alignItems: 'center',
  },
  countNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryText,
  },
  countLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 1,
  },
  countDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  postsHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.squircle,
    padding: spacing.md,
    ...shadow,
    shadowOpacity: 0.06,
  },
  postCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  postCategory: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  postTime: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: spacing.sm,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  postItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },
  postItemNum: {
    fontSize: 12,
    fontWeight: '800',
    width: 16,
    textAlign: 'right',
  },
  postItemText: {
    fontSize: 13,
    color: colors.primaryText,
    fontWeight: '500',
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondaryText,
  },
});
