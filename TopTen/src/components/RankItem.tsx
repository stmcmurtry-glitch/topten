import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  rank: number;
  title: string;
  isEmpty: boolean;
  onPress: () => void;
}

export const RankItem: React.FC<Props> = ({ rank, title, isEmpty, onPress }) => {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
      {isEmpty ? (
        <>
          <Text style={styles.emptyText}>Empty</Text>
          <Ionicons name="add-circle-outline" size={22} color={colors.secondaryText} />
        </>
      ) : (
        <>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    gap: spacing.md,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.activeTab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
  },
  emptyText: {
    flex: 1,
    fontSize: 16,
    color: colors.secondaryText,
  },
});
