import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';
import { usePostHog } from 'posthog-react-native';
import { useListContext } from '../data/ListContext';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../data/categories';
import { PlansModal } from '../components/PlansModal';
import { PhotoPickerModal } from '../components/PhotoPickerModal';
import { colors, spacing, borderRadius, shadow } from '../theme';

const FREE_LIST_LIMIT = 50;

export const CreateListScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [selectedCategory, setSelectedCategory] = useState(route.params?.initialCategory ?? '');
  const [customName, setCustomName] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [profileUri, setProfileUri] = useState<string | undefined>();
  const [coverUri, setCoverUri] = useState<string | undefined>();
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const { addList, lists } = useListContext();
  const { user } = useAuth();
  const posthog = usePostHog();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Purchases.getCustomerInfo()
      .then(info => setIsPremium(!!info.entitlements.active['premium']))
      .catch(() => {});
  }, []);

  const canCreate = selectedCategory.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    if (!isPremium && lists.length >= FREE_LIST_LIMIT) {
      setShowPlansModal(true);
      return;
    }
    const title = customName.trim() || undefined;
    const id = addList(selectedCategory, title, undefined, profileUri, coverUri);
    posthog?.capture('list_created', { category: selectedCategory, has_custom_name: !!title });
    navigation.replace('ListDetail', { listId: id });
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={{ paddingVertical: 8, paddingHorizontal: 4 }}
        >
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          disabled={!canCreate}
          onPress={handleCreate}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={{ paddingVertical: 8, paddingHorizontal: 4 }}
        >
          <Text style={[styles.headerButton, styles.createButton, !canCreate && styles.disabled]}>
            Create
          </Text>
        </TouchableOpacity>
      ),
      title: 'New List',
    });
  }, [navigation, canCreate, selectedCategory, customName, profileUri, coverUri]);

  return (
    <View style={styles.container}>
    <ScrollView
      ref={scrollRef}
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={styles.label}>Category</Text>
      <View style={styles.grid}>
        {CATEGORIES.map(({ label, icon, color }) => {
          const active = selectedCategory === label;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.chip, active && { borderColor: color, backgroundColor: color + '22' }]}
              onPress={() => setSelectedCategory(label)}
              activeOpacity={0.7}
            >
              <Ionicons name={icon as any} size={18} color={active ? color : colors.secondaryText} />
              <Text style={[styles.chipText, active && { color, fontWeight: '600' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: spacing.xl }]}>List Name (optional)</Text>
      <TextInput
        style={styles.input}
        value={customName}
        onChangeText={setCustomName}
        placeholder={selectedCategory ? `My Top 10 ${selectedCategory}` : 'Auto-generated from category'}
        placeholderTextColor={colors.secondaryText}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <Text style={styles.hint}>Leave blank to use the default name for this category</Text>

      <Text style={[styles.label, { marginTop: spacing.xl }]}>Photos (optional)</Text>
      <View style={styles.photoRow}>
        {/* Profile photo */}
        <TouchableOpacity style={styles.profilePhotoBtn} onPress={() => setShowProfilePicker(true)} activeOpacity={0.7}>
          {profileUri ? (
            <Image source={{ uri: profileUri }} style={styles.profilePhotoPreview} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="person-circle-outline" size={32} color={colors.border} />
            </View>
          )}
          <View style={styles.photoAddBadge}>
            <Ionicons name={profileUri ? 'pencil' : 'add'} size={11} color="#FFF" />
          </View>
          <Text style={styles.photoLabel}>Profile</Text>
        </TouchableOpacity>

        {/* Cover photo */}
        <TouchableOpacity style={styles.coverPhotoBtn} onPress={() => setShowCoverPicker(true)} activeOpacity={0.7}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverPhotoPreview} />
          ) : (
            <View style={styles.coverPhotoPlaceholder}>
              <Ionicons name="image-outline" size={28} color={colors.border} />
              <Text style={styles.coverPlaceholderText}>Cover Photo</Text>
            </View>
          )}
          <View style={[styles.photoAddBadge, styles.coverAddBadge]}>
            <Ionicons name={coverUri ? 'pencil' : 'add'} size={11} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>

    <PlansModal visible={showPlansModal} onClose={() => setShowPlansModal(false)} />

    <PhotoPickerModal
      visible={showProfilePicker}
      onClose={() => setShowProfilePicker(false)}
      onSelectUri={setProfileUri}
      currentUri={profileUri}
      title="Profile Photo"
      aspect={[1, 1]}
      orientation="squarish"
      userId={user?.id}
    />
    <PhotoPickerModal
      visible={showCoverPicker}
      onClose={() => setShowCoverPicker(false)}
      onSelectUri={setCoverUri}
      currentUri={coverUri}
      title="Cover Photo"
      aspect={[16, 9]}
      orientation="landscape"
      userId={user?.id}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.primaryText,
  },
  hint: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  profilePhotoBtn: {
    alignItems: 'center',
    gap: 6,
  },
  profilePhotoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  photoAddBadge: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.activeTab,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  coverPhotoBtn: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  coverPhotoPlaceholder: {
    height: 72,
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  coverPlaceholderText: {
    fontSize: 12,
    color: colors.border,
    fontWeight: '500',
  },
  coverPhotoPreview: {
    width: '100%',
    height: 72,
  },
  coverAddBadge: {
    top: 4,
    right: 4,
  },
  headerButton: {
    fontSize: 17,
    color: colors.activeTab,
  },
  createButton: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
});
