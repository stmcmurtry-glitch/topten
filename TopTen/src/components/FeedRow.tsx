import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopTenList } from '../data/schema';
import { colors, spacing, borderRadius, shadow } from '../theme';

export const CATEGORY_COLORS: Record<string, string> = {
  Movies: '#FF6B6B',
  Books: '#4ECDC4',
  Foods: '#FFB347',
  Golf: '#6BCB77',
  Wine: '#C084D8',
  TV: '#5B8DEF',
};

interface FeedRowProps {
  list: TopTenList;
  onPress: () => void;
}

export const FeedRow: React.FC<FeedRowProps> = ({ list, onPress }) => {
  const thumbColor = CATEGORY_COLORS[list.category] ?? '#AAAAAA';
  const filled = list.items.length;

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
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.squircle,
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
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
  },
});
