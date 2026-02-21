import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopTenList } from '../data/schema';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface Props {
  list: TopTenList;
  onPress: () => void;
}

export const ListCard: React.FC<Props> = ({ list, onPress }) => {
  const filledCount = list.items.length;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressable}
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
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
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    margin: spacing.sm,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
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
