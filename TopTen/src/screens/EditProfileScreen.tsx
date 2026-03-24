import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth, ProfileData } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { CATEGORIES } from '../data/categories';
import { DetectedLocation } from '../services/locationService';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { colors, spacing, borderRadius, shadow } from '../theme';

const GENDERS = ['Man', 'Woman', 'Non-binary', 'Other', 'Prefer not to say'];
const MAX_CATEGORIES = 7;
const MIN_DOB = new Date(1900, 0, 1);
const MAX_DOB = new Date();
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const parseDob = (str: string | null | undefined): Date => {
  if (!str) return new Date(1995, 0, 1);
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatDob = (d: Date): string =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

// Use local date parts to avoid UTC offset shifting the date
const toDateString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Props {
  navigation: any;
}

export const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { updateProfile, updateAvatar, userProfile, user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedCategories, setSelectedCategories] = useState<string[]>(userProfile?.favorite_categories ?? []);
  const [dob, setDob] = useState<Date>(parseDob(userProfile?.date_of_birth));
  const [dobSet, setDobSet] = useState(!!userProfile?.date_of_birth);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [gender, setGender] = useState<string | null>(userProfile?.gender ?? null);
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(
    userProfile?.location_city || userProfile?.location_region
      ? { city: userProfile.location_city ?? '', region: userProfile.location_region ?? '', country: '', detectedAt: 0, isManual: true }
      : null
  );
  const [changeLocationVisible, setChangeLocationVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Change-username modal
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameModalError, setUsernameModalError] = useState<string | null>(null);
  const synced = useRef(false);

  useEffect(() => {
    if (!userProfile || synced.current) return;
    synced.current = true;
    setSelectedCategories(userProfile.favorite_categories ?? []);
    setDob(parseDob(userProfile.date_of_birth));
    setDobSet(!!userProfile.date_of_birth);
    setGender(userProfile.gender ?? null);
    if (userProfile.location_city || userProfile.location_region) {
      setDetectedLocation({
        city: userProfile.location_city ?? '',
        region: userProfile.location_region ?? '',
        country: '',
        detectedAt: 0,
        isManual: true,
      });
    }
  }, [userProfile]);

  const toggleCategory = (label: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(label)) return prev.filter(c => c !== label);
      if (prev.length >= MAX_CATEGORIES) return prev;
      return [...prev, label];
    });
  };

  const pickAvatarImage = async (source: 'library' | 'camera') => {
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

  const openUsernameModal = () => {
    setNewUsername('');
    setUsernameModalError(null);
    setUsernameModalVisible(true);
  };

  const handleUsernameChange = async () => {
    setUsernameModalError(null);
    if (!newUsername.trim()) { setUsernameModalError('Please enter a username.'); return; }
    if (!USERNAME_REGEX.test(newUsername)) {
      setUsernameModalError('3–20 characters: letters, numbers, and underscores only.');
      return;
    }
    setUsernameChecking(true);
    const err = await updateProfile({ username: newUsername.trim().toLowerCase() });
    setUsernameChecking(false);
    if (err) { setUsernameModalError(err); return; }
    setUsernameModalVisible(false);
  };

  const handleGenderPress = () => {
    const options = ['Cancel', ...GENDERS, ...(gender ? ['Clear'] : [])];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Gender', options, cancelButtonIndex: 0 },
      (idx) => {
        if (idx === 0) return;
        if (gender && idx === options.length - 1) { setGender(null); return; }
        setGender(GENDERS[idx - 1]);
      }
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user || !supabase) return;
              await Promise.all([
                supabase.from('user_profiles').delete().eq('id', user.id),
                supabase.from('user_lists').delete().eq('user_id', user.id),
                supabase.from('community_feed_posts').delete().eq('user_id', user.id),
              ]);
              await signOut();
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    setFieldError(null);
    setSaving(true);
    const profileData: ProfileData = {
      date_of_birth: dobSet ? toDateString(dob) : undefined,
      gender: gender ?? undefined,
      favorite_categories: selectedCategories,
      location_city: detectedLocation?.city || undefined,
      location_region: detectedLocation?.region || undefined,
    };
    const err = await updateProfile(profileData);
    setSaving(false);
    if (err) { setFieldError(err); return; }
    navigation.goBack();
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {saving
              ? <ActivityIndicator size="small" color={colors.activeTab} />
              : <Text style={styles.saveButton}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress} activeOpacity={0.8}>
            {userProfile?.avatar_url ? (
              <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={36} color={colors.secondaryText} />
            )}
            <View style={styles.cameraBadge}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#FFF" style={{ transform: [{ scale: 0.55 }] }} />
                : <Ionicons name="camera" size={13} color="#FFF" />
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {!!fieldError && <Text style={styles.fieldError}>{fieldError}</Text>}

        {/* Info rows */}
        <View style={styles.card}>

          {/* Email */}
          <View style={[styles.row, styles.rowFirst]}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>{user?.email}</Text>
          </View>

          {/* Username — read-only */}
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.rowValue}>
              {userProfile?.username ? `@${userProfile.username}` : 'Not set'}
            </Text>
          </View>

          {/* Date of Birth */}
          <View style={styles.rowDivider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowDobPicker(p => !p)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Date of Birth</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{dobSet ? formatDob(dob) : 'Not set'}</Text>
              <Ionicons name={showDobPicker ? 'chevron-up' : 'chevron-forward'} size={16} color={colors.secondaryText} />
            </View>
          </TouchableOpacity>
          {showDobPicker && (
            <DateTimePicker
              value={dob}
              mode="date"
              display="spinner"
              onChange={(_, date) => { if (date) { setDob(date); setDobSet(true); } }}
              maximumDate={MAX_DOB}
              minimumDate={MIN_DOB}
              style={styles.datePicker}
            />
          )}

          {/* Gender */}
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={handleGenderPress} activeOpacity={0.7}>
            <Text style={styles.rowLabel}>Gender</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{gender ?? 'Not set'}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
            </View>
          </TouchableOpacity>


        </View>

        {/* Favorite Categories */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesSectionLabel}>Favorite Categories</Text>
            <Text style={[styles.categoryCount, selectedCategories.length === MAX_CATEGORIES && styles.categoryCountMax]}>
              {selectedCategories.length}/{MAX_CATEGORIES}
            </Text>
          </View>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((cat) => {
              const selected = selectedCategories.includes(cat.label);
              const disabled = !selected && selectedCategories.length >= MAX_CATEGORIES;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: cat.color, borderColor: cat.color },
                    disabled && styles.chipDisabled,
                  ]}
                  onPress={() => toggleCategory(cat.label)}
                  activeOpacity={0.7}
                  disabled={disabled}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={selected ? '#FFF' : disabled ? colors.border : colors.secondaryText}
                  />
                  <Text style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                    disabled && styles.chipTextDisabled,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.changeUsernameRow} onPress={openUsernameModal} activeOpacity={0.6}>
          <Text style={styles.changeUsernameText}>Change username ›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountRow} onPress={handleDeleteAccount} activeOpacity={0.6}>
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <ChangeLocationModal
        visible={changeLocationVisible}
        currentCity={detectedLocation?.city || detectedLocation?.region || ''}
        onClose={() => setChangeLocationVisible(false)}
        onLocationChanged={(newLoc) => setDetectedLocation(newLoc)}
      />

      {/* Change Username Modal */}
      <Modal visible={usernameModalVisible} transparent animationType="fade" onRequestClose={() => setUsernameModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Username</Text>
            <Text style={styles.modalSubtitle}>Choose carefully — usernames are permanent identifiers for your community activity.</Text>
            <View style={styles.modalInputRow}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={styles.modalInput}
                value={newUsername}
                onChangeText={(t) => { setNewUsername(t.replace(/\s/g, '').toLowerCase()); setUsernameModalError(null); }}
                placeholder={userProfile?.username ?? 'newusername'}
                placeholderTextColor={colors.border}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleUsernameChange}
                textContentType="username"
              />
            </View>
            {!!usernameModalError && <Text style={styles.modalError}>{usernameModalError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setUsernameModalVisible(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUsernameChange} disabled={usernameChecking} activeOpacity={0.85}>
                {usernameChecking
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.modalConfirmText}>Save Username</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primaryText,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CC0000',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarHint: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: spacing.sm,
  },
  fieldError: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
  },
  rowFirst: {},
  rowLast: {},
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.primaryText,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
    maxWidth: '60%',
  },
  rowValue: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'right',
    flexShrink: 1,
  },
  datePicker: {
    width: '100%',
  },
  changeUsernameRow: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  changeUsernameText: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  deleteAccountRow: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  deleteAccountText: {
    fontSize: 13,
    color: '#FF3B30',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.xl,
    ...shadow,
    shadowOpacity: 0.15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  atPrefix: {
    fontSize: 16,
    color: colors.secondaryText,
    marginRight: 2,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: 12,
  },
  modalError: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  modalConfirm: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: '#CC0000',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoriesSection: {
    marginTop: spacing.xl,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  categoriesSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  categoryCountMax: {
    color: '#CC0000',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    ...shadow,
    shadowOpacity: 0.04,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryText,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipTextDisabled: {
    color: colors.border,
  },
});
