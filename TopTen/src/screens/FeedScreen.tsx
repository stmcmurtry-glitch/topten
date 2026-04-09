import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoAsset = require('../../assets/logo.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { FeedPost } from '../data/feedTypes';
import { rowToPost } from '../hooks/useCityFeedPreview';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { ReactionBar, ReactionType } from '../components/ReactionBar';
import { enrichPostsWithCounts } from '../hooks/usePostEnrichment';
import { FollowButton } from '../components/FollowButton';
import {
  getDetectedLocation,
  formatLocationLabel,
  DetectedLocation,
} from '../services/locationService';
import { colors, spacing, borderRadius } from '../theme';
import { SignInPrompt } from '../components/SignInPrompt';

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

/* ── Shared post row ── */
const PostRow: React.FC<{
  item: FeedPost;
  onPress: () => void;
  onUserPress: () => void;
  onReact: (type: ReactionType | null) => void;
  onCommentPress: () => void;
}> = ({ item, onPress, onUserPress, onReact, onCommentPress }) => {
  const categoryColor = CATEGORY_COLORS[item.category] ?? '#CC0000';
  return (
    <View style={styles.postRowOuter}>
      <TouchableOpacity style={styles.postRow} onPress={onPress} activeOpacity={0.7}>
        <TouchableOpacity onPress={onUserPress} activeOpacity={0.8}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={18} color={colors.secondaryText} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.contentCol}>
          <View style={styles.postMeta}>
            <TouchableOpacity onPress={onUserPress} activeOpacity={0.8}>
              <Text style={styles.username} numberOfLines={1}>{item.username ?? 'Anonymous'}</Text>
            </TouchableOpacity>
            <Text style={styles.metaSep}>·</Text>
            <Text style={styles.metaTime}>{timeAgo(item.publishedAt)}</Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.categoryPill, { backgroundColor: categoryColor + '18' }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
            </View>
          </View>
          <Text style={styles.postTitle} numberOfLines={2}>{clean(item.title)}</Text>
          {!!item.blurb && (
            <Text style={styles.postBlurb} numberOfLines={2}>{clean(item.blurb!)}</Text>
          )}
          <View style={styles.itemsList}>
            {item.items.slice(0, 3).map((t, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={[styles.itemNum, { color: categoryColor }]}>{i + 1}</Text>
                <Text style={styles.itemText} numberOfLines={1}>{clean(t)}</Text>
              </View>
            ))}
          </View>
          {item.cityName ? (
            <View style={styles.postFooter}>
              <Ionicons name="location-sharp" size={11} color={colors.secondaryText} />
              <Text style={styles.footerCity}>{item.cityName}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Reaction bar + comment button */}
      <View style={styles.interactionRow}>
        <ReactionBar
          postId={item.id}
          counts={item.reactionCounts}
          myReaction={item.myReaction}
          onReact={onReact}
          compact
        />
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.commentBtn} onPress={onCommentPress} activeOpacity={0.6}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.primaryText} />
          <Text style={styles.commentBtnText}>{item.commentCount > 0 ? item.commentCount : 'Comment'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ── User search result row ── */
interface UserResult {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

const UserRow: React.FC<{ user: UserResult; onPress: () => void }> = ({ user, onPress }) => {
  const displayName = user.nickname ?? (user.username ? `@${user.username}` : 'Unknown');
  const username = user.username ? `@${user.username}` : null;
  return (
    <View style={styles.userRow}>
      <TouchableOpacity style={styles.userRowLeft} onPress={onPress} activeOpacity={0.8}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
        ) : (
          <View style={[styles.userAvatar, styles.avatarFallback]}>
            <Ionicons name="person" size={18} color={colors.secondaryText} />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userDisplayName} numberOfLines={1}>{displayName}</Text>
          {username && user.nickname ? (
            <Text style={styles.userUsername}>{username}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
      <FollowButton targetUserId={user.id} />
    </View>
  );
};

/* ── Following tab ── */
const FollowingTab: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[] | null>(null);

  // User search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFollowingIds = useCallback(async () => {
    if (!user || !supabase) { setFollowingIds([]); return; }
    const { data } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('status', 'accepted');
    const ids = (data ?? []).map((r: any) => r.following_id);
    setFollowingIds([user.id, ...ids.filter((id: string) => id !== user.id)]);
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
    if (from === 0) setPosts(fetched);
    else setPosts((prev) => [...prev, ...fetched]);
    setHasMore(fetched.length === PAGE_SIZE);
  }, [user?.id]);

  useEffect(() => {
    loadFollowingIds();
  }, [loadFollowingIds]);

  useEffect(() => {
    if (followingIds === null) return;
    setLoading(true);
    fetchPage(0, followingIds).finally(() => setLoading(false));
  }, [followingIds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFollowingIds();
    setRefreshing(false);
  }, [loadFollowingIds]);

  // Re-fetch following IDs when screen re-focuses (so accepting a request refreshes the feed)
  useFocusEffect(useCallback(() => {
    if (followingIds !== null) loadFollowingIds();
  }, [loadFollowingIds]));

  const loadMore = async () => {
    if (loadingMore || !hasMore || !followingIds?.length) return;
    setLoadingMore(true);
    await fetchPage(posts.length, followingIds);
    setLoadingMore(false);
  };

  // User search
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      if (!supabase) { setSearchLoading(false); return; }
      const term = q.trim().toLowerCase();
      const { data } = await supabase
        .from('user_profiles')
        .select('id, username, nickname, avatar_url')
        .or(`username.ilike.%${term}%,nickname.ilike.%${term}%`)
        .limit(10);
      setSearchResults(data ?? []);
      setSearchLoading(false);
    }, 300);
  };

  const isFollowingNobody = !loading && !hasPosts && followingIds !== null && followingIds.length <= 1;
  const isFollowingButNoPosts = !loading && !hasPosts && followingIds !== null && followingIds.length > 1;
  const hasPosts = posts.length > 0;

  // Search bar — shown in header area of empty state, or as inline section when has posts
  const searchBar = (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={16} color={colors.secondaryText} style={{ marginLeft: spacing.md }} />
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Search people by name or @username"
        placeholderTextColor={colors.secondaryText}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );

  if (!authLoading && !user) {
    return (
      <SignInPrompt
        icon="people"
        title="Follow people you know"
        message="Sign in to follow friends and see their top ten lists in your feed."
        onSignIn={() => navigation.navigate('AuthScreen')}
      />
    );
  }

  if (loading) {
    return <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl * 2 }} />;
  }

  return (
    <FlatList
      data={hasPosts && !searchQuery ? posts : []}
      keyExtractor={(p) => p.id}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.activeTab} />
      }
      contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View>
          {/* Search bar — always visible */}
          <View style={styles.searchSection}>
            {searchBar}
          </View>

          {/* Search results */}
          {searchQuery.length >= 2 && (
            <View style={styles.searchResults}>
              {searchLoading ? (
                <ActivityIndicator color={colors.activeTab} style={{ padding: spacing.lg }} />
              ) : searchResults.length === 0 ? (
                <Text style={styles.noResults}>No users found for "{searchQuery}"</Text>
              ) : (
                searchResults.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onPress={() => { Keyboard.dismiss(); navigation.navigate('UserProfile', { userId: u.id }); }}
                  />
                ))
              )}
            </View>
          )}

          {/* Empty state — not following anyone */}
          {isFollowingNobody && !searchQuery && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people" size={40} color={colors.activeTab} />
              </View>
              <Text style={styles.emptyTitle}>Follow people to see their lists</Text>
              <Text style={styles.emptySub}>
                Search above, or browse the Local Feed and tap any publisher to follow them.
              </Text>
              <TouchableOpacity
                style={styles.findPeopleBtn}
                onPress={() => navigation.navigate('PeopleSearch')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={15} color="#FFF" />
                <Text style={styles.findPeopleBtnText}>Find People</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty state — following people but no posts yet */}
          {isFollowingButNoPosts && !searchQuery && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="newspaper-outline" size={40} color={colors.activeTab} />
              </View>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySub}>
                The people you follow haven't posted any lists yet. Follow more people to fill your feed.
              </Text>
              <TouchableOpacity
                style={styles.findPeopleBtn}
                onPress={() => navigation.navigate('PeopleSearch')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={15} color="#FFF" />
                <Text style={styles.findPeopleBtnText}>Find People</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Section label when showing posts and no active search */}
          {hasPosts && !searchQuery && (
            <View style={styles.feedLabelRow}>
              <Text style={styles.feedLabel}>Recent posts</Text>
            </View>
          )}
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
          onCommentPress={() => navigation.navigate('PublishedList', { postId: item.id })}
          onReact={(type) => {
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
            if (!supabase) return;
            if (type === null) {
              Promise.resolve(supabase.from('post_reactions').delete().eq('post_id', item.id).eq('user_id', user.id)).catch(() => {});
            } else {
              Promise.resolve(supabase.from('post_reactions').upsert({ post_id: item.id, user_id: user.id, reaction_type: type }, { onConflict: 'post_id,user_id' })).catch(() => {});
            }
          }}
        />
      )}
    />
  );
};

