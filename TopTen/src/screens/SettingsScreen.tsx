import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SectionList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';
import { getIsPremium, setDevPremiumOverride, getDevPremiumOverride } from '../services/premiumService';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { useListContext } from '../data/ListContext';
import { PlansModal } from '../components/PlansModal';
import { sendFeedbackEmail } from '../services/emailService';
import { supabase } from '../services/supabase';
import {
  getDetectedLocation,
  DetectedLocation,
  formatLocationLabel,
} from '../services/locationService';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { useAuth } from '../context/AuthContext';

const BASIC_LIMIT = 50;

/* ── Membership Card ── */
const MembershipCard: React.FC<{ isPremium: boolean; onViewPlans: () => void }> = ({ isPremium, onViewPlans }) => {
  const { lists } = useListContext();
  const used = lists.length;
  const fillPct = Math.min(used / BASIC_LIMIT, 1);
  const nearLimit = fillPct >= 0.8;

  if (isPremium) {
    return (
      <View style={styles.memberCard}>
        <View style={styles.memberBody}>
          <View style={styles.tierRow}>
            <View style={styles.tierLeft}>
              <View style={[styles.tierBadge, styles.tierBadgePremium]}>
                <Text style={[styles.tierBadgeText, styles.tierBadgeTextPremium]}>PREMIUM</Text>
              </View>
              <Text style={styles.memberTier}>Premium</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          </View>
          <Text style={styles.premiumSubLabel}>Unlimited lists · Full search · No ads</Text>
        </View>
        <View style={styles.profileDivider} />
        <TouchableOpacity
          style={styles.manageSubRow}
          onPress={() => Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')}
          activeOpacity={0.7}
        >
          <Text style={styles.manageSubText}>Manage Subscription</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>
    );
  }

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
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Select a rating', 'Tap a star before sending.');
      return;
    }
    if (!text.trim()) {
      Alert.alert('Add a message', 'Please share a few words about your experience.');
      return;
    }
    setSending(true);
    try {
      await sendFeedbackEmail({ rating, ratingLabel: RATING_LABELS[rating], message: text.trim() });
      // Log to Supabase — fire and forget, don't block on failure
      supabase?.from('feedback').insert({
        user_id: user?.id ?? null,
        rating,
        rating_label: RATING_LABELS[rating],
        message: text.trim() || null,
      }).then(() => {});
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
        <View>
          <Text style={styles.feedbackTitle}>Rate Your Experience</Text>
          <Text style={styles.feedbackSubtitle}>Sent directly to the TopX team</Text>
        </View>
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
        placeholder="Tell us more…"
        placeholderTextColor={colors.secondaryText}
        multiline
        textAlignVertical="top"
        returnKeyType="default"
      />

      <TouchableOpacity
        style={[styles.submitButton, (rating === 0 || !text.trim() || sending) && styles.submitButtonDisabled]}
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
  const { user, userProfile, signOut, updateAvatar } = useAuth();

  const [plansVisible, setPlansVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null | undefined>(undefined);
  const [changeLocationVisible, setChangeLocationVisible] = useState(false);

  const [devPremiumOverride, setDevPremiumOverrideState] = useState<boolean | null>(null);

  useEffect(() => {
    if (__DEV__) getDevPremiumOverride().then(setDevPremiumOverrideState);
  }, []);

  const checkPremium = () => {
    getIsPremium().then(setIsPremium);
  };

  const toggleDevPremium = async () => {
    const next = devPremiumOverride === true ? false : true;
    await setDevPremiumOverride(next);
    setDevPremiumOverrideState(next);
    setIsPremium(next);
  };

  useEffect(() => {
    if (user) getDetectedLocation().then(setDetectedLocation);
    checkPremium();
  }, [user]);

  const pickAvatarImage = async (source: 'library' | 'camera') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Access', 'Please allow camera access in Settings to take a photo.');
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Photo Access', 'Please allow photo library access in Settings to choose a photo.');
        return;
      }
    }
    const result = source === 'library'
      ? await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setUploadingAvatar(true);
      const err = await updateAvatar(result.assets[0].uri);
      setUploadingAvatar(false);
      if (err) Alert.alert('Error', err);
    }
  };

  const handleAvatarPress = () => {
    const hasPhoto = !!userProfile?.avatar_url;
    const options = ['Cancel', 'Choose from Library', 'Take Photo', ...(hasPhoto ? ['Remove Photo'] : [])];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Profile Photo', options, cancelButtonIndex: 0, destructiveButtonIndex: hasPhoto ? 3 : undefined },
      async (idx) => {
        if (idx === 1) await pickAvatarImage('library');
        if (idx === 2) await pickAvatarImage('camera');
        if (idx === 3 && hasPhoto) {
          setUploadingAvatar(true);
          await updateAvatar(null);
          setUploadingAvatar(false);
        }
      }
    );
  };

  const locationLabel = detectedLocation
    ? formatLocationLabel(detectedLocation)
    : detectedLocation === null ? 'Unknown' : 'Detecting…';

  type SettingItem = {
    label: string;
    route?: string;
    routeParams?: Record<string, unknown>;
    value?: string;
    isLocation?: boolean;
    isDestructive?: boolean;
    requiresAuth?: boolean;
    onPress?: () => void;
  };
  const sections: Array<{ title: string; data: SettingItem[] }> = [
    {
      title: 'Preferences',
      data: [
        { label: 'Location', value: user ? locationLabel : '', isLocation: true },
        { label: 'Voting Preferences', route: 'VotingPreferences' },
        { label: 'Your Data', route: 'YourData', requiresAuth: true },
      ],
    },
    {
      title: 'Info',
      data: [
        { label: 'FAQ', route: 'FAQ' },
        { label: 'Privacy Policy', route: 'PrivacyPolicy' },
        { label: 'Terms of Use', onPress: () => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/') },
        { label: 'About', route: 'About' },
        { label: 'Contact Us', route: 'Contact' },
      ],
    },
    ...(__DEV__ ? [{
      title: '🛠 Dev Tools',
      data: [
        {
          label: `Premium override: ${devPremiumOverride === true ? 'ON' : devPremiumOverride === false ? 'OFF' : 'unset (uses RevenueCat)'}`,
          onPress: toggleDevPremium,
        } as SettingItem,
      ],
    }] : []),
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
            <View style={{ paddingTop: insets.top + spacing.md }}>
              <View style={styles.titleBar}>
                <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
                <Text style={styles.title}>Account</Text>
              </View>

              {/* Auth section */}
              <Text style={styles.sectionHeader}>Profile</Text>
              {user ? (
                <View style={styles.profileCard}>
                  <View style={styles.profileRow}>
                    <TouchableOpacity style={styles.profileAvatar} onPress={handleAvatarPress} activeOpacity={0.8}>
                      {userProfile?.avatar_url ? (
                        <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="person" size={22} color={colors.secondaryText} />
                      )}
                      <View style={styles.cameraBadge}>
                        {uploadingAvatar
                          ? <ActivityIndicator size="small" color="#FFF" style={{ transform: [{ scale: 0.55 }] }} />
                          : <Ionicons name="camera" size={10} color="#FFF" />
                        }
                      </View>
                    </TouchableOpacity>
                    <View style={styles.profileInfo}>
                      {userProfile?.username ? (
                        <Text style={styles.profileEmail}>@{userProfile.username}</Text>
                      ) : null}
                      <Text style={[styles.profileSince, !userProfile?.username && styles.profileEmail]} numberOfLines={1}>
                        {user.email}
                      </Text>
                      <Text style={styles.profileSince}>
                        Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.profileDivider} />
                  <TouchableOpacity
                    style={styles.editProfileRow}
                    onPress={() => navigation.navigate('EditProfile')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editProfileText}>Edit Profile</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                  </TouchableOpacity>
                  <View style={styles.profileDivider} />
                  <TouchableOpacity
                    style={styles.signOutRow}
                    onPress={signOut}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.signInCard}>
                  <View style={styles.tierRow}>
                    <View style={styles.tierLeft}>
                      <View style={styles.tierBadge}>
                        <Text style={styles.tierBadgeText}>GUEST</Text>
                      </View>
                      <Text style={styles.memberTier}>Not signed in</Text>
                    </View>
                    <TouchableOpacity style={styles.upgradeCta} onPress={() => navigation.navigate('AuthScreen')} activeOpacity={0.85}>
                      <Text style={styles.upgradeCtaText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={12} color={colors.activeTab} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.premiumSubLabel}>Sign in to save lists · community voting · local picks</Text>
                </View>
              )}

              {/* Membership section */}
              <Text style={styles.sectionHeader}>Membership</Text>
              {user ? (
                <MembershipCard isPremium={isPremium} onViewPlans={() => setPlansVisible(true)} />
              ) : (
                <View style={styles.memberCard}>
                  <View style={styles.memberBody}>
                    <View style={styles.tierRow}>
                      <View style={styles.tierLeft}>
                        <View style={styles.tierBadge}>
                          <Text style={styles.tierBadgeText}>FREE</Text>
                        </View>
                        <Text style={styles.memberTier}>Basic</Text>
                      </View>
                      <TouchableOpacity style={styles.upgradeCta} onPress={() => navigation.navigate('AuthScreen')} activeOpacity={0.85}>
                        <Text style={styles.upgradeCtaText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={12} color={colors.activeTab} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.premiumSubLabel}>Sign in to manage membership and upgrade</Text>
                  </View>
                </View>
              )}
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
                  onPress={() => user && setChangeLocationVisible(true)}
                  activeOpacity={user ? 0.7 : 1}
                >
                  <Text style={styles.label}>{item.label}</Text>
                  {user && item.value ? (
                    <View style={styles.locationValue}>
                      <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
                      <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">{item.value}</Text>
                    </View>
                  ) : !user ? (
                    <TouchableOpacity onPress={() => navigation.navigate('AuthScreen')} activeOpacity={0.7}>
                      <Text style={styles.locationSignIn}>Sign in</Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              );
            }
            if (item.onPress) {
              return (
                <TouchableOpacity
                  style={[styles.row, isLast && styles.rowLast]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.label}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                </TouchableOpacity>
              );
            }
            if (item.route) {
              const dest = item.requiresAuth && !user ? 'AuthScreen' : item.route;
              const params = item.requiresAuth && !user ? undefined : item.routeParams;
              return (
                <TouchableOpacity
                  style={[styles.row, isLast && styles.rowLast]}
                  onPress={() => navigation.navigate(dest, params)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.label, item.isDestructive && styles.labelDestructive]}>
                    {item.label}
                  </Text>
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
              {user ? (
                <FeedbackCard />
              ) : (
                <TouchableOpacity
                  style={styles.authGateCard}
                  onPress={() => navigation.navigate('AuthScreen')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="star-outline" size={18} color={colors.secondaryText} />
                  <Text style={styles.authGateText}>Sign in to leave feedback</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </KeyboardAvoidingView>

      <PlansModal
        visible={plansVisible}
        onClose={() => { setPlansVisible(false); checkPremium(); }}
      />

      <ChangeLocationModal
        visible={changeLocationVisible}
        currentCity={detectedLocation?.city || detectedLocation?.region || ''}
        onClose={() => setChangeLocationVisible(false)}
        onLocationChanged={(newLoc) => setDetectedLocation(newLoc)}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  logoIcon: {
    width: 45,
    height: 45,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#CC0000',
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
  labelDestructive: {
    color: '#FF3B30',
  },
  value: {
    fontSize: 16,
    color: colors.secondaryText,
  },
  locationValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '55%',
  },
  locationSignIn: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.activeTab,
  },
  authGateCard: {
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
  authGateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryText,
  },

  /* ── Profile Card ── */
  profileCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBackground,
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  profileSince: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  profileDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  editProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  editProfileText: {
    fontSize: 16,
    color: colors.primaryText,
  },
  signOutRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  signInCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    padding: spacing.md,
    ...shadow,
    shadowOpacity: 0.06,
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
  tierBadgePremium: {
    backgroundColor: colors.activeTab,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.6,
  },
  tierBadgeTextPremium: {
    color: '#FFFFFF',
  },
  premiumSubLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: spacing.xs,
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
  manageSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  manageSubText: {
    fontSize: 16,
    color: colors.primaryText,
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
  feedbackSubtitle: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
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
