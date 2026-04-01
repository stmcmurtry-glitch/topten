import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FEATURED_LISTS, POPULAR_LISTS, STARTER_LISTS, FeaturedList, PopularList } from '../data/featuredLists';
import { useViewedLists } from '../context/ViewedListsContext';
import { COMMUNITY_LISTS, CommunityList } from '../data/communityLists';
import { fetchFeaturedItems, fetchFeaturedImage, fetchCityImage } from '../services/featuredContentService';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { EXPLORE_CITIES, ExploreCity } from '../data/exploreCities';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import { FeedPostCard } from '../components/FeedPostCard';
import { useCityFeedPreview } from '../hooks/useCityFeedPreview';
import { getDetectedLocation } from '../services/locationService';

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  'Greatest Athletes of All Time': 'The greatest competitors across all sports, ranked by career dominance, legacy, and cultural impact.',
  'Best Restaurants in the World': 'Culinary destinations ranked by Michelin recognition, chef innovation, and world-class dining experience.',
  'Greatest Songs Ever Recorded': 'Songs that defined generations, ranked by cultural impact, chart longevity, and lasting influence.',
  'Most Iconic Movie Villains': 'The most memorable antagonists in cinema, ranked by menace, complexity, and cultural footprint.',
  'Novels That Changed the World': 'Books that shifted perspectives and shaped culture, ranked by literary legacy and enduring relevance.',
  'Classic Cocktails Everyone Should Know': 'The essential cocktail canon, ranked by timelessness, balance, and bartender consensus.',
  'Most Binge-Worthy TV Series': 'The shows you can\'t stop watching, ranked by episode hooks, story arcs, and cultural obsession.',
  'Comfort Foods for Any Occasion': 'Dishes that feel like a warm hug, ranked by universal appeal, simplicity, and pure soul.',
  'Albums You Must Hear Before You Die': 'Records that demand to be heard front to back, ranked by artistry, influence, and staying power.',
  'Most Thrilling Sporting Events Ever': 'The moments that made hearts race worldwide, ranked by stakes, drama, and all-time greatness.',
  'My Favorite Foods': 'Your personal food hall of fame. Add the dishes and flavors you\'d never want to live without.',
  'My Favorite Movies': 'The films that stuck with you. Build your definitive personal ranking.',
  'My Favorite TV Shows': 'The series you\'d watch on repeat. Your personal streaming hall of fame.',
  'My Favorite Animals': 'From beloved pets to wildlife wonders — rank your favorite creatures on the planet.',
  'My Favorite Colors': 'Every palette tells a story. Which colors speak to you most?',
  'My Favorite Songs': 'The tracks that live rent-free in your head. Build your ultimate personal playlist.',
  'My Favorite Sports Teams': 'Your allegiances, ranked. Which teams have your heart through the wins and losses?',
  'My Favorite Drinks': 'From morning coffee to evening cocktails — rank your all-time favorite sips.',
};

