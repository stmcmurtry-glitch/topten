import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  context: 'local' | 'community';
}

export const SuggestListModal: React.FC<Props> = ({ visible, onClose, context }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const contextLabel = context === 'local' ? 'In Your Area' : "TopX People's Choice";

  const handleClose = () => {
    setText('');
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await Promise.resolve(
      supabase?.from('feedback').insert({
        user_id: user?.id ?? null,
        rating: 0,
        rating_label: `List Suggestion — ${contextLabel}`,
        message: text.trim(),
      })
    ).catch(() => {});
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Suggest a List</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={styles.successWrap}>
              <Ionicons name="checkmark-circle" size={56} color="#34C759" />
              <Text style={styles.successTitle}>Thanks for the idea!</Text>
              <Text style={styles.successSub}>
                We read every suggestion and use them to decide what lists to build next.
              </Text>
              <TouchableOpacity style={styles.doneButton} onPress={handleClose} activeOpacity={0.85}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="bulb-outline" size={34} color={colors.activeTab} />
              </View>
              <Text style={styles.subtitle}>
                What {context === 'local' ? 'local' : 'community'} list would you like to see?
              </Text>
              <Text style={styles.subtitleNote}>We want to hear from you — every suggestion is reviewed.</Text>

              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder={
                  context === 'local'
                    ? 'e.g. "Best coffee shops in Pittsburgh"'
                    : 'e.g. "Top 10 Comfort Foods of All Time"'
                }
                placeholderTextColor={colors.border}
                multiline
                textAlignVertical="top"
                autoFocus
                maxLength={500}
              />
              <Text style={styles.charCount}>{text.length} / 500</Text>

              <TouchableOpacity
                style={[styles.submitButton, (!text.trim() || submitting) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!text.trim() || submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={styles.submitButtonText}>Submit Suggestion</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  formContent: {
    paddingBottom: spacing.xl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(204,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
    lineHeight: 29,
    marginBottom: spacing.sm,
  },
  subtitleNote: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.primaryText,
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 12,
    color: colors.border,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  submitButton: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.1,
  },
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryText,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  successSub: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.md,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
