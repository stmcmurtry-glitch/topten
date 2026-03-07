import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface Props {
  onSignIn: () => void;
}

export const InYourAreaLockCard: React.FC<Props> = ({ onSignIn }) => (
  <View style={styles.card}>
    <Ionicons name="location-outline" size={22} color="#CC0000" />
    <View style={styles.textGroup}>
      <Text style={styles.title}>Sign in to see local picks</Text>
      <Text style={styles.subtitle}>Discover top spots near you</Text>
    </View>
    <TouchableOpacity style={styles.button} onPress={onSignIn} activeOpacity={0.85}>
      <Text style={styles.buttonText}>Sign In</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.06,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  button: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
