import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { useListContext } from '../data/ListContext';
import { PlansModal } from '../components/PlansModal';

const BASIC_LIMIT = 10;

const sections = [
  {
    title: 'App',
    data: [
      { label: 'Version', value: '1.0.0' },
      { label: 'Theme', value: 'System' },
    ],
  },
  {
    title: 'About',
    data: [
      { label: 'Developer', value: 'Top Ten Team' },
      { label: 'Built with', value: 'Expo + React Native' },
    ],
  },
];

/* ── Membership Card ── */
const MembershipCard: React.FC<{ onViewPlans: () => void }> = ({ onViewPlans }) => {
  const { lists } = useListContext();
  const used = lists.length;
  const fillPct = Math.min(used / BASIC_LIMIT, 1);
  const nearLimit = fillPct >= 0.8;

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberBody}>
        {/* Tier row */}
        <View style={styles.tierRow}>
          <View>
            <Text style={styles.memberLabel}>YOUR PLAN</Text>
            <Text style={styles.memberTier}>Basic</Text>
          </View>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>FREE</Text>
          </View>
        </View>

        {/* Usage bar */}
        <View style={styles.usageSection}>
          <View style={styles.usageLabelRow}>
            <Text style={styles.usageLabel}>Lists used</Text>
            <Text style={[styles.usageCount, nearLimit && styles.usageCountWarn]}>
              {used} of {BASIC_LIMIT}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${fillPct * 100}%` as any },
                nearLimit && styles.progressFillWarn,
              ]}
            />
          </View>
          {nearLimit && used < BASIC_LIMIT && (
            <Text style={styles.usageWarnText}>Almost at your limit — upgrade for more.</Text>
          )}
          {used >= BASIC_LIMIT && (
            <Text style={styles.usageWarnText}>List limit reached. Upgrade to add more.</Text>
          )}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.upgradeCta} onPress={onViewPlans} activeOpacity={0.85}>
          <Text style={styles.upgradeCtaText}>View Plans</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ── Feedback Card ── */
const FeedbackCard: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Select a rating', 'Tap a star before sending.');
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <View style={[styles.feedbackCard, styles.feedbackCardThanks]}>
        <Ionicons name="checkmark-circle" size={48} color="#34C759" />
        <Text style={styles.thanksTitle}>Thanks for your feedback!</Text>
        <Text style={styles.thanksSub}>We read every response and use it to improve Top Ten.</Text>
      </View>
    );
  }

  return (
    <View style={styles.feedbackCard}>
      <Text style={styles.feedbackTitle}>Rate Your Experience</Text>
      <Text style={styles.feedbackSub}>How are you enjoying Top Ten?</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={44}
              color={star <= rating ? '#FF9500' : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>

      {rating > 0 && (
        <Text style={styles.ratingLabel}>
          {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
        </Text>
      )}

      <TextInput
        style={styles.textInput}
        value={text}
        onChangeText={setText}
        placeholder="Tell us more… (optional)"
        placeholderTextColor={colors.secondaryText}
        multiline
        textAlignVertical="top"
        returnKeyType="default"
      />

      <TouchableOpacity
        style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>Send Feedback</Text>
      </TouchableOpacity>
    </View>
  );
};

/* ── Main Screen ── */
export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [plansVisible, setPlansVisible] = useState(false);

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SectionList
          style={styles.container}
          sections={sections}
          keyExtractor={(item) => item.label}
          ListHeaderComponent={
            <View style={{ paddingTop: insets.top + spacing.sm }}>
              <View style={styles.titleBar}>
                <Text style={styles.title}>Account</Text>
              </View>
              {/* Membership section */}
              <Text style={styles.sectionHeader}>Membership</Text>
              <MembershipCard onViewPlans={() => setPlansVisible(true)} />
            </View>
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item, index, section }) => {
            const isLast = index === section.data.length - 1;
            return (
              <View style={[styles.row, isLast && styles.rowLast]}>
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={styles.feedbackSection}>
              <Text style={styles.sectionHeader}>Feedback</Text>
              <FeedbackCard />
            </View>
          }
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>

      <PlansModal
        visible={plansVisible}
        currentTier="basic"
        onClose={() => setPlansVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl * 2,
  },
  titleBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    color: colors.primaryText,
  },
  value: {
    fontSize: 16,
    color: colors.secondaryText,
  },

  /* ── Membership Card ── */
  memberCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.08,
  },
  memberAccent: {
    height: 4,
    backgroundColor: '#CC0000',
  },
  memberBody: {
    padding: spacing.lg,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  memberLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 1,
    marginBottom: 3,
  },
  memberTier: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  tierBadge: {
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  usageSection: {
    marginBottom: spacing.lg,
  },
  usageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  usageLabel: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  usageCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  usageCountWarn: {
    color: '#CC0000',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#CC0000',
  },
  progressFillWarn: {
    backgroundColor: '#FF3B30',
  },
  usageWarnText: {
    fontSize: 12,
    color: '#CC0000',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  upgradeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  upgradeCtaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Feedback section ── */
  feedbackSection: {
    marginBottom: spacing.lg,
  },
  feedbackCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.08,
  },
  feedbackCardThanks: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  feedbackAccent: {
    height: 4,
    backgroundColor: '#CC0000',
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
  },
  feedbackSub: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
    marginHorizontal: spacing.lg,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  textInput: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    minHeight: 90,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: 15,
    color: colors.primaryText,
  },
  submitButton: {
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: '#CC0000',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  thanksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: spacing.sm,
  },
  thanksSub: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
