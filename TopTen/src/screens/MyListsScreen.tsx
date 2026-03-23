import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { TopTenList } from '../data/schema';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { PickCard } from '../components/PickCard';
import { FEATURED_LISTS } from '../data/featuredLists';
import { COMMUNITY_LISTS, LOCAL_COMMUNITY_LISTS, CommunityList } from '../data/communityLists';
import { TOP_500_CITY_SLUG_SET } from '../data/topCities';
import { fetchLocalPlacesLists } from '../services/googlePlacesService';
import { registerDynamicLists } from '../data/dynamicListRegistry';
import { useCommunity } from '../context/CommunityContext';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { fetchCommunityImage } from '../services/featuredContentService';
import { CATEGORIES } from '../data/categories';
import {
  getDetectedLocation,
  regionMatches,
  formatLocationLabel,
  DetectedLocation,
} from '../services/locationService';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import { PhotoPickerModal } from '../components/PhotoPickerModal';
import { InYourAreaLockCard } from '../components/InYourAreaLockCard';
import { useAuth } from '../context/AuthContext';
import { FeedPostCard } from '../components/FeedPostCard';
import { useCityFeedPreview } from '../hooks/useCityFeedPreview';

const ALL_CATEGORY_LABELS = CATEGORIES.map((c) => c.label);



const SkeletonCard: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '55%' }]} />
        <View style={[styles.skeletonLine, { width: '85%', marginTop: 6 }]} />
        <View style={[styles.skeletonLine, { width: '75%' }]} />
        <View style={[styles.skeletonLine, { width: '80%' }]} />
      </View>
    </Animated.View>
  );
};

const STORY_CIRCLE_SIZE = 68;

const StoryCircle: React.FC<{ list: TopTenList; onPress: () => void }> = ({ list, onPress }) => {
  const profileImage = list.profileImageUri;   // square avatar — independent from cover
  const categoryColor = CATEGORY_COLORS[list.category] || '#CC0000';
  const catIcon = CATEGORIES.find((c) => c.label === list.category)?.icon ?? 'list-outline';
  return (
    <TouchableOpacity style={styles.storyWrap} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.storyCircle, { borderColor: categoryColor }]}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={[StyleSheet.absoluteFill, { borderRadius: STORY_CIRCLE_SIZE / 2 }]} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: categoryColor, borderRadius: STORY_CIRCLE_SIZE / 2, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name={catIcon as any} size={26} color="rgba(255,255,255,0.9)" />
          </View>
        )}
      </View>
      {/* Camera badge shows when no profile image is set */}
      {!profileImage && (
        <View style={styles.storyCameraBadge}>
          <Ionicons name="camera" size={10} color="#FFF" />
        </View>
      )}
      <Text style={styles.storyTitle} numberOfLines={2}>{list.title}</Text>
    </TouchableOpacity>
  );
};

