import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { PhotoPickerModal } from '../components/PhotoPickerModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import { useListContext } from '../data/ListContext';
import { TopTenItem } from '../data/schema';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { ShareModal } from '../components/ShareModal';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { CATEGORIES } from '../data/categories';

const DESCRIPTION_LIMIT = 120;

const THUMB_MAX = 52; // max height AND max width for item thumbnails

/* Renders an image that respects its natural aspect ratio within a 52px box */
const FlexThumb: React.FC<{ uri: string }> = ({ uri }) => {
  // Default to portrait (TMDB posters are ~2:3) so there's no layout jump on load
  const [dims, setDims] = useState({ width: 35, height: THUMB_MAX });

  return (
    <Image
      source={{ uri }}
      style={[styles.itemThumb, dims]}
      resizeMode="cover"
      onLoad={(e) => {
        const { width, height } = e.nativeEvent.source;
        const ratio = width / height;
        if (ratio < 1) {
          // portrait: fix height, shrink width
          setDims({ height: THUMB_MAX, width: Math.round(THUMB_MAX * ratio) });
        } else {
          // landscape / square: fix width, cap height
          const w = THUMB_MAX;
          const h = Math.min(Math.round(w / ratio), THUMB_MAX);
          setDims({ width: w, height: h });
        }
      }}
    />
  );
};


