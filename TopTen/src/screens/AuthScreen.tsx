import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface Props {
  navigation: any;
}

export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const { signInWithEmail, signInWithApple, signInWithGoogle, error, clearError, user, loading, needsOnboarding, profileChecked } = useAuth();
  const googleEnabled = !!(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  // Only navigate when this screen is focused (not when CreateAccount is on top)
  useEffect(() => {
    if (!loading && profileChecked && user && isFocused) {
      if (needsOnboarding) {
        navigation.navigate('ProfileSetup');
      } else {
        navigation.goBack();
      }
    }
  }, [user, loading, needsOnboarding, profileChecked, isFocused]);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    clearError();
    await signInWithEmail(email.trim(), password);
    setSubmitting(false);
  };

  const handleApple = async () => {
    clearError();
    await signInWithApple();
  };

  const handleGoogle = async () => {
    clearError();
    await signInWithGoogle();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.secondaryText} />
        </TouchableOpacity>

        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: spacing.xxl + 24, paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + headline */}
          <View style={styles.hero}>
            <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
            <View style={styles.wordmark}>
              <Text style={styles.wordmarkLight}>Top</Text>
              <Text style={styles.wordmarkBold}>X</Text>
            </View>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          {/* Apple Sign In */}
          <TouchableOpacity style={styles.appleButton} onPress={handleApple} activeOpacity={0.85}>
            <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          {/* Google Sign In */}
          {googleEnabled && (
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} activeOpacity={0.85}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email + Password */}
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="Email or Username"
              placeholderTextColor={colors.secondaryText}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
            />
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.secondaryText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.signInButton, (submitting || !email || !password) && styles.buttonDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={submitting || !email || !password}
          >
            {submitting
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.signInButtonText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Create Account link */}
          <View style={styles.createRow}>
            <Text style={styles.createLabel}>New here?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CreateAccount')} activeOpacity={0.7}>
              <Text style={styles.createLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Skip */}
          <TouchableOpacity style={styles.skipButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.skipText}>Continue without account</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.secondaryText} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.xs,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoIcon: {
    width: 64,
    height: 64,
    marginBottom: spacing.sm,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  wordmarkLight: {
    fontSize: 36,
    fontWeight: '300',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  wordmarkBold: {
    fontSize: 36,
    fontWeight: '800',
    color: '#CC0000',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    fontWeight: '400',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#000000',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    marginBottom: spacing.md,
    ...shadow,
    shadowOpacity: 0.12,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow,
    shadowOpacity: 0.06,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
    letterSpacing: 0.1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  inputGroup: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.05,
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.primaryText,
  },
  inputDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadow,
    shadowOpacity: 0.1,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  createRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  createLabel: {
    fontSize: 15,
    color: colors.secondaryText,
  },
  createLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CC0000',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  skipText: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
});
