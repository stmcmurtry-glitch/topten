import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopTenList } from '../data/schema';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { ListThumbnail } from './ListThumbnail';
import { CATEGORY_COLORS } from '../data/categories';
export { CATEGORY_COLORS } from '../data/categories';

interface FeedRowProps {
  list: TopTenList;
  onPress: () => void;
  flat?: boolean;
  rank?: number;
  onPressThumb?: () => void;
}

export const FeedRow: React.FC<FeedRowProps> = ({ list, onPress, flat, rank, onPressThumb }) => {
  const thumbColor = CATEGORY_COLORS[list.category] ?? '#AAAAAA';
  const filled = list.items.length;

  if (flat) {
    return (
      <TouchableOpacity style={styles.flatRow} onPress={onPress} activeOpacity={0.6}>
        {rank !== undefined && (
          <Text style={styles.rankNumber}>{rank}</Text>
        )}
        <TouchableOpacity onPress={onPressThumb ?? onPress} activeOpacity={0.75} disabled={!onPressThumb}>
          <View>
            <ListThumbnail list={list} size={44} radius={9} />
            {onPressThumb && (
              <View style={styles.thumbEditBadge}>
                <Ionicons name="camera" size={8} color="#FFF" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.info}>
          <Text style={styles.flatTitle} numberOfLines={1}>{list.title}</Text>
          <Text style={styles.subtitle}>{filled} of 10 filled</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.border} />
      </TouchableOpacity>
    );
  }


  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <ListThumbnail list={list} size={60} radius={14} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{list.title}</Text>
        <Text style={styles.subtitle}>{filled} of 10 filled</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...shadow,
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    gap: spacing.sm + 2,
  },
  rankNumber: {
    width: 16,
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    textAlign: 'right',
    opacity: 0.6,
    flexShrink: 0,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.squircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flatThumbnail: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  flatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondaryText,
  },
});