interface CommunityCardProps {
  list: CommunityList;
  submitted: boolean;
  onPress: () => void;
  liveCount?: number;
  hideItems?: boolean;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ list, submitted, onPress, liveCount, hideItems }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const top3 = list.items.slice(0, 3);

  useEffect(() => {
    fetchCommunityImage(list.id, list.imageQuery, list.category, list.items[0]?.title, list.staticImageUrl).then(setImageUrl);
  }, [list.id]);

  const citySlug = (list.region ?? '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const isSeeded = list.id.startsWith('local-') && TOP_500_CITY_SLUG_SET.has(citySlug);
  const voteCount = list.items.length === 0 ? 0 : (liveCount ?? (isSeeded ? list.participantCount : 0));

  return (
    <TouchableOpacity style={styles.communityCard} onPress={onPress} activeOpacity={0.85}>
      {/* Header — mirrors PickCard exactly */}
      <View style={[styles.communityCardHeader, { backgroundColor: list.color }]}>
        <LinearGradient
          colors={['#000000', list.color]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, styles.communityCardScrim]} />
        <Text style={styles.communityCardCategory}>{list.category.toUpperCase()}</Text>
        <Ionicons name={list.icon as any} size={28} color="#FFF" />
        {submitted && (
          <View style={styles.communityCheckBadge}>
            <Text style={styles.communityCheckText}>✓</Text>
          </View>
        )}
      </View>
      {/* Body */}
      <View style={styles.communityCardBody}>
        <Text style={styles.communityCardTitle} numberOfLines={2}>{list.title}</Text>
        <Text style={styles.communityCardCount}>{voteCount.toLocaleString()} voted</Text>
        {!hideItems && voteCount > 0 && top3.map((item, idx) => (
          <Text key={item.id} style={styles.communityCardItem} numberOfLines={1}>
            {idx + 1}. {item.title}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
};

export const MyListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { lists, listsLoading, updateListMeta } = useListContext();
  const { userRankings, participantCounts, refreshParticipantCounts } = useCommunity();
  const [activeCategory, setActiveCategory] = useState('All');
  // undefined = still detecting, null = failed / no match
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null | undefined>(undefined);
  const [localPlacesLists, setLocalPlacesLists] = useState<CommunityList[]>([]);
  const [changeLocationVisible, setChangeLocationVisible] = useState(false);
  const insets = useSafeAreaInsets();
  // Generation counter incremented synchronously in the event handler — always
  // before any in-flight fetch can complete. Each fetch captures its generation;
  // if the counter has moved on by the time it resolves, the result is discarded.
  const fetchGenRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [localListsReady, setLocalListsReady] = useState(false);
  const [storyList, setStoryList] = useState<TopTenList | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  // Separate state for photo target so the story modal can fully close before the picker opens
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);
  const [storyPhotoPickerVisible, setStoryPhotoPickerVisible] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const votedInitialized = useRef(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Read early (fast) so it's ready when we need it
    const raw = await AsyncStorage.getItem('@topten_viewed_featured').catch(() => null);
    const storedIds = raw ? (JSON.parse(raw) as string[]) : [];
    if (detectedLocation?.city) {
      fetchGenRef.current += 1;
      const gen = fetchGenRef.current;
      setLocalListsReady(false);
      setLocalPlacesLists([]);
      const [lists] = await Promise.all([
        fetchLocalPlacesLists(detectedLocation.city).catch(() => [] as any[]),
        new Promise<void>(r => setTimeout(r, 600)),
      ]);
      if (fetchGenRef.current === gen && lists.length > 0) {
        registerDynamicLists(lists);
        setLocalPlacesLists(lists);
        refreshParticipantCounts(lists.map((l) => l.id));
      }
      setLocalListsReady(true);
    }
    // Apply card reordering right as spinner disappears
    setViewedIds(new Set(storedIds));
    setVotedIds(new Set(Object.keys(userRankings).filter(id => userRankings[id]?.submitted)));
    setFeedRefreshKey(k => k + 1);
    setRefreshing(false);
  }, [detectedLocation?.city, userRankings]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      getDetectedLocation().then(setDetectedLocation);
      setFeedRefreshKey(k => k + 1);
      if (localPlacesLists.length > 0) {
        refreshParticipantCounts(localPlacesLists.map(l => l.id));
      } else {
        refreshParticipantCounts();
      }
    }, [user, refreshParticipantCounts, localPlacesLists])
  );


  useEffect(() => {
    if (!user || !detectedLocation?.city) return;
    const gen = fetchGenRef.current;
    setLocalListsReady(false);
    setLocalPlacesLists([]);

    let settled = false;
    const timeoutId = setTimeout(() => {
      if (!settled && fetchGenRef.current === gen) {
        settled = true;
        setLocalListsReady(true);
      }
    }, 8000);

    fetchLocalPlacesLists(detectedLocation.city).then((lists) => {
      clearTimeout(timeoutId);
      if (settled || fetchGenRef.current !== gen) return;
      settled = true;
      if (lists.length > 0) {
        registerDynamicLists(lists);
        setLocalPlacesLists(lists);
        refreshParticipantCounts(lists.map((l) => l.id));
      }
      setLocalListsReady(true);
    }).catch(() => {
      clearTimeout(timeoutId);
      if (!settled && fetchGenRef.current === gen) {
        settled = true;
        setLocalListsReady(true);
      }
    });

    return () => clearTimeout(timeoutId);
  }, [detectedLocation?.city]);

  // Load persisted viewed featured IDs on mount — filter to valid list IDs only
  useEffect(() => {
    const validIds = new Set(FEATURED_LISTS.map(l => l.id));
    AsyncStorage.getItem('@topten_viewed_featured').then(raw => {
      if (!raw) return;
      const ids: string[] = JSON.parse(raw);
      const filtered = ids.filter(id => validIds.has(id));
      // If ALL lists are marked viewed it's stale dev data — clear it
      if (filtered.length >= FEATURED_LISTS.length) {
        AsyncStorage.removeItem('@topten_viewed_featured').catch(() => {});
        return;
      }
      if (filtered.length !== ids.length) {
        AsyncStorage.setItem('@topten_viewed_featured', JSON.stringify(filtered)).catch(() => {});
      }
      if (filtered.length > 0) setViewedIds(new Set(filtered));
    }).catch(() => {});
  }, []);

  // Initialize votedIds from userRankings on first load (persists via Supabase)
  useEffect(() => {
    if (votedInitialized.current) return;
    const submittedKeys = Object.keys(userRankings).filter(id => userRankings[id]?.submitted);
    if (submittedKeys.length === 0) return;
    votedInitialized.current = true;
    setVotedIds(new Set(submittedKeys));
  }, [userRankings]);

  const citySlugForFeed = detectedLocation?.city
    ? detectedLocation.city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : null;
  const { posts: feedPosts, total: feedTotal, loading: feedLoading } = useCityFeedPreview(citySlugForFeed, feedRefreshKey);

  const allCategories = ['All', ...ALL_CATEGORY_LABELS];

  // Respect the user-defined order (set via All Lists reorder)
  const filteredLists = activeCategory === 'All'
    ? lists
    : lists.filter((l) => l.category === activeCategory);

  const displayLists = filteredLists.slice(0, 10);

  const filteredFeatured = useMemo(() => {
    const base = activeCategory === 'All'
      ? FEATURED_LISTS
      : FEATURED_LISTS.filter((l) => l.category === activeCategory);
    const unreviewed = base.filter(l => !viewedIds.has(l.id));
    const reviewed = base.filter(l => viewedIds.has(l.id));
    return [...unreviewed, ...reviewed];
  }, [activeCategory, viewedIds]);

  const filteredCommunity = useMemo(() => {
    const base = activeCategory === 'All'
      ? COMMUNITY_LISTS
      : COMMUNITY_LISTS.filter((l) => l.category === activeCategory);
    const unvoted = base.filter(l => !votedIds.has(l.id));
    const voted = base.filter(l => votedIds.has(l.id));
    return [...unvoted, ...voted];
  }, [activeCategory, votedIds]);

  // Only show local lists whose region matches the detected location.
  // While still detecting (undefined) or on failure (null), show nothing.
  const locationFiltered = detectedLocation
    ? LOCAL_COMMUNITY_LISTS.filter((cl) => regionMatches(cl.region ?? '', detectedLocation))
    : [];
  const filteredLocal = activeCategory === 'All'
    ? locationFiltered
    : locationFiltered.filter((cl) => cl.category === activeCategory);

  const filteredPlaces = activeCategory === 'All'
    ? localPlacesLists
    : localPlacesLists.filter((cl) => cl.category === activeCategory);

  const allLocalLists = useMemo(() => {
    const base = [...filteredLocal, ...filteredPlaces];
    const unvoted = base.filter(l => !votedIds.has(l.id));
    const voted = base.filter(l => votedIds.has(l.id));
    return [...unvoted, ...voted];
  }, [filteredLocal, filteredPlaces, votedIds]);
  // Full location-filtered list (no category filter) for the See All screen
  const allLocalListsUnfiltered = [...locationFiltered, ...localPlacesLists];

  return (
    <View style={styles.container}>
      {/* Fixed header — logo + refresh indicator + pill bar */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
            <Text style={styles.logoTop}>Top</Text>
            <Text style={styles.logoTen}>X</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateList')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={26} color={colors.activeTab} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillBar}
        >
          {allCategories.map((cat) => {
            const active = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.activeTab}
            colors={[colors.activeTab]}
          />
        }
        showsVerticalScrollIndicator={false}
      >

      {/* My Lists — story strip (top of feed) */}
      <View style={styles.sectionHeaderRow}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => user ? navigation.navigate('MyLists') : navigation.navigate('AuthScreen')} activeOpacity={0.7}>
          <Text style={styles.sectionHeaderInline}>My Lists</Text>
          <Ionicons name="chevron-forward" size={22} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>

      {user ? (
        <>
          {listsLoading ? (
            <ActivityIndicator size="small" color={colors.activeTab} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storyStrip}
            >
              {displayLists.map((list) => (
                <StoryCircle
                  key={list.id}
                  list={list}
                  onPress={() => setStoryList(list)}
                />
              ))}
              {displayLists.length === 0 && (
                <Text style={styles.storyEmptyHint}>No lists yet — create your first one!</Text>
              )}
              {/* New List circle */}
              <TouchableOpacity style={styles.storyWrap} onPress={() => navigation.navigate('CreateList')} activeOpacity={0.8}>
                <View style={styles.storyCircleNew}>
                  <Ionicons name="add" size={28} color={colors.activeTab} />
                </View>
                <Text style={styles.storyTitle}>New List</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      ) : (
        <TouchableOpacity style={styles.myListsLockCard} onPress={() => navigation.navigate('AuthScreen')} activeOpacity={0.85}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.secondaryText} />
          <View style={{ flex: 1 }}>
            <Text style={styles.myListsLockTitle}>Sign in to see your lists</Text>
            <Text style={styles.myListsLockSub}>Create and manage your personal rankings</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
        </TouchableOpacity>
      )}

      {/* Community Lists */}
      {filteredCommunity.length > 0 && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.sectionHeaderLink}
            onPress={() => navigation.navigate('AllCommunityLists')}
            activeOpacity={0.6}
          >
            <Text style={styles.sectionHeaderInline}>Community Lists</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.secondaryText} />
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {filteredCommunity.map((cl) => (
              <CommunityCard
                key={cl.id}
                list={cl}
                submitted={userRankings[cl.id]?.submitted ?? false}
                onPress={() => navigation.navigate('CommunityList', { communityListId: cl.id })}
                liveCount={participantCounts[cl.id]}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* In your area */}
      {(!user || (user && detectedLocation?.city) || allLocalLists.length > 0 || refreshing) && (
        <>
          <View style={styles.divider} />
          {!user ? (
            <InYourAreaLockCard onSignIn={() => navigation.navigate('AuthScreen')} />
          ) : (
            <>
              <View style={styles.sectionHeaderRow}>
                <TouchableOpacity
                  style={styles.titleWithIcon}
                  onPress={() => navigation.navigate('AllLocalLists', {
                    lists: allLocalListsUnfiltered,
                    city: detectedLocation?.city || detectedLocation?.region,
                  })}
                  activeOpacity={0.6}
                >
                  <Text style={styles.sectionHeaderInline}>In your area</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
                {detectedLocation ? (
                  <TouchableOpacity
                    style={styles.areaHeaderLeft}
                    onPress={() => setChangeLocationVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
                    <Text style={styles.areaRegionLabel}>
                      {formatLocationLabel(detectedLocation)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {(refreshing || !localListsReady) ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                  scrollEnabled={false}
                >
                  {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </ScrollView>
              ) : allLocalLists.length === 0 ? (
                <View style={styles.emptyArea}>
                  <Text style={styles.emptyAreaText}>No local picks here yet — pull down to refresh.</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                >
                  {allLocalLists.map((cl) => (
                    <CommunityCard
                      key={cl.id}
                      list={cl}
                      submitted={userRankings[cl.id]?.submitted ?? false}
                      onPress={() => navigation.navigate('CommunityList', { communityListId: cl.id })}
                      liveCount={participantCounts[cl.id]}
                      hideItems
                    />
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </>
      )}

      {/* Featured Lists — bottom of feed */}
      {filteredFeatured.length > 0 && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.sectionHeaderLink}
            onPress={() => navigation.navigate('AllFeaturedLists')}
            activeOpacity={0.6}
          >
            <Text style={styles.sectionHeaderInline}>Featured Lists</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.secondaryText} />
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {filteredFeatured.map((list) => (
              <PickCard
                key={list.id}
                pick={list}
                onPress={() => {
                  const next = new Set(viewedIds);
                  next.add(list.id);
                  AsyncStorage.setItem('@topten_viewed_featured', JSON.stringify([...next])).catch(() => {});
                  navigation.navigate('FeaturedList', { featuredId: list.id });
                }}
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Community Feed teaser — any city with a detected location */}
      {citySlugForFeed && detectedLocation?.city && (
        <>
          <View style={styles.divider} />
          <View style={styles.sectionHeaderRow}>
            <TouchableOpacity
              style={styles.titleWithIcon}
              onPress={() => navigation.navigate('CommunityFeed', {
                citySlug: citySlugForFeed,
                cityName: detectedLocation.city,
              })}
              activeOpacity={0.6}
            >
              <Text style={styles.sectionHeaderInline}>Community Feed</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.areaHeaderLeft}
              onPress={() => setChangeLocationVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
              <Text style={styles.areaRegionLabel}>{detectedLocation.city}</Text>
            </TouchableOpacity>
          </View>
          {feedPosts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carousel}
            >
              {feedPosts.slice(0, 5).map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  compact
                  onPress={() => navigation.navigate('PublishedList', { postId: post.id })}
                />
              ))}
            </ScrollView>
          ) : !feedLoading ? (
            <View style={styles.feedEmptyState}>
              <Ionicons name="megaphone-outline" size={22} color={colors.border} />
              <View>
                <Text style={styles.feedEmptyText}>Be the first to post in {detectedLocation.city}!</Text>
                <Text style={styles.feedEmptyHint}>Open any list → tap Post to Community Feed</Text>
              </View>
            </View>
          ) : null}
        </>
      )}

      {/* Story quick-view sheet */}
      {storyList && (() => {
        const catColor = CATEGORY_COLORS[storyList.category] || '#CC0000';
        const hasCover = !!storyList.coverImageUri;   // wide header in the sheet
        const hasProfile = !!storyList.profileImageUri; // circle + My Lists row avatar
        return (
          <Modal
            visible
            transparent
            animationType="slide"
            onRequestClose={() => setStoryList(null)}
          >
            {/* justifyContent:flex-end pins the sheet to the bottom */}
            <View style={styles.storyModalContainer}>
              {/* absoluteFillObject backdrop — dark behind corners too, fixing white corner bleed */}
              <Pressable style={styles.storyOverlay} onPress={() => setStoryList(null)} />
              {/* onStartShouldSetResponder claims touches so the backdrop doesn't fire */}
              <View style={styles.storySheet} onStartShouldSetResponder={() => true}>
                {/* Header — drag handle overlaid on the image */}
                <View style={[styles.storySheetHeader, { backgroundColor: catColor }]}>
                  {hasCover && (
                    <Image
                      source={{ uri: storyList.coverImageUri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  )}
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
                  <View style={styles.storyDragHandle} />
                  <TouchableOpacity style={styles.storySheetClose} onPress={() => setStoryList(null)}>
                    <Ionicons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <View style={styles.storySheetHeaderContent}>
                    <Text style={styles.storySheetCategory}>{storyList.category.toUpperCase()}</Text>
                    <Text style={styles.storySheetTitle} numberOfLines={2}>{storyList.title}</Text>
                    <Text style={styles.storySheetCount}>{storyList.items.length} item{storyList.items.length !== 1 ? 's' : ''}</Text>
                  </View>
                </View>

                {/* Add cover photo nudge */}
                {!hasProfile && (
                  <TouchableOpacity
                    style={styles.storyAddPhoto}
                    onPress={() => {
                      setPhotoTargetId(storyList.id);
                      setStoryList(null); // close story sheet first
                      setTimeout(() => setStoryPhotoPickerVisible(true), 350); // wait for slide-out animation
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="camera-outline" size={18} color={colors.secondaryText} />
                    <Text style={styles.storyAddPhotoText}>Add a profile photo</Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.secondaryText} />
                  </TouchableOpacity>
                )}

                {/* Items — top 5 preview */}
                <View style={styles.storyItemList}>
                  {storyList.items.length === 0 ? (
                    <Text style={styles.storyEmptyItems}>No items yet — tap Edit to add some!</Text>
                  ) : (
                    <>
                      {storyList.items.slice(0, 5).map((item, i) => (
                        <View key={item.id} style={styles.storyItem}>
                          <Text style={[styles.storyItemRank, i === 0 && { color: catColor }]}>{i + 1}</Text>
                          <Text style={[styles.storyItemTitle, i === 0 && { fontWeight: '700' }]} numberOfLines={1}>{item.title}</Text>
                        </View>
                      ))}
                      {storyList.items.length > 5 && (
                        <Text style={styles.storyMoreItems}>…and {storyList.items.length - 5} more</Text>
                      )}
                    </>
                  )}
                </View>

                {/* Edit button */}
                <TouchableOpacity
                  style={[styles.storyEditButton, { backgroundColor: catColor }]}
                  onPress={() => { setStoryList(null); navigation.navigate('ListDetail', { listId: storyList.id }); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="pencil-outline" size={16} color="#FFF" />
                  <Text style={styles.storyEditButtonText}>Edit List</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      })()}

      <PhotoPickerModal
        visible={storyPhotoPickerVisible}
        onClose={() => { setStoryPhotoPickerVisible(false); setPhotoTargetId(null); }}
        title="Profile Photo"
        aspect={[1, 1]}
        orientation="squarish"
        currentUri={lists.find(l => l.id === photoTargetId)?.profileImageUri}
        onSelectUri={(uri) => {
          if (photoTargetId) updateListMeta(photoTargetId, { profileImageUri: uri });
          setStoryPhotoPickerVisible(false);
          setPhotoTargetId(null);
        }}
      />

      <ChangeLocationModal
        visible={changeLocationVisible}
        currentCity={detectedLocation?.city || detectedLocation?.region || ''}
        onClose={() => setChangeLocationVisible(false)}
        onLocationChanged={(newLoc) => {
          fetchGenRef.current += 1;  // invalidate any in-flight fetch immediately
          setLocalPlacesLists([]);
          setLocalListsReady(false);
          setDetectedLocation(newLoc);
        }}
      />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fixedHeader: {
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  logoIcon: {
    width: 45,
    height: 45,
  },
  logoTop: {
    fontSize: 34,
    fontWeight: '300',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  logoTen: {
    fontSize: 34,
    fontWeight: '800',
    color: '#CC0000',
    letterSpacing: -0.5,
  },
  pillBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    marginRight: spacing.xs,
  },
  pillActive: {
    backgroundColor: '#CC0000',
    borderColor: '#CC0000',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderInline: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
  },
  sectionHeaderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seeAllButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
  },
  areaHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  areaHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  areaRegionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  emptyArea: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyAreaText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  feedCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 16 + (spacing.sm + 2) + 44 + (spacing.sm + 2),
    marginRight: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.secondaryText,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  emptyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.activeTab,
  },
  emptyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  addText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
  },
  myListsLockCard: {
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
  myListsLockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  myListsLockSub: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  /* ── Community Card — matches PickCard dimensions exactly ── */
  communityCard: {
    width: 155,
    borderRadius: borderRadius.squircle,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadow,
  },
  communityCardHeader: {
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  communityCardScrim: {
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  communityCardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  communityCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityCheckText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  communityCardBody: {
    padding: spacing.sm + 2,
  },
  communityCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  communityCardCount: {
    fontSize: 11,
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  communityCardItem: {
    fontSize: 11,
    color: colors.secondaryText,
    lineHeight: 16,
  },

  feedEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  feedEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  feedEmptyHint: {
    fontSize: 12,
    color: colors.secondaryText,
  },

  /* ── Story strip ── */
  storyStrip: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: 14,
  },
  storyWrap: {
    alignItems: 'center',
    width: 82,
  },
  storyCircle: {
    width: STORY_CIRCLE_SIZE,
    height: STORY_CIRCLE_SIZE,
    borderRadius: STORY_CIRCLE_SIZE / 2,
    borderWidth: 2.5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  storyCameraBadge: {
    position: 'absolute',
    // Anchored relative to storyWrap — sits at bottom-right of the 68px circle
    // (circle is centered in 82px wrap, so right edge ≈ 4.5px from wrap's right)
    top: STORY_CIRCLE_SIZE - 14,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CC0000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  storyCircleNew: {
    width: STORY_CIRCLE_SIZE,
    height: STORY_CIRCLE_SIZE,
    borderRadius: STORY_CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: colors.cardBackground,
  },
  storyTitle: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '500',
    textAlign: 'center',
  },
  storyEmptyHint: {
    fontSize: 13,
    color: colors.secondaryText,
    fontStyle: 'italic',
    alignSelf: 'center',
    marginTop: 20,
  },
  /* ── Story sheet ── */
  storyModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  storyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  storySheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  storyDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignSelf: 'center',
    marginTop: 10,
  },
  storySheetHeader: {
    height: 140,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  storySheetClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storySheetHeaderContent: {
    position: 'absolute',
    bottom: 14,
    left: 18,
    right: 50,
  },
  storySheetCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  storySheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.4,
  },
  storySheetCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },
  storyAddPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  storyAddPhotoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
  },
  storyItemList: {},
  storyMoreItems: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  storyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  storyItemRank: {
    width: 22,
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textAlign: 'center',
  },
  storyItemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
  },
  storyEmptyItems: {
    fontSize: 14,
    color: colors.secondaryText,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  storyEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    margin: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  storyEditButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  /* ── Skeleton loader ── */
  skeletonCard: {
    width: 155,
    borderRadius: borderRadius.squircle,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  skeletonHeader: {
    height: 75,
    backgroundColor: '#D1D1D6',
  },
  skeletonBody: {
    padding: spacing.sm + 2,
    gap: 6,
  },
  skeletonLine: {
    height: 9,
    borderRadius: 4,
    backgroundColor: '#D1D1D6',
    width: '90%',
  },
});
