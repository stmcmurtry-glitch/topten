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
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { sendReportEmail } from '../services/emailService';

interface Props {
  visible: boolean;
  onClose: () => void;
  listTitle: string;
  listType: 'Featured' | 'Community' | 'Personal';
}

export const ReportIssueModal: React.FC<Props> = ({ visible, onClose, listTitle, listType }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError(false);
    try {
      await sendReportEmail({ listTitle, listType, message: message.trim() });
      setSent(true);
      setMessage('');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(false);
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.header}>
              <Ionicons name="flag-outline" size={20} color={colors.secondaryText} />
              <Text style={styles.title}>Report an Issue</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            {sent ? (
              <View style={styles.successState}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#22c55e" />
                <Text style={styles.successText}>Thanks! We'll look into it.</Text>
                <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Spotted a factual error or broken feature?{'\n'}We read every report.
                </Text>
                <Text style={styles.note}>Not for opinions about rankings.</Text>

                <View style={styles.listPill}>
                  <Ionicons name="list-outline" size={13} color={colors.secondaryText} />
                  <Text style={styles.listPillText} numberOfLines={1}>{listTitle}</Text>
                </View>

                <TextInput
                  style={styles.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe the issue…"
                  placeholderTextColor={colors.secondaryText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {error && (
                  <Text style={styles.errorText}>
                    Couldn't send — check your connection and try again.
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                  onPress={handleSend}
                  disabled={loading || !message.trim()}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={styles.sendButtonText}>Send Report</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 8,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  note: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
    marginTop: -spacing.xs,
  },
  listPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  listPillText: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '500',
    flexShrink: 1,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primaryText,
    minHeight: 96,
    lineHeight: 21,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginTop: -spacing.xs,
  },
  sendButton: {
    backgroundColor: colors.activeTab,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
  },
  doneButton: {
    backgroundColor: colors.activeTab,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
