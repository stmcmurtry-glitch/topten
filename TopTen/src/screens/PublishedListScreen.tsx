import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { supabase } from '../services/supabase';
import { FeedPost } from '../data/feedTypes';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { rowToPost } from '../hooks/useCityFeedPreview';

function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(epochMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const PublishedListScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { postId } = route.params as { postId: string };
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from('community_feed_posts')
      .select('*')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (data) setPost(rowToPost(data));
        setLoading(false);
      });
  }, [postId]);

  const handleShare = async () => {
    if (!post) return;
    const text = [
      `${post.title} — shared from TopX`,
      ...post.items.slice(0, 5).map((item, i) => `${i + 1}. ${item}`),
    ].join('\n');
    Share.share({ message: text });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl }} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtnAbs} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <BlurView intensity={50} tint="light" style={styles.backBtnInner}>
            <Ionicons name="chevron-back" size={20} color={colors.primaryText} />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.notFound}>Post not found.</Text>
      </View>
    );
  }

  const categoryColor = CATEGORY_COLORS[post.category] ?? '#CC0000';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 52 }]}>
          {post.coverImageUri ? (
            <Image source={{ uri: post.coverImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <>
              <LinearGradient
                colors={['#000000', categoryColor]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          )}
          <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />

          {/* Nav */}
          <View style={[styles.heroNav, { top: insets.top + 8 }]}>
            <TouchableOpacity style={styles.heroNavBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <BlurView intensity={60} tint="dark" style={styles.heroNavBtnInner}>
                <Ionicons name="chevron-back" size={20} color="#FFF" />
              </BlurView>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroNavBtn} onPress={handleShare} activeOpacity={0.75}>
              <BlurView intensity={60} tint="dark" style={styles.heroNavBtnInner}>
                <Ionicons name="share-outline" size={18} color="#FFF" />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Hero content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroCategory}>{post.category.toUpperCase()}</Text>
            <Text style={styles.heroTitle} numberOfLines={3}>{post.title.replace(/\s+/g, ' ').trim()}</Text>
          </View>
        </View>

        {/* Publisher row */}
        <View style={styles.publisherRow}>
          {post.avatarUrl ? (
            <Image source={{ uri: post.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={16} color={colors.secondaryText} />
            </View>
          )}
          <View style={styles.publisherInfo}>
            <Text style={styles.publisherName}>{post.username ?? 'Anonymous'}</Text>
            <Text style={styles.publisherMeta}>{timeAgo(post.publishedAt)} · {post.cityName}</Text>
          </View>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{post.category}</Text>
          </View>
        </View>

        {/* Blurb */}
        {!!post.blurb && (
          <Text style={styles.blurb}>{post.blurb!.replace(/\s+/g, ' ').trim()}</Text>
        )}

        {/* Numbered items */}
        <View style={styles.itemsList}>
          {post.items.map((item, i) => (
            <React.Fragment key={i}>
              <View style={styles.itemRow}>
                <Text style={styles.itemRank}>{i + 1}</Text>
                <Text style={styles.itemTitle}>{item.replace(/\s+/g, ' ').trim()}</Text>
              </View>
              {i < post.items.length - 1 && <View style={styles.itemDivider} />}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFound: {
    textAlign: 'center',
    marginTop: spacing.xxl,
    color: colors.secondaryText,
    fontSize: 15,
  },
  hero: {
    minHeight: 200,
    justifyContent: 'flex-end',
  },
  heroScrim: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroNav: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroNavBtn: {},
  heroNavBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publisherInfo: {
    flex: 1,
  },
  publisherName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  publisherMeta: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  categoryPill: {
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.activeTab,
  },
  blurb: {
    fontSize: 15,
    fontStyle: 'italic',
    color: colors.secondaryText,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  itemsList: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 22 + spacing.md,
  },
  itemRank: {
    width: 22,
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
    textAlign: 'right',
    marginTop: 2,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 22,
  },
  backBtnAbs: {
    margin: spacing.lg,
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
});
