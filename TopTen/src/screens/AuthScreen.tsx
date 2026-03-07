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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface Props {
  navigation: any;
  route?: { params?: { onSuccess?: () => void } };
}

export const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const { signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle, error, clearError, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  // Close when user signs in
  useEffect(() => {
    if (!loading && user) {
      navigation.goBack();
    }
  }, [user, loading]);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);
    clearError();
    if (isSignUp) {
      await signUpWithEmail(email.trim(), password);
    } else {
      await signInWithEmail(email.trim(), password);
    }
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.secondaryText} />
        </TouchableOpacity>

        {/* Logo + headline */}
        <View style={styles.hero}>
          <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
          <View style={styles.wordmark}>
            <Text style={styles.wordmarkLight}>Top</Text>
            <Text style={styles.wordmarkBold}>Ten</Text>
          </View>
          <Text style={styles.subtitle}>Sign in to save your lists</Text>
        </View>

        {/* Apple Sign In */}
        <TouchableOpacity style={styles.appleButton} onPress={handleApple} activeOpacity={0.85}>
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
          <Text style={styles.appleButtonText}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* Google Sign In */}
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogle} activeOpacity={0.85}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email + Password */}
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Email"
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
            onSubmitEditing={handleEmailAuth}
          />
        </View>

        {/* Error message */}
        {!!error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Auth action buttons */}
        <View style={styles.authRow}>
          <TouchableOpacity
            style={[styles.authButton, !isSignUp && styles.authButtonActive, (submitting || !email || !password) && styles.authButtonDisabled]}
            onPress={() => { setIsSignUp(false); handleEmailAuth(); }}
            activeOpacity={0.8}
            disabled={submitting || !email || !password}
          >
            {submitting && !isSignUp
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={[styles.authButtonText, !isSignUp && styles.authButtonTextActive]}>Sign In</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.authButton, isSignUp && styles.authButtonActive, (submitting || !email || !password) && styles.authButtonDisabled]}
            onPress={() => { setIsSignUp(true); handleEmailAuth(); }}
            activeOpacity={0.8}
            disabled={submitting || !email || !password}
          >
            {submitting && isSignUp
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={[styles.authButtonText, isSignUp && styles.authButtonTextActive]}>Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity style={styles.skipButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.skipText}>Continue without account</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.secondaryText} />
        </TouchableOpacity>
      </ScrollView>
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
    alignSelf: 'flex-end',
    padding: spacing.xs,
    marginBottom: spacing.md,
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
    marginBottom: spacing.xl,
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
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
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
  authRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  authButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  authButtonActive: {
    backgroundColor: '#CC0000',
    borderColor: '#CC0000',
  },
  authButtonDisabled: {
    opacity: 0.45,
  },
  authButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  authButtonTextActive: {
    color: '#FFFFFF',
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
