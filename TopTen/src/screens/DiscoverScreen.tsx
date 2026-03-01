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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FEATURED_LISTS, POPULAR_LISTS, STARTER_LISTS, FeaturedList, PopularList } from '../data/featuredLists';
import { LOCAL_COMMUNITY_LISTS, CommunityList } from '../data/communityLists';
import { fetchLocalPlacesLists } from '../services/googlePlacesService';
import { registerDynamicLists } from '../data/dynamicListRegistry';
import { fetchFeaturedItems, fetchFeaturedImage } from '../services/featuredContentService';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { getDetectedLocation, regionMatches, DetectedLocation } from '../services/locationService';
import { colors, spacing, borderRadius, shadow } from '../theme';

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
  'My Favorite Movies': 'The films that stuck with you. Build your definitive personal top ten.',
  'My Favorite TV Shows': 'The series you\'d watch on repeat. Your personal streaming hall of fame.',
  'My Favorite Animals': 'From beloved pets to wildlife wonders — rank your favorite creatures on the planet.',
  'My Favorite Colors': 'Every palette tells a story. Which colors speak to you most?',
  'My Favorite Songs': 'The tracks that live rent-free in your head. Build your ultimate personal playlist.',
  'My Favorite Sports Teams': 'Your allegiances, ranked. Which teams have your heart through the wins and losses?',
  'My Favorite Drinks': 'From morning coffee to evening cocktails — rank your all-time favorite sips.',
};

export const DiscoverScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { lists, addList } = useListContext();

  const handlePopularPress = useCallback((item: PopularList) => {
    const existing = lists.find(l => l.title === item.title);
    const listId = existing ? existing.id : addList(item.category, item.title, TEMPLATE_DESCRIPTIONS[item.title]);
    navigation.navigate('ListDetail', { listId });
  }, [lists, addList, navigation]);

  const [query, setQuery] = useState('');
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null | undefined>(undefined);
  const [localPlacesLists, setLocalPlacesLists] = useState<CommunityList[]>([]);

  useEffect(() => {
    getDetectedLocation().then(setDetectedLocation);
  }, []);

  useEffect(() => {
    if (!detectedLocation?.city) return;
    fetchLocalPlacesLists(detectedLocation.city).then((lists) => {
      if (lists.length > 0) {
        registerDynamicLists(lists);
        setLocalPlacesLists(lists);
      }
    });
  }, [detectedLocation?.city]);

  const localLists = useMemo(() => {
    if (!detectedLocation) return [];
    return LOCAL_COMMUNITY_LISTS.filter(l => l.region && regionMatches(l.region, detectedLocation));
  }, [detectedLocation]);

  const allLocalLists = useMemo(
    () => [...localLists, ...localPlacesLists],
    [localLists, localPlacesLists]
  );

  const q = query.toLowerCase().trim();

  const filteredFeatured = useMemo(() =>
    q ? FEATURED_LISTS.filter(l =>
      l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
    ) : FEATURED_LISTS,
    [q]
  );

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
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        /* ── Search results: flat combined list ── */
        <FlatList
          data={filteredFeatured}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResults}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={colors.secondaryText} />
              <Text style={styles.emptyText}>No lists matching "{query}"</Text>
            </View>
          }
          renderItem={({ item }) => (
            <FeaturedRow list={item} onPress={() => navigation.navigate('FeaturedList', { featuredId: item.id })} />
          )}
        />
      ) : (
        /* ── Default browse view ── */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.browse}>
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

          {/* Popular */}
          <Text style={styles.sectionHeader}>Popular</Text>
          <View style={styles.popularCard}>
            {POPULAR_LISTS.map((list, index) => (
              <React.Fragment key={list.id}>
                <PopularRow list={list} onPress={() => handlePopularPress(list)} />
                {index < POPULAR_LISTS.length - 1 && <View style={styles.popularDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Starters */}
          <Text style={styles.sectionHeader}>Starters</Text>
          <View style={styles.popularCard}>
            {STARTER_LISTS.map((list, index) => (
              <React.Fragment key={list.id}>
                <PopularRow list={list} onPress={() => handlePopularPress(list)} />
                {index < STARTER_LISTS.length - 1 && <View style={styles.popularDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* In your area */}
          {allLocalLists.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.areaSectionHeader}
                onPress={() => navigation.navigate('AllLocalLists', {
                  lists: allLocalLists,
                  city: detectedLocation?.city || detectedLocation?.region,
                })}
                activeOpacity={0.6}
              >
                <View style={styles.titleWithIcon}>
                  <Text style={styles.sectionHeaderInline}>In Your Area</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
                </View>
                {detectedLocation && (
                  <View style={styles.areaLocationPill}>
                    <Ionicons name="location-sharp" size={11} color={colors.activeTab} />
                    <Text style={styles.areaLocationText}>
                      {detectedLocation.city || detectedLocation.region}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.popularCard}>
                {allLocalLists.map((list, index) => (
                  <React.Fragment key={list.id}>
                    <CommunityRow
                      list={list}
                      onPress={() => navigation.navigate('CommunityList', { communityListId: list.id })}
                    />
                    {index < allLocalLists.length - 1 && <View style={styles.popularDivider} />}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}
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
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, styles.cardHeaderScrim]} />
        <Text style={styles.cardCategory}>{list.category.toUpperCase()}</Text>
        <Ionicons name={list.icon as any} size={28} color="#FFF" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{list.title}</Text>
        <Text style={styles.cardAuthor}>{list.author}</Text>
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

/* ── Community Row (In Your Area) ── */
const CommunityRow: React.FC<{ list: CommunityList; onPress: () => void }> = ({ list, onPress }) => (
  <TouchableOpacity style={styles.popularRow} onPress={onPress} activeOpacity={0.6}>
    <View style={[styles.popularDot, { backgroundColor: list.color }]} />
    <Text style={styles.popularTitle} numberOfLines={1}>{list.title}</Text>
    <Text style={styles.popularCategory}>{list.category}</Text>
    <Ionicons name="chevron-forward" size={14} color={colors.border} />
  </TouchableOpacity>
);

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
  areaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  areaLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  areaLocationText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.activeTab,
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
