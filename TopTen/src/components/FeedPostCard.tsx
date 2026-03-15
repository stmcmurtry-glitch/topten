import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FeedPost } from '../data/feedTypes';
import { CATEGORY_COLORS } from './FeedRow';
import { colors, spacing, borderRadius, shadow } from '../theme';

function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(epochMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  post: FeedPost;
  onPress: () => void;
}

export const FeedPostCard: React.FC<Props> = ({ post, onPress }) => {
  const categoryColor = CATEGORY_COLORS[post.category] ?? '#CC0000';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header image or gradient */}
      <View style={[styles.header, { backgroundColor: categoryColor }]}>
        <LinearGradient
          colors={['#000000', categoryColor]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {post.coverImageUri ? (
          <Image source={{ uri: post.coverImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        <Text style={styles.categoryLabel}>{post.category.toUpperCase()}</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{post.title}</Text>

        {/* Publisher row */}
        <View style={styles.publisherRow}>
          {post.avatarUrl ? (
            <Image source={{ uri: post.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={10} color={colors.secondaryText} />
            </View>
          )}
          <Text style={styles.username} numberOfLines={1}>
            {post.username ?? 'Anonymous'}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timeAgo}>{timeAgo(post.publishedAt)}</Text>
        </View>

        {/* Top items preview */}
        {post.items.slice(0, 3).map((item, i) => (
          <Text key={i} style={styles.item} numberOfLines={1}>
            {i + 1}. {item}
          </Text>
        ))}

        {/* Blurb */}
        {!!post.blurb && (
          <Text style={styles.blurb} numberOfLines={2}>{post.blurb}</Text>
        )}

        {/* Footer pills */}
        <View style={styles.footer}>
          <View style={styles.pill}>
            <Ionicons name="location-sharp" size={11} color={colors.activeTab} />
            <Text style={styles.pillText}>{post.cityName}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 180,
    borderRadius: borderRadius.squircle,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadow,
  },
  header: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  categoryLabel: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  body: {
    padding: spacing.sm + 2,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    lineHeight: 17,
    marginBottom: 2,
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  avatarPlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.secondaryText,
    flex: 1,
  },
  dot: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  timeAgo: {
    fontSize: 11,
    color: colors.secondaryText,
    flexShrink: 0,
  },
  item: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 17,
  },
  blurb: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.secondaryText,
    lineHeight: 16,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 6,
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.activeTab,
  },
});
