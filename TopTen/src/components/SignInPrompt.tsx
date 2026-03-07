import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface Props {
  icon: string;
  title: string;
  message: string;
  onSignIn: () => void;
}

export const SignInPrompt: React.FC<Props> = ({ icon, title, message, onSignIn }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon as any} size={48} color={colors.secondaryText} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={styles.signInButton} onPress={onSignIn} activeOpacity={0.85}>
        <Text style={styles.signInText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => {}} activeOpacity={0.7} style={styles.guestButton}>
        <Text style={styles.guestText}>Continue as Guest</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadow,
    shadowOpacity: 0.07,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  signInButton: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl + spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
    shadowOpacity: 0.12,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  guestButton: {
    paddingVertical: spacing.sm,
  },
  guestText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
});
