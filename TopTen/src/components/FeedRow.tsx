import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopTenList } from '../data/schema';
import { colors, spacing, borderRadius, shadow } from '../theme';

export const CATEGORY_COLORS: Record<string, string> = {
  Movies: '#FF6B6B',
  TV: '#5B8DEF',
  Sports: '#FF9F43',
  Music: '#A29BFE',
  Food: '#FFB347',
  Drinks: '#00CEC9',
  // legacy
  Books: '#4ECDC4',
  Foods: '#FFB347',
  Golf: '#6BCB77',
  Wine: '#C084D8',
};

interface FeedRowProps {
  list: TopTenList;
  onPress: () => void;
  flat?: boolean;
}

export const FeedRow: React.FC<FeedRowProps> = ({ list, onPress, flat }) => {
  const thumbColor = CATEGORY_COLORS[list.category] ?? '#AAAAAA';
  const filled = list.items.length;

  if (flat) {
    return (
      <TouchableOpacity style={styles.flatRow} onPress={onPress} activeOpacity={0.6}>
        <View style={[styles.flatThumbnail, { backgroundColor: thumbColor }]}>
          <Ionicons name={list.icon as any} size={22} color="#FFF" />
        </View>
        <View style={styles.info}>
          <Text style={styles.flatTitle} numberOfLines={1}>{list.title}</Text>
          <Text style={styles.subtitle}>{filled} of 10 filled</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.border} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.thumbnail, { backgroundColor: thumbColor }]}>
        <Ionicons name={list.icon as any} size={28} color="#FFF" />
      </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
  },
});