/* ── Local Feed tab ── */
const LocalFeedTab: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [location, setLocation] = useState<DetectedLocation | null | undefined>(undefined);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const citySlug = location?.city
    ? location.city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : null;

  useFocusEffect(useCallback(() => {
    getDetectedLocation().then(setLocation).catch(() => setLocation(null));
  }, []));

  const fetchPage = useCallback(async (from: number, slug: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from('community_feed_posts')
      .select('*')
      .eq('city_slug', slug)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    const fetched = await enrichPostsWithCounts((data ?? []).map(rowToPost), user?.id);
    if (from === 0) setPosts(fetched);
    else setPosts((prev) => [...prev, ...fetched]);
    setHasMore(fetched.length === PAGE_SIZE);
  }, [user?.id]);

  useEffect(() => {
    if (location === undefined) return; // still detecting
    if (!citySlug) { setLoading(false); return; }
    setLoading(true);
    fetchPage(0, citySlug).finally(() => setLoading(false));
  }, [citySlug]);

  const onRefresh = useCallback(async () => {
    if (!citySlug) return;
    setRefreshing(true);
    await fetchPage(0, citySlug);
    setRefreshing(false);
  }, [citySlug]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !citySlug) return;
    setLoadingMore(true);
    await fetchPage(posts.length, citySlug);
    setLoadingMore(false);
  };

  if (location === undefined || loading) {
    return <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl * 2 }} />;
  }

  if (!location || !citySlug) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="location" size={40} color={colors.activeTab} />
        </View>
        <Text style={styles.emptyTitle}>No city selected</Text>
        <Text style={styles.emptySub}>Set your city on the Home tab or in Account settings to see your local feed.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.activeTab} />
      }
      contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.localFeedHeader}>
          <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
          <Text style={styles.localFeedCity}>{formatLocationLabel(location)}</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="megaphone" size={40} color={colors.activeTab} />
          </View>
          <Text style={styles.emptyTitle}>No posts in {location.city} yet</Text>
          <Text style={styles.emptySub}>Be the first! Open any of your lists and tap Post to Local Feed.</Text>
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
          onCommentPress={() => navigation.navigate('PublishedList', { postId: item.id })}
          onReact={(type) => {
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
            if (!supabase) return;
            if (type === null) {
              Promise.resolve(supabase.from('post_reactions').delete().eq('post_id', item.id).eq('user_id', user.id)).catch(() => {});
            } else {
              Promise.resolve(supabase.from('post_reactions').upsert({ post_id: item.id, user_id: user.id, reaction_type: type }, { onConflict: 'post_id,user_id' })).catch(() => {});
            }
          }}
        />
      )}
    />
  );
};

