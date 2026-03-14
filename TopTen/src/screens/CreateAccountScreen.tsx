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

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export const CreateAccountScreen: React.FC<Props> = ({ navigation }) => {
  const { signUpWithEmail, error, clearError, user, loading, profileChecked } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  // After signup succeeds, once profile is checked → go to ProfileSetup
  useEffect(() => {
    if (submitted && !loading && profileChecked && user && isFocused) {
      navigation.navigate('ProfileSetup');
    }
  }, [user, loading, profileChecked, submitted, isFocused]);

  // Reflect auth-level errors (e.g. duplicate email)
  useEffect(() => {
    if (error) setLocalError(null);
  }, [error]);

  const handleCreate = async () => {
    setLocalError(null);
    clearError();

    if (!email.trim()) { setLocalError('Please enter your email.'); return; }
    if (!username.trim()) { setLocalError('Please choose a username.'); return; }
    if (!USERNAME_REGEX.test(username)) {
      setLocalError('Username must be 3–20 characters: letters, numbers, and underscores only.');
      return;
    }
    if (password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setLocalError("Passwords don't match."); return; }

    setSubmitting(true);
    await signUpWithEmail(email.trim(), password, username.trim());
    setSubmitting(false);
    setSubmitted(true);
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join to save your lists and connect with the community</Text>
          </View>

          {/* Fields */}
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
              textContentType="emailAddress"
              autoComplete="email"
            />
            <View style={styles.inputDivider} />
            <View style={styles.usernameRow}>
              <Text style={styles.usernameAt}>@</Text>
              <TextInput
                style={[styles.input, styles.usernameInput]}
                placeholder="Username"
                placeholderTextColor={colors.secondaryText}
                value={username}
                onChangeText={(t) => setUsername(t.replace(/\s/g, '').toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="username"
                autoComplete="username"
              />
            </View>
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.secondaryText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
              textContentType="none"
              autoComplete="off"
            />
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={colors.secondaryText}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              textContentType="oneTimeCode"
              autoComplete="off"
            />
          </View>

          <Text style={styles.usernameHint}>Used to identify you in community rankings. 3–20 chars, letters/numbers/underscores.</Text>

          {!!displayError && <Text style={styles.errorText}>{displayError}</Text>}

          <TouchableOpacity
            style={[styles.createButton, (submitting || !email || !username || !password || !confirmPassword) && styles.buttonDisabled]}
            onPress={handleCreate}
            activeOpacity={0.85}
            disabled={submitting || !email || !username || !password || !confirmPassword}
          >
            {submitting
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.createButtonText}>Create Account</Text>
            }
          </TouchableOpacity>

          <View style={styles.signInRow}>
            <Text style={styles.signInLabel}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
  backButton: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoIcon: {
    width: 56,
    height: 56,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 21,
  },
  inputGroup: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
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
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
  },
  usernameAt: {
    fontSize: 16,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  usernameInput: {
    flex: 1,
    paddingLeft: 2,
  },
  inputDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  usernameHint: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  createButton: {
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
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  signInLabel: {
    fontSize: 15,
    color: colors.secondaryText,
  },
  signInLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CC0000',
  },
});
