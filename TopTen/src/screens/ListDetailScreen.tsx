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
import { Swipeable } from 'react-native-gesture-handler';
import { PhotoPickerModal } from '../components/PhotoPickerModal';
import { PlansModal } from '../components/PlansModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { usePostHog } from 'posthog-react-native';
import { getIsPremium } from '../services/premiumService';
import { useListContext } from '../data/ListContext';
import { TopTenItem } from '../data/schema';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { ShareModal } from '../components/ShareModal';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { CATEGORIES } from '../data/categories';
import { isVenueList, derivePlacesQuery, derivePlacesType, searchLocalPlaces } from '../services/googlePlacesService';
import { getDetectedLocation } from '../services/locationService';

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
    const maxRank = Math.max(10, ...(list?.items.map((i) => i.rank) ?? [10]));
    const slots = Array(maxRank).fill('');
    list?.items.forEach((item) => {
      if (item.rank >= 1 && item.rank <= maxRank) slots[item.rank - 1] = item.title;
    });
    return slots;
  }, [list]);

  const [slots, setSlots] = useState<string[]>(buildSlots);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeSlotIndex, setTypeSlotIndex] = useState<number | null>(null);
  const [typedValue, setTypedValue] = useState('');
  const [titleValue, setTitleValue] = useState(list?.title ?? '');
  const [description, setDescription] = useState(list?.description ?? '');
  const [descFocused, setDescFocused] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [photoPickerTarget, setPhotoPickerTarget] = useState<'cover' | 'profile' | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showPremiumPrompt, setShowPremiumPrompt] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [typedArtist, setTypedArtist] = useState('');
  const [typedAlbum, setTypedAlbum] = useState('');
  const [typedSuggestions, setTypedSuggestions] = useState<Array<{ title: string; location?: string }>>([]);
  const [suggestionsCity, setSuggestionsCity] = useState<string | null>(null);
  const placesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMusicList = list?.category === 'Music';
  const isCurrentVenueList = list ? isVenueList(list.title, list.category) : false;

  useEffect(() => {
    getIsPremium().then(setIsPremium);
  }, []);

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

  // Fetch nearby place suggestions when the type modal opens for a venue list
  useEffect(() => {
    if (!showTypeModal || !isCurrentVenueList || !list) {
      setTypedSuggestions([]);
      return;
    }
    getDetectedLocation().then((loc) => {
      const city = loc?.city || null;
      setSuggestionsCity(city);
      if (!city) return;
      const q = derivePlacesQuery(list.title, list.category);
      const t = derivePlacesType(list.title, list.category);
      searchLocalPlaces(city, q, t).then((r) => setTypedSuggestions(r.slice(0, 5)));
    });
  }, [showTypeModal, isCurrentVenueList]);

  const persistSlots = (updated: string[]) => {
    setSlots(updated);
    const items: TopTenItem[] = updated
      .map((title, i) => {
        const existing = list?.items.find((item) => item.title === title);
        return {
          id: `${listId}-${i + 1}`,
          rank: i + 1,
          title,
          ...(existing?.imageUrl ? { imageUrl: existing.imageUrl } : {}),
          ...(existing?.artist ? { artist: existing.artist } : {}),
          ...(existing?.album ? { album: existing.album } : {}),
        };
      })
      .filter((item) => item.title.trim() !== '');
    updateListItems(listId, items);
  };

  const setSlotValue = (index: number, text: string) => {
    const wasEmpty = !slots[index]?.trim();
    const isNowFilled = !!text.trim();
    if (wasEmpty && isNowFilled) {
      posthog?.capture('list_item_added', { category: list?.category ?? null, rank: index + 1 });
    }
    const updated = [...slots];
    updated[index] = text;
    persistSlots(updated);
  };

  const moveSlot = (from: number, to: number) => {
    if (to < 0 || to >= slots.length) return;
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
    setTypedArtist('');
    setTypedAlbum('');
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

  const saveTitle = () => {
    const trimmed = titleValue.trim();
    if (list && trimmed && trimmed !== list.title) {
      updateListMeta(listId, { title: trimmed });
    } else if (!trimmed) {
      setTitleValue(list?.title ?? ''); // revert if cleared
    }
  };

  const saveDescription = () => {
    if (list && description !== list.description) {
      updateListMeta(listId, { description });
    }
  };

  const FREE_PHOTO_LIMIT = 10;

  const totalPhotoCount = lists.filter(l => !!l.coverImageUri || !!l.profileImageUri).length;
  const thisListHasCover = !!list?.coverImageUri;
  const thisListHasProfile = !!list?.profileImageUri;
  const thisListHasAnyPhoto = thisListHasCover || thisListHasProfile;

  const handlePickPhoto = (target: 'cover' | 'profile') => {
    if (!isPremium && !thisListHasAnyPhoto && totalPhotoCount >= FREE_PHOTO_LIMIT) {
      setShowPlansModal(true);
      return;
    }
    setPhotoPickerTarget(target);
  };

  const handlePickCoverImage = () => handlePickPhoto('cover');

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

      {/* Nav bar: back button + category label + image button */}
      <View style={[styles.heroNav, { top: insets.top + 6 }]}>
        <TouchableOpacity style={styles.heroNavBtnWrap} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <BlurView intensity={60} tint="dark" style={styles.heroNavBtn}>
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.heroNavCategory}>{list.category.toUpperCase()}</Text>
        <TouchableOpacity style={styles.heroNavBtnWrapRight} onPress={handlePickCoverImage} activeOpacity={0.75}>
          <BlurView intensity={60} tint="dark" style={styles.heroNavBtn}>
            <Ionicons name="image-outline" size={20} color="#FFF" />
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

        {/* Title — editable inline */}
        <TextInput
          style={styles.heroTitle}
          value={titleValue}
          onChangeText={(t) => setTitleValue(t.slice(0, 60))}
          onBlur={saveTitle}
          placeholder="List title…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          returnKeyType="done"
          blurOnSubmit
          maxLength={60}
        />

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

          if (isEmpty) {
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => openChoiceSheet(index)}
                style={[styles.row, styles.emptyRow]}
              >
                <Text style={[styles.rankNumber, styles.emptyRankNumber]}>{index + 1}</Text>
                <Text style={styles.emptyText}>Add an item</Text>
                <Ionicons name="add" size={16} color={colors.border} />
              </TouchableOpacity>
            );
          }

          return (
            <View style={styles.swipeRowOuter}>
              <Swipeable
                friction={2}
                rightThreshold={40}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.swipeDeleteAction}
                    onPress={() => setSlotValue(index, '')}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openChoiceSheet(index)}
                  style={styles.rowCard}
                >
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                  {thumbUrl && <FlexThumb uri={thumbUrl} />}
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item}</Text>
                    {itemData?.artist && (
                      <Text style={styles.itemSubtitle} numberOfLines={1}>
                        {itemData.artist}{itemData.album ? ` · ${itemData.album}` : ''}
                      </Text>
                    )}
                  </View>
                  <View style={styles.moveButtons}>
                    <TouchableOpacity onPress={() => moveSlot(index, index - 1)} disabled={index === 0} hitSlop={8}>
                      <Ionicons name="chevron-up" size={20} color={index === 0 ? colors.border : colors.secondaryText} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveSlot(index, index + 1)} disabled={index === slots.length - 1} hitSlop={8}>
                      <Ionicons name="chevron-down" size={20} color={index === slots.length - 1 ? colors.border : colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            </View>
          );
        }}
        ListFooterComponent={
          <>
            {/* Add more items — Premium gate */}
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => {
                if (isPremium) {
                  setSlots((prev) => [...prev, '']);
                } else {
                  setShowPremiumPrompt(true);
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={16} color={categoryColor} />
              <Text style={[styles.addMoreText, { color: categoryColor }]}>Add more items</Text>
            </TouchableOpacity>

            {/* Quick-action chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionTileBar}
              style={styles.actionTileRow}
            >
              <TouchableOpacity style={styles.actionTile} onPress={() => setShowShareModal(true)} activeOpacity={0.7}>
                <Ionicons name="share-outline" size={18} color={categoryColor} />
                <Text style={styles.actionTileLabel}>Share</Text>
              </TouchableOpacity>


              <TouchableOpacity style={styles.actionTile} onPress={() => handlePickPhoto('profile')} activeOpacity={0.7}>
                <Ionicons name="person-circle-outline" size={18} color={categoryColor} />
                <Text style={styles.actionTileLabel}>List Avatar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => handlePickPhoto('cover')} activeOpacity={0.7}>
                <Ionicons name="image-outline" size={18} color={categoryColor} />
                <Text style={styles.actionTileLabel}>Cover Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => setShowCategoryPicker(true)} activeOpacity={0.7}>
                <Ionicons name="grid-outline" size={18} color={categoryColor} />
                <Text style={styles.actionTileLabel}>Category</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={() => setShowReportModal(true)} activeOpacity={0.7}>
                <Ionicons name="flag-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionTileLabel, { color: colors.secondaryText }]}>Report Issue</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionTile} onPress={handleDeleteList} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={[styles.actionTileLabel, { color: colors.secondaryText }]}>Delete List</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
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
                onChangeText={(text) => {
                  setTypedValue(text);
                  if (!isCurrentVenueList || !suggestionsCity) return;
                  if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
                  placesDebounceRef.current = setTimeout(() => {
                    const q = text.trim() || derivePlacesQuery(list.title, list.category);
                    const t = text.trim() ? undefined : derivePlacesType(list.title, list.category);
                    searchLocalPlaces(suggestionsCity, q, t).then((r) => setTypedSuggestions(r.slice(0, 5)));
                  }, 350);
                }}
                placeholder={isMusicList ? 'Song title…' : isCurrentVenueList ? 'Type or pick from suggestions…' : 'Type a name…'}
                placeholderTextColor={colors.secondaryText}
                autoFocus
                returnKeyType={isMusicList ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (!isMusicList && typedValue.trim() && typeSlotIndex !== null) {
                    setSlotValue(typeSlotIndex, typedValue.trim());
                    setShowTypeModal(false);
                    setTypedValue('');
                  }
                }}
              />
              {isCurrentVenueList && typedSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestionsCity && (
                    <View style={styles.suggestionsHeader}>
                      <Ionicons name="location-sharp" size={11} color={colors.activeTab} />
                      <Text style={styles.suggestionsHeaderText}>Near {suggestionsCity}</Text>
                    </View>
                  )}
                  {typedSuggestions.slice(0, 3).map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestionRow}
                      onPress={() => {
                        if (typeSlotIndex !== null) {
                          setSlotValue(typeSlotIndex, s.title);
                          setShowTypeModal(false);
                          setTypedValue('');
                          setTypedSuggestions([]);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionBody}>
                        <Text style={styles.suggestionTitle} numberOfLines={1}>{s.title}</Text>
                        {s.location && <Text style={styles.suggestionLocation}>{s.location}</Text>}
                      </View>
                      <Ionicons name="add-circle-outline" size={18} color={colors.activeTab} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {isMusicList && (
                <>
                  <TextInput
                    style={[styles.typeInput, styles.typeInputSecondary]}
                    value={typedArtist}
                    onChangeText={setTypedArtist}
                    placeholder="Artist (optional)"
                    placeholderTextColor={colors.secondaryText}
                    returnKeyType="next"
                  />
                  <TextInput
                    style={[styles.typeInput, styles.typeInputSecondary]}
                    value={typedAlbum}
                    onChangeText={setTypedAlbum}
                    placeholder="Album (optional)"
                    placeholderTextColor={colors.secondaryText}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (typedValue.trim() && typeSlotIndex !== null) {
                        const existing = list!.items.filter(i => i.rank !== typeSlotIndex + 1);
                        const newItem: TopTenItem = {
                          id: `${listId}-${typeSlotIndex + 1}`,
                          rank: typeSlotIndex + 1,
                          title: typedValue.trim(),
                          ...(typedArtist.trim() ? { artist: typedArtist.trim() } : {}),
                          ...(typedAlbum.trim() ? { album: typedAlbum.trim() } : {}),
                        };
                        const updated = [...slots];
                        updated[typeSlotIndex] = typedValue.trim();
                        setSlots(updated);
                        updateListItems(listId, [...existing, newItem]);
                        setShowTypeModal(false);
                        setTypedValue(''); setTypedArtist(''); setTypedAlbum('');
                      }
                    }}
                  />
                </>
              )}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: categoryColor }, !typedValue.trim() && styles.saveDisabled]}
                disabled={!typedValue.trim()}
                onPress={() => {
                  if (typeSlotIndex !== null && typedValue.trim()) {
                    if (isMusicList) {
                      const existing = list!.items.filter(i => i.rank !== typeSlotIndex + 1);
                      const newItem: TopTenItem = {
                        id: `${listId}-${typeSlotIndex + 1}`,
                        rank: typeSlotIndex + 1,
                        title: typedValue.trim(),
                        ...(typedArtist.trim() ? { artist: typedArtist.trim() } : {}),
                        ...(typedAlbum.trim() ? { album: typedAlbum.trim() } : {}),
                      };
                      const updated = [...slots];
                      updated[typeSlotIndex] = typedValue.trim();
                      setSlots(updated);
                      updateListItems(listId, [...existing, newItem]);
                    } else {
                      setSlotValue(typeSlotIndex, typedValue.trim());
                    }
                    setShowTypeModal(false);
                    setTypedValue(''); setTypedArtist(''); setTypedAlbum('');
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
        coverImageUri={coverImageUri}
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
      <PlansModal
        visible={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />

      {/* Premium feature prompt */}
      <Modal visible={showPremiumPrompt} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowPremiumPrompt(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.premiumPromptIcon}>
              <Ionicons name="star" size={26} color={colors.activeTab} />
            </View>
            <Text style={styles.sheetTitle}>Premium Feature</Text>
            <Text style={styles.premiumPromptBody}>
              Extend any list beyond 10 items with TopX Premium.
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.activeTab }]}
              onPress={() => { setShowPremiumPrompt(false); setShowPlansModal(true); }}
            >
              <Text style={styles.saveText}>Upgrade to Premium</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPremiumPrompt(false)}>
              <Text style={styles.cancelText}>Not now</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
  heroNavBtnWrap: {
    padding: 10,
    marginLeft: -10,
    marginTop: -10,
  },
  heroNavBtnWrapRight: {
    padding: 10,
    marginRight: -10,
    marginTop: -10,
  },
  heroNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
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
  // Used for empty (dashed) rows — keeps margins on the row itself
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
  // Outer wrapper for swipeable filled rows — holds margins & shadow
  swipeRowOuter: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    ...shadow,
    shadowOpacity: 0.05,
  },
  // Inner card for filled rows (no margins — those are on swipeRowOuter)
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    gap: spacing.md,
  },
  swipeDeleteAction: {
    backgroundColor: '#FF3B30',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
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
  itemInfo: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 16, color: colors.primaryText },
  itemSubtitle: { fontSize: 12, color: colors.secondaryText },
  emptyText: { flex: 1, fontSize: 16, color: colors.secondaryText },
  moveButtons: { alignItems: 'center', gap: 2 },

  /* ── Add more items ── */
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumPromptIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(204,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  premiumPromptBody: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },

  /* ── Footer action card ── */
  actionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  actionTileRow: {
    marginTop: spacing.xxl,
  },
  actionTileBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadow,
    shadowOpacity: 0.06,
  },
  actionTileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
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
  typeInputSecondary: {
    fontSize: 15,
    marginBottom: spacing.sm,
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

  /* ── Inline Places suggestions ── */
  suggestionsContainer: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  suggestionsHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.activeTab,
    letterSpacing: 0.2,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  suggestionBody: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
  },
  suggestionLocation: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 1,
  },
});