/* ── Main FeedScreen ── */
export const FeedScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'following' | 'local'>('following');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={logoAsset} style={styles.logoIcon} />
          <Text style={styles.logoBold}>Feed</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('PeopleSearch')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={22} color={colors.primaryText} />
        </TouchableOpacity>
      </View>

      {/* Segment control */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => setActiveTab('following')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeTab === 'following' && styles.segmentTextActive]}>
            Following
          </Text>
          {activeTab === 'following' && <View style={styles.segmentIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => setActiveTab('local')}
          activeOpacity={0.7}
        >
          <Text style={[styles.segmentText, activeTab === 'local' && styles.segmentTextActive]}>
            Local Feed
          </Text>
          {activeTab === 'local' && <View style={styles.segmentIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={{ flex: 1, display: activeTab === 'following' ? 'flex' : 'none' }}>
        <FollowingTab navigation={navigation} />
      </View>
      <View style={{ flex: 1, display: activeTab === 'local' ? 'flex' : 'none' }}>
        <LocalFeedTab navigation={navigation} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: {
    width: 45,
    height: 45,
  },
  logoBold: {
    fontSize: 34,
    fontWeight: '800',
    color: '#CC0000',
    letterSpacing: -0.5,
    marginTop: 4,
  },

  /* ── Segment control ── */
  segmentRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginTop: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  segmentTextActive: {
    color: colors.primaryText,
  },
  segmentIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.activeTab,
  },

  /* ── Post row ── */
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
    paddingLeft: spacing.lg + 42 + spacing.md, // align with content col
    paddingRight: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  commentBtnText: {
    fontSize: 12,
    color: colors.primaryText,
    fontWeight: '600',
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
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  footerCity: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  /* ── Search ── */
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.primaryText,
    paddingRight: spacing.md,
  },
  searchResults: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  noResults: {
    textAlign: 'center',
    color: colors.secondaryText,
    fontSize: 14,
    padding: spacing.lg,
  },

  /* ── User row ── */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  userRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  userInfo: {
    flex: 1,
  },
  userDisplayName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  userUsername: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 1,
  },

  /* ── Feed label ── */
  feedLabelRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  feedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  /* ── Local feed header ── */
  localFeedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  localFeedCity: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },

  /* ── Empty states ── */
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(204,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 19,
  },
  findPeopleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.activeTab,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xs,
  },
  findPeopleBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
