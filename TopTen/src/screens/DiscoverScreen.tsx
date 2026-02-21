import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

export const DiscoverScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Ionicons name="compass-outline" size={64} color={colors.secondaryText} />
      <Text style={styles.heading}>Discover</Text>
      <Text style={styles.body}>
        Browse and explore top 10 lists from the community.{'\n'}Coming soon!
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 24,
  },
});