export const ListDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { listId } = route.params;
  const { lists, updateListItems, updateListMeta, deleteList } = useListContext();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const list = lists.find((l) => l.id === listId);

  const buildSlots = useCallback((): string[] => {
    const slots = Array(10).fill('');
    list?.items.forEach((item) => {
      if (item.rank >= 1 && item.rank <= 10) slots[item.rank - 1] = item.title;
    });
    return slots;
  }, [list]);

  const [slots, setSlots] = useState<string[]>(buildSlots);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeSlotIndex, setTypeSlotIndex] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState('');
  const [description, setDescription] = useState(list?.description ?? '');
  const [descFocused, setDescFocused] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [photoPickerTarget, setPhotoPickerTarget] = useState<'cover' | 'profile' | null>(null);

  useEffect(() => { setSlots(buildSlots()); }, [buildSlots]);
  useEffect(() => { setDescription(list?.description ?? ''); }, [list?.id]);

  // Save description when leaving the screen
  const descriptionRef = useRef(description);
  descriptionRef.current = description;
  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (list && descriptionRef.current !== list.description) {
        updateListMeta(listId, { description: descriptionRef.current });
      }
    });
  }, [navigation, listId, list, updateListMeta]);

  const persistSlots = (updated: string[]) => {
    setSlots(updated);
    const items: TopTenItem[] = updated
      .map((title, i) => ({ id: `${listId}-${i + 1}`, rank: i + 1, title }))
      .filter((item) => item.title.trim() !== '');
    updateListItems(listId, items);
  };

  const setSlotValue = (index: number, text: string) => {
    const wasEmpty = !slots[index]?.trim();
    const isNowFilled = !!text.trim();
    if (wasEmpty && isNowFilled) {
      posthog?.capture('list_item_added', { category: list?.category, rank: index + 1 });
    }
    const updated = [...slots];
    updated[index] = text;
    persistSlots(updated);
  };

  const moveSlot = (from: number, to: number) => {
    if (to < 0 || to >= 10) return;
    const updated = [...slots];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    persistSlots(updated);
  };

  const openChoiceSheet = (index: number) => setActiveSlot(index);

  const openTypeModal = (index: number) => {
    setActiveSlot(null);
    setTypeSlotIndex(index);
    setTypedValue('');
    setShowTypeModal(true);
  };

  const openSearch = (index: number) => {
    setActiveSlot(null);
    navigation.navigate('Search', { listId, rank: index + 1, category: list?.category ?? '', listTitle: list?.title ?? '' });
  };

  const handleDeleteList = () => {
    Alert.alert('Delete List', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteList(listId); navigation.goBack(); } },
    ]);
  };

  const saveDescription = () => {
    if (list && description !== list.description) {
      updateListMeta(listId, { description });
    }
  };

  const handlePickCoverImage = () => setPhotoPickerTarget('cover');

  if (!list) return null;

  const heroImage = list.items.find(i => i.rank === 1)?.imageUrl ?? null;
  const categoryColor = CATEGORY_COLORS[list.category] ?? '#CC0000';
  const coverImageUri = list.coverImageUri ?? null;

  const Hero = (
    <View style={[styles.hero, { paddingTop: insets.top + 46 }]}>
      {/* Background: user cover photo, else solid category color */}
      {coverImageUri ? (
        <Image source={{ uri: coverImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: categoryColor }]} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />

      {/* Nav bar: back button + category label */}
      <View style={[styles.heroNav, { top: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <BlurView intensity={60} tint="dark" style={styles.heroNavBtn}>
            <View style={styles.heroNavBtnInner}>
              <Ionicons name="chevron-back" size={26} color="#FFF" />
            </View>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.heroNavCategory}>{list.category.toUpperCase()}</Text>
        <TouchableOpacity onPress={handlePickCoverImage} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <BlurView intensity={60} tint="dark" style={styles.heroNavBtn}>
            <View style={styles.heroNavBtnInner}>
              <Ionicons name="image-outline" size={20} color="#FFF" />
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Bottom content */}
      <View style={[styles.heroContent, heroImage && styles.heroContentWithPoster]}>
        {/* Poster: absolutely positioned so it doesn't push description down */}
        {heroImage && (
          <Image
            source={{ uri: heroImage }}
            style={styles.heroPoster}
            resizeMode="cover"
          />
        )}

        {/* Title — flows directly into description with no row wrapper */}
        <Text style={styles.heroTitle} numberOfLines={2}>{list.title}</Text>

        {/* Editable description — immediately below title */}
        <TextInput
          style={styles.heroDescription}
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, DESCRIPTION_LIMIT))}
          onFocus={() => setDescFocused(true)}
          onBlur={() => { setDescFocused(false); saveDescription(); }}
          placeholder="Add a description…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          maxLength={DESCRIPTION_LIMIT}
          blurOnSubmit
          returnKeyType="done"
        />
        {descFocused && (
          <Text style={styles.charCount}>{description.length}/{DESCRIPTION_LIMIT}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={slots}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxl }]}
        ListHeaderComponent={Hero}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const isEmpty = !item;
          const itemData = list.items.find(i => i.rank === index + 1);
          const thumbUrl = itemData?.imageUrl ?? null;
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => openChoiceSheet(index)}
              style={[styles.row, isEmpty && styles.emptyRow]}
            >
              <Text style={[styles.rankNumber, isEmpty && styles.emptyRankNumber]}>{index + 1}</Text>
              {isEmpty ? (
                <>
                  <Text style={styles.emptyText}>Add an item</Text>
                  <Ionicons name="add" size={16} color={colors.border} />
                </>
              ) : (
                <>
                  {thumbUrl && <FlexThumb uri={thumbUrl} />}
                  <Text style={styles.itemTitle} numberOfLines={1}>{item}</Text>
                  <View style={styles.moveButtons}>
                    <TouchableOpacity onPress={() => moveSlot(index, index - 1)} disabled={index === 0} hitSlop={8}>
                      <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.secondaryText} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveSlot(index, index + 1)} disabled={index === 9} hitSlop={8}>
                      <Ionicons name="chevron-down" size={20} color={index === 9 ? colors.border : colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <View style={styles.actionCard}>
            {/* Share */}
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowShareModal(true)} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: categoryColor + '22' }]}>
                <Ionicons name="share-outline" size={18} color={categoryColor} />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Report */}
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowReportModal(true)} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.secondaryText + '18' }]}>
                <Ionicons name="flag-outline" size={18} color={colors.secondaryText} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.secondaryText }]}>Report an Issue</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Profile image */}
            <TouchableOpacity style={styles.actionRow} onPress={() => setPhotoPickerTarget('profile')} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: categoryColor + '22' }]}>
                <Ionicons name="person-circle-outline" size={18} color={categoryColor} />
              </View>
              <Text style={styles.actionLabel}>Profile Image</Text>
              {list.profileImageUri && <Text style={[styles.actionValue, { color: categoryColor }]}>Set</Text>}
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Category */}
            <TouchableOpacity style={styles.actionRow} onPress={() => setShowCategoryPicker(true)} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: categoryColor + '22' }]}>
                <Ionicons name="grid-outline" size={18} color={categoryColor} />
              </View>
              <Text style={styles.actionLabel}>Category</Text>
              <Text style={[styles.actionValue, { color: categoryColor }]}>{list.category}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            {/* Delete */}
            <TouchableOpacity style={styles.actionRow} onPress={handleDeleteList} activeOpacity={0.7}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.danger + '18' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.danger }]}>Delete List</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Choice sheet */}
      <Modal visible={activeSlot !== null} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setActiveSlot(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Rank #{activeSlot !== null ? activeSlot + 1 : ''}</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={() => activeSlot !== null && openTypeModal(activeSlot)}>
              <Ionicons name="pencil-outline" size={22} color={categoryColor} />
              <Text style={styles.sheetOptionText}>Type an item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => activeSlot !== null && openSearch(activeSlot)}>
              <Ionicons name="search-outline" size={22} color={categoryColor} />
              <Text style={styles.sheetOptionText}>Find your item in a list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setActiveSlot(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Type item modal */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.overlay} onPress={() => setShowTypeModal(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>Enter item for #{typeSlotIndex !== null ? typeSlotIndex + 1 : ''}</Text>
              <TextInput
                style={styles.typeInput}
                value={typedValue}
                onChangeText={setTypedValue}
                placeholder="Type a name…"
                placeholderTextColor={colors.secondaryText}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (typedValue.trim() && typeSlotIndex !== null) {
                    setSlotValue(typeSlotIndex, typedValue.trim());
                    setShowTypeModal(false);
                    setTypedValue('');
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: categoryColor }, !typedValue.trim() && styles.saveDisabled]}
                disabled={!typedValue.trim()}
                onPress={() => {
                  if (typeSlotIndex !== null) {
                    setSlotValue(typeSlotIndex, typedValue.trim());
                    setShowTypeModal(false);
                    setTypedValue('');
                  }
                }}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={list.title}
        category={list.category}
        items={slots}
      />
      <ReportIssueModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        listTitle={list.title}
        listType="Personal"
      />

      {/* Photo picker — cover or profile */}
      <PhotoPickerModal
        visible={photoPickerTarget !== null}
        onClose={() => setPhotoPickerTarget(null)}
        title={photoPickerTarget === 'cover' ? 'Cover Photo' : 'Profile Image'}
        currentUri={photoPickerTarget === 'cover' ? list.coverImageUri : list.profileImageUri}
        aspect={photoPickerTarget === 'cover' ? [16, 9] : [1, 1]}
        orientation={photoPickerTarget === 'cover' ? 'landscape' : 'squarish'}
        onSelectUri={(uri) => {
          if (photoPickerTarget === 'cover') {
            updateListMeta(listId, { coverImageUri: uri });
          } else {
            updateListMeta(listId, { profileImageUri: uri });
          }
        }}
      />

      {/* Category picker */}
      <Modal visible={showCategoryPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowCategoryPicker(false)}>
          <Pressable style={styles.categorySheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.iconSheetHandle} />
            <Text style={styles.iconSheetTitle}>Choose a Category</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(({ label, icon, color }) => {
                  const active = label === list.category;
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[styles.categoryChip, active && { borderColor: color, backgroundColor: color + '22' }]}
                      onPress={() => {
                        updateListMeta(listId, { category: label });
                        setShowCategoryPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={icon as any} size={18} color={active ? color : colors.secondaryText} />
                      <Text style={[styles.categoryChipText, active && { color, fontWeight: '600' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Hero ── */
  hero: {
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  heroScrim: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  heroNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroNavBtnInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNavCategory: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
  },
  heroContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 18,
    paddingTop: spacing.sm,
  },
  heroContentWithPoster: {
    // Reserve right space so text doesn't run under the poster
    paddingRight: spacing.lg + 58 + spacing.md,
  },
  heroPoster: {
    position: 'absolute',
    right: spacing.lg,
    // Centers poster on title: paddingTop(8) + lineHeight/2(13) - posterHeight/2(43) = -22
    top: -22,
    width: 58,
    height: 86,
    borderRadius: borderRadius.md,
    ...shadow,
    shadowOpacity: 0.35,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  heroDescription: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginTop: 2,
    padding: 0,
    paddingTop: 0,
  },
  charCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  /* ── List rows ── */
  list: {
    paddingTop: 0,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    gap: spacing.md,
    ...shadow,
    shadowOpacity: 0.05,
  },
  emptyRow: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  rankNumber: {
    width: 20,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'right',
    opacity: 0.55,
    flexShrink: 0,
  },
  emptyRankNumber: {
    opacity: 0.25,
  },
  itemThumb: {
    borderRadius: 9,
    flexShrink: 0,
    overflow: 'hidden',
  },
  itemTitle: { flex: 1, fontSize: 16, color: colors.primaryText },
  emptyText: { flex: 1, fontSize: 16, color: colors.secondaryText },
  moveButtons: { alignItems: 'center', gap: 2 },

  /* ── Footer action card ── */
  actionCard: {
    marginTop: spacing.xxl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
  },
  actionValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 34 + spacing.md,
  },

  /* ── Modals ── */
  keyboardAvoid: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl + 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetOptionText: { fontSize: 17, color: colors.primaryText },
  cancelButton: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { fontSize: 17, color: colors.secondaryText },
  typeInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.primaryText,
    marginBottom: spacing.lg,
  },
  saveButton: {
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    alignItems: 'center',
  }, // backgroundColor applied inline via categoryColor
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFF', fontSize: 17, fontWeight: '600' },

  /* ── Sheet handle + title (shared by category picker) ── */
  iconSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  iconSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  /* ── Category Picker ── */
  categorySheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 8,
    maxHeight: '65%',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryText,
  },
});
