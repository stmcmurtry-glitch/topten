import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { sendContactEmail } from '../services/emailService';

export const ContactScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const prefillSubject = route?.params?.subject ?? '';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(prefillSubject ? `Subject: ${prefillSubject}\n\n` : '');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !message.trim()) {
      Alert.alert('Missing info', 'Please enter your email and a message.');
      return;
    }
    setSending(true);
    try {
      await sendContactEmail({ name: name.trim(), email: email.trim(), message: message.trim() });
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, styles.thanksContainer, { paddingTop: insets.top }]}>
        <Ionicons name="checkmark-circle" size={56} color="#34C759" />
        <Text style={styles.thanksTitle}>Message Sent</Text>
        <Text style={styles.thanksSub}>We'll get back to you at {email.trim()}.</Text>
        <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl * 2 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name (optional)"
              placeholderTextColor={colors.secondaryText}
              returnKeyType="next"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.secondaryText}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="How can we help?"
              placeholderTextColor={colors.secondaryText}
              multiline
              textAlignVertical="top"
              returnKeyType="default"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!email.trim() || !message.trim() || sending) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={sending}
        >
          {sending
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.submitText}>Send Message</Text>
          }
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
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  thanksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  thanksTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: spacing.sm,
  },
  thanksSub: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },
  doneButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.activeTab,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  field: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: 16,
    color: colors.primaryText,
  },
  messageInput: {
    minHeight: 100,
    paddingTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.activeTab,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