export const DiscoverScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lists, addList } = useListContext();
  const [discoverCity, setDiscoverCity] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    getDetectedLocation().then((loc) => {
      if (loc?.city) {
        const slug = loc.city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setDiscoverCity({ name: loc.city, slug });
      }
    });
  }, []);

  const handlePopularPress = useCallback((item: PopularList) => {
    // Trending Lists have a featuredId — navigate to the curated Featured List
    if (item.featuredId) {
      navigation.navigate('FeaturedList', { featuredId: item.featuredId });
      return;
    }
    // Common Lists (STARTER_LISTS) create personal lists — require auth
    if (!user) {
      navigation.navigate('AuthScreen');
      return;
    }
    const existing = lists.find(l => l.title === item.title);
    const listId = existing ? existing.id : addList(item.category, item.title, TEMPLATE_DESCRIPTIONS[item.title]);
    navigation.navigate('ListDetail', { listId });
  }, [user, lists, addList, navigation]);

  const [query, setQuery] = useState('');
  const { viewedIds } = useViewedLists();
  const { posts: discoverFeedPosts, loading: discoverFeedLoading } = useCityFeedPreview(discoverCity?.slug ?? null);

  const q = query.toLowerCase().trim();

  const filteredFeatured = useMemo(() => {
    const base = q
      ? FEATURED_LISTS.filter(l => l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q))
      : FEATURED_LISTS;
    if (q) return base; // don't reorder search results
    const unreviewed = base.filter(l => !viewedIds.has(l.id));
    const reviewed = base.filter(l => viewedIds.has(l.id));
    return [...unreviewed, ...reviewed];
  }, [q, viewedIds]);

  const filteredCommunity = useMemo(() =>
    q ? COMMUNITY_LISTS.filter(l =>
      l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
    ) : [],
    [q]
  );

  type SearchItem =
    | { kind: 'featured'; data: FeaturedList }
    | { kind: 'community'; data: CommunityList };

  const searchResults = useMemo((): SearchItem[] => [
    ...filteredFeatured.map(d => ({ kind: 'featured' as const, data: d })),
    ...filteredCommunity.map(d => ({ kind: 'community' as const, data: d })),
  ], [filteredFeatured, filteredCommunity]);

  const isSearching = q.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
          <Text style={styles.headerTitle}>Discover</Text>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.secondaryText} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search lists…"
            placeholderTextColor={colors.secondaryText}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        /* ── Search results: featured + community combined ── */
        <FlatList
          data={searchResults}
          keyExtractor={(item) => `${item.kind}-${item.data.id}`}
          contentContainerStyle={styles.searchResults}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={colors.secondaryText} />
              <Text style={styles.emptyText}>No lists matching "{query}"</Text>
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'featured' ? (
              <FeaturedRow
                list={item.data}
                onPress={() => navigation.navigate('FeaturedList', { featuredId: item.data.id })}
              />
            ) : (
              <CommunitySearchRow
                list={item.data}
                onPress={() => navigation.navigate('CommunityList', { communityListId: item.data.id })}
              />
            )
          }
        />
      ) : (
        /* ── Default browse view ── */
        <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" contentContainerStyle={styles.browse}>
          {/* Explore Other Areas */}
          <TouchableOpacity
            style={styles.sectionHeaderLink}
            onPress={() => navigation.navigate('ExploreAreas')}
            activeOpacity={0.6}
          >
            <Text style={styles.sectionHeaderInline}>Explore Other Areas</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.secondaryText} />
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {EXPLORE_CITIES.map((city) => (
              <CityCarouselCard
                key={city.id}
                city={city}
                onPress={() => navigation.navigate('CityLists', { city: city.name })}
              />
            ))}
          </ScrollView>

          {/* Featured Lists */}
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
            {FEATURED_LISTS.map(list => (
              <FeaturedCard
                key={list.id}
                list={list}
                onPress={() => navigation.navigate('FeaturedList', { featuredId: list.id })}
              />
            ))}
          </ScrollView>

          {/* Local Feed teaser — any city */}
          {discoverCity && (
            <>
              <View style={styles.sectionHeaderRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => navigation.navigate('CommunityFeed', {
                    citySlug: discoverCity.slug,
                    cityName: discoverCity.name,
                  })}
                  activeOpacity={0.6}
                >
                  <Text style={styles.sectionHeaderInline}>Local Feed</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.secondaryText }}>{discoverCity.name}</Text>
                </View>
              </View>
              {discoverFeedPosts.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                >
                  {discoverFeedPosts.slice(0, 5).map((post) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      compact
                      onPress={() => navigation.navigate('PublishedList', { postId: post.id })}
                    />
                  ))}
                </ScrollView>
              ) : !discoverFeedLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 }}>
                  <Ionicons name="megaphone-outline" size={22} color={colors.border} />
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primaryText, marginBottom: 2 }}>
                      Be the first to post in {discoverCity.name}!
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.secondaryText }}>
                      Open any list → tap Post to Local Feed
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )}

          {/* Popular */}
          <Text style={styles.sectionHeader}>Trending Lists</Text>
          <View style={styles.popularCard}>
            {POPULAR_LISTS.slice(0, 10).map((list, index, arr) => (
              <React.Fragment key={list.id}>
                <PopularRow list={list} onPress={() => handlePopularPress(list)} />
                {index < arr.length - 1 && <View style={styles.popularDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Common Lists */}
          <Text style={styles.sectionHeader}>Common Lists</Text>
          <View style={styles.popularCard}>
            {STARTER_LISTS.slice(0, 10).map((list, index, arr) => (
              <React.Fragment key={list.id}>
                <PopularRow list={list} onPress={() => handlePopularPress(list)} />
                {index < arr.length - 1 && <View style={styles.popularDivider} />}
              </React.Fragment>
            ))}
          </View>

        </ScrollView>
      )}
    </View>
  );
};

