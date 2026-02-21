import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopTenList } from '../data/schema';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface Props {
  list: TopTenList;
  onPress: () => void;
}

export const ListCard: React.FC<Props> = ({ list, onPress }) => {
  const filledCount = list.items.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Ionicons
        name={list.icon as any}
        size={32}
        color={colors.activeTab}
        style={styles.icon}
      />
      <Text style={styles.title} numberOfLines={2}>
        {list.title}
      </Text>
      <Text style={styles.count}>{filledCount}/10 items</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    margin: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    ...shadow,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  count: {
    fontSize: 13,
    color: colors.secondaryText,
  },
});
