import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { useListContext } from '../data/ListContext';
import { PlansModal } from '../components/PlansModal';
import { sendFeedbackEmail } from '../services/emailService';
import {
  getDetectedLocation,
  clearLocationCache,
  DetectedLocation,
} from '../services/locationService';

const BASIC_LIMIT = 10;

/* ── Membership Card ── */
const MembershipCard: React.FC<{ onViewPlans: () => void }> = ({ onViewPlans }) => {
  const { lists } = useListContext();
  const used = lists.length;
  const fillPct = Math.min(used / BASIC_LIMIT, 1);
  const nearLimit = fillPct >= 0.8;

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberBody}>
        {/* Compact tier + CTA row */}
        <View style={styles.tierRow}>
          <View style={styles.tierLeft}>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>FREE</Text>
            </View>
            <Text style={styles.memberTier}>Basic</Text>
          </View>
          <TouchableOpacity style={styles.upgradeCta} onPress={onViewPlans} activeOpacity={0.85}>
            <Text style={styles.upgradeCtaText}>Upgrade</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.activeTab} />
          </TouchableOpacity>
        </View>

        {/* Usage bar */}
        <View style={styles.usageLabelRow}>
          <Text style={styles.usageLabel}>{used} of {BASIC_LIMIT} lists used</Text>
          {nearLimit && (
            <Text style={styles.usageCountWarn}>
              {used >= BASIC_LIMIT ? 'Limit reached' : 'Almost full'}
            </Text>
          )}
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
      </View>
    </View>
  );
};

/* ── Feedback Card ── */
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

const FeedbackCard: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Select a rating', 'Tap a star before sending.');
      return;
    }
    setSending(true);
    try {
      await sendFeedbackEmail({ rating, ratingLabel: RATING_LABELS[rating], message: text.trim() });
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.feedbackCard, styles.feedbackCardThanks]}>
        <Ionicons name="checkmark-circle" size={32} color="#34C759" />
        <Text style={styles.thanksTitle}>Thanks for your feedback!</Text>
      </View>
    );
  }

  return (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackTitle}>Rate Your Experience</Text>
        {rating > 0 && (
          <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
        )}
      </View>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? '#FF9500' : colors.border}
            />
          </TouchableOpacity>
        ))}
      </View>

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
        style={[styles.submitButton, (rating === 0 || sending) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        activeOpacity={0.8}
        disabled={sending}
      >
        {sending
          ? <ActivityIndicator color="#FFF" size="small" />
          : <Text style={styles.submitText}>Send Feedback</Text>
        }
      </TouchableOpacity>
    </View>
  );
};

/* ── Main Screen ── */
export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [plansVisible, setPlansVisible] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null | undefined>(undefined);

  useEffect(() => {
    getDetectedLocation().then(setDetectedLocation);
  }, []);

  const locationLabel = detectedLocation
    ? `${detectedLocation.city || detectedLocation.region}${detectedLocation.region && detectedLocation.city ? `, ${detectedLocation.region}` : ''}`
    : detectedLocation === null ? 'Unknown' : 'Detecting…';

  const handleResetLocation = () => {
    Alert.alert(
      'Reset Location',
      `Currently detected as ${locationLabel}. Reset to re-detect on next launch?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearLocationCache();
            setDetectedLocation(undefined);
            const fresh = await getDetectedLocation();
            setDetectedLocation(fresh);
          },
        },
      ]
    );
  };

  const sections = [
    {
      title: 'Preferences',
      data: [
        { label: 'Notifications', route: 'Notifications' },
        { label: 'Location', value: locationLabel, isLocation: true },
        { label: 'Privacy Policy', route: 'PrivacyPolicy' },
        { label: 'Contact Us', route: 'Contact' },
        { label: 'About', route: 'About' },
      ],
    },
  ];

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
            if (item.isLocation) {
              return (
                <TouchableOpacity
                  style={[styles.row, isLast && styles.rowLast]}
                  onPress={handleResetLocation}
                  activeOpacity={0.7}
                >
                  <Text style={styles.label}>{item.label}</Text>
                  <View style={styles.locationValue}>
                    <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
                    <Text style={styles.value}>{item.value}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (item.route) {
              return (
                <TouchableOpacity
                  style={[styles.row, isLast && styles.rowLast]}
                  onPress={() => navigation.navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.label}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                </TouchableOpacity>
              );
            }
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
  locationValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  /* ── Membership Card ── */
  memberCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  memberBody: {
    padding: spacing.md,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  tierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberTier: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  tierBadge: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.6,
  },
  usageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  usageLabel: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  usageCountWarn: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CC0000',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.activeTab,
  },
  progressFillWarn: {
    backgroundColor: '#FF3B30',
  },
  upgradeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upgradeCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.activeTab,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9500',
    letterSpacing: 0.2,
  },
  textInput: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 64,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontSize: 14,
    color: colors.primaryText,
  },
  submitButton: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: '#CC0000',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  thanksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
});
