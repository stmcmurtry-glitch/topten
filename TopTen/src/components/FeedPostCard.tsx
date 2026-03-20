import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedPost } from '../data/feedTypes';
import { CATEGORY_COLORS } from './FeedRow';
import { colors, spacing, borderRadius, shadow } from '../theme';

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

interface Props {
  post: FeedPost;
  onPress: () => void;
  compact?: boolean;
}

export const FeedPostCard: React.FC<Props> = ({ post, onPress, compact }) => {
  const categoryColor = CATEGORY_COLORS[post.category] ?? '#CC0000';

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={onPress} activeOpacity={0.85}>
        <View style={[styles.compactColorBar, { backgroundColor: categoryColor }]} />
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <View style={[styles.compactCategoryPill, { backgroundColor: categoryColor + '18' }]}>
              <Text style={[styles.compactCategoryText, { color: categoryColor }]}>{post.category}</Text>
            </View>
            <Text style={styles.compactTime}>{timeAgo(post.publishedAt)}</Text>
          </View>
          <Text style={styles.compactTitle} numberOfLines={2}>{post.title.replace(/\s+/g, ' ').trim()}</Text>
          <View style={styles.compactItems}>
            {post.items.slice(0, 3).map((item, i) => (
              <View key={i} style={styles.compactItemRow}>
                <Text style={[styles.compactRank, { color: categoryColor }]}>{i + 1}</Text>
                <Text style={styles.compactItemText} numberOfLines={1}>{item.replace(/\s+/g, ' ').trim()}</Text>
              </View>
            ))}
          </View>
          <View style={styles.compactFooter}>
            {post.avatarUrl ? (
              <Image source={{ uri: post.avatarUrl }} style={styles.compactAvatar} />
            ) : (
              <View style={[styles.compactAvatar, styles.avatarFallback]}>
                <Ionicons name="person" size={10} color={colors.secondaryText} />
              </View>
            )}
            <Text style={styles.compactUsername} numberOfLines={1}>{post.username ?? 'Anonymous'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{post.title.replace(/\s+/g, ' ').trim()}</Text>

      {/* Blurb */}
      {!!post.blurb && (
        <Text style={styles.blurb} numberOfLines={2}>{post.blurb!.replace(/\s+/g, ' ').trim()}</Text>
      )}

      {/* Ranked items */}
      <View style={styles.items}>
        {post.items.slice(0, 3).map((item, i) => (
          <View key={i} style={styles.itemRow}>
            <Text style={[styles.rank, { color: categoryColor }]}>{i + 1}</Text>
            <Text style={styles.itemText} numberOfLines={1}>{item.replace(/\s+/g, ' ').trim()}</Text>
          </View>
        ))}
      </View>

      {/* Footer: avatar + username · time + category pill + chevron */}
      <View style={styles.footer}>
        {post.avatarUrl ? (
          <Image source={{ uri: post.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={12} color={colors.secondaryText} />
          </View>
        )}
        <Text style={styles.username}>{post.username ?? 'Anonymous'}</Text>
        <Text style={styles.sep}>·</Text>
        <Text style={styles.time}>{timeAgo(post.publishedAt)}</Text>
        <View style={styles.spacer} />
        <View style={[styles.categoryPill, { backgroundColor: categoryColor + '18' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{post.category}</Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color={colors.border} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  /* ── Compact carousel card ── */
  compactCard: {
    width: 165,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadow,
    shadowOpacity: 0.07,
  },
  compactColorBar: {
    height: 4,
  },
  compactContent: {
    padding: spacing.sm + 2,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  compactCategoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  compactTime: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    lineHeight: 18,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  compactItems: {
    gap: 4,
    marginBottom: 8,
  },
  compactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactRank: {
    fontSize: 11,
    fontWeight: '800',
    width: 14,
    textAlign: 'right',
  },
  compactItemText: {
    fontSize: 11,
    color: colors.primaryText,
    fontWeight: '500',
    flex: 1,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  compactAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  compactUsername: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
    flex: 1,
  },

  /* ── Full-width card ── */
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    ...shadow,
    shadowOpacity: 0.07,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primaryText,
    lineHeight: 23,
    letterSpacing: -0.4,
    marginBottom: 5,
  },
  blurb: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  items: {
    gap: 7,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rank: {
    fontSize: 14,
    fontWeight: '800',
    width: 18,
    textAlign: 'right',
  },
  itemText: {
    fontSize: 14,
    color: colors.primaryText,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  sep: {
    fontSize: 12,
    color: colors.border,
  },
  time: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  spacer: {
    flex: 1,
  },
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
