import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';

export interface EditorsPick {
  id: string;
  title: string;
  category: string;
  icon: string;
  color: string;
}

interface PickCardProps {
  pick: EditorsPick;
}

export const PickCard: React.FC<PickCardProps> = ({ pick }) => {
  return (
    <View style={styles.card}>
      <View style={[styles.header, { backgroundColor: pick.color }]}>
        <Text style={styles.categoryLabel}>{pick.category.toUpperCase()}</Text>
        <Ionicons name={pick.icon as any} size={36} color="#FFF" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{pick.title}</Text>
        <Text style={styles.meta}>Featured · 10 items</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    borderRadius: borderRadius.squircle,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadow,
  },
  header: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  body: {
    padding: spacing.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: spacing.xs,
  },
  meta: {
    fontSize: 12,
    color: colors.secondaryText,
  },
});