/* ── Featured Card (carousel) ── */
const FeaturedCard: React.FC<{ list: FeaturedList; onPress: () => void }> = ({ list, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>(list.previewItems);

  useEffect(() => {
    if (list.staticImageUrl) {
      setImageUrl(list.staticImageUrl);
    } else {
      fetchFeaturedImage(list).then(setImageUrl);
    }
    fetchFeaturedItems(list).then((fetched) => {
      if (fetched.length > 0) setItems(fetched);
    });
  }, [list.id]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardHeader, { backgroundColor: list.color }]}>
        <LinearGradient
          colors={['#000000', list.color]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, styles.cardHeaderScrim]} />
        <Text style={styles.cardCategory}>{list.category.toUpperCase()}</Text>
        <Ionicons name={list.icon as any} size={28} color="#FFF" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{list.title}</Text>
        {items.slice(0, 3).map((item, i) => (
          <Text key={i} style={styles.cardItem} numberOfLines={1}>
            {i + 1}. {item}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
};

/* ── Popular Row (thin card inside grouped container) ── */
const PopularRow: React.FC<{ list: PopularList; onPress: () => void }> = ({ list, onPress }) => (
  <TouchableOpacity style={styles.popularRow} onPress={onPress} activeOpacity={0.6}>
    <View style={[styles.popularDot, { backgroundColor: list.color }]} />
    <Text style={styles.popularTitle} numberOfLines={1}>{list.title}</Text>
    <Text style={styles.popularCategory}>{list.category}</Text>
    <Ionicons name="chevron-forward" size={14} color={colors.border} />
  </TouchableOpacity>
);

/* ── City Carousel Card (Explore Other Areas) ── */
const CityCarouselCard: React.FC<{ city: ExploreCity; onPress: () => void }> = ({ city, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCityImage(city.id, city.wikiTitle).then(setImageUrl);
  }, [city.id]);

  return (
    <TouchableOpacity style={styles.cityCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cityCardInner, { backgroundColor: '#2C2C2E' }]}>
        <LinearGradient
          colors={['#000000', '#2C2C2E']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={styles.cityCardOverlay} />
        <View style={styles.cityCardLabel}>
          <Text style={styles.cityCardName} numberOfLines={1}>{city.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ── Featured Row (search results) ── */
const FeaturedRow: React.FC<{ list: FeaturedList; onPress: () => void }> = ({ list, onPress }) => (
  <TouchableOpacity style={styles.featuredRow} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.featuredThumb, { backgroundColor: list.color }]}>
      <Ionicons name={list.icon as any} size={26} color="#FFF" />
    </View>
    <View style={styles.featuredInfo}>
      <Text style={styles.featuredTitle} numberOfLines={1}>{list.title}</Text>
      <Text style={styles.featuredMeta}>{list.category} · {list.author}</Text>
    </View>
    <View style={styles.featuredBadge}>
      <Text style={styles.featuredBadgeText}>Featured</Text>
    </View>
    <Ionicons name="chevron-forward" size={14} color={colors.border} />
  </TouchableOpacity>
);

/* ── Community Row (search results) ── */
const CommunitySearchRow: React.FC<{ list: CommunityList; onPress: () => void }> = ({ list, onPress }) => (
  <TouchableOpacity style={styles.featuredRow} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.featuredThumb, { backgroundColor: list.color }]}>
      <Ionicons name={list.icon as any} size={26} color="#FFF" />
    </View>
    <View style={styles.featuredInfo}>
      <Text style={styles.featuredTitle} numberOfLines={1}>{list.title}</Text>
      <Text style={styles.featuredMeta}>{list.category} · {list.participantCount} votes</Text>
    </View>
    <View style={[styles.featuredBadge, styles.communityBadge]}>
      <Text style={[styles.featuredBadgeText, styles.communityBadgeText]}>Community</Text>
    </View>
    <Ionicons name="chevron-forward" size={14} color={colors.border} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  logoIcon: {
    width: 45,
    height: 45,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#CC0000',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: spacing.md,
  },
  browse: {
    paddingBottom: spacing.xxl,
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
    paddingRight: 0,
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
  seeAllButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
  },
  seeAllPadding: {
    paddingRight: spacing.lg,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  /* Featured Card */
  card: {
    width: 180,
    borderRadius: borderRadius.squircle,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  cardHeader: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  cardHeaderScrim: {
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  cardBody: {
    padding: spacing.md,
    gap: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 11,
    color: '#CC0000',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardItem: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  /* Popular */
  popularCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    gap: spacing.md,
  },
  popularDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  popularTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
  },
  popularCategory: {
    fontSize: 12,
    color: colors.secondaryText,
    flexShrink: 0,
  },
  popularDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 10 + spacing.md,
  },
  /* City Carousel Card */
  cityCard: {
    width: 140,
    height: 90,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.12,
  },
  cityCardInner: {
    flex: 1,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
  },
  cityCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  cityCardLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  cityCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  /* Search results */
  searchResults: {
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  featuredThumb: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  featuredMeta: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  featuredBadge: {
    backgroundColor: 'rgba(204,0,0,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.activeTab,
    letterSpacing: 0.3,
  },
  communityBadge: {
    backgroundColor: 'rgba(108,92,231,0.1)',
  },
  communityBadgeText: {
    color: '#6C5CE7',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
  },
});
