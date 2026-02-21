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
import { fetchFeaturedItems, fetchFeaturedImage } from '../services/featuredContentService';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { colors, spacing, borderRadius, shadow } from '../theme';

export const DiscoverScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { lists, addList } = useListContext();

  const handlePopularPress = useCallback((item: PopularList) => {
    const existing = lists.find(l => l.title === item.title);
    const listId = existing ? existing.id : addList(item.category, item.title);
    navigation.navigate('ListDetail', { listId });
  }, [lists, addList, navigation]);
  const [query, setQuery] = useState('');

  const q = query.toLowerCase().trim();

  const filteredFeatured = useMemo(() =>
    q ? FEATURED_LISTS.filter(l =>
      l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
    ) : FEATURED_LISTS,
    [q]
  );

  const isSearching = q.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
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
          renderItem={({ item }) => <FeaturedRow list={item} />}
        />
      ) : (
        /* ── Default browse view ── */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.browse}>
          {/* Featured Lists */}
          <Text style={styles.sectionHeader}>Featured Lists</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {FEATURED_LISTS.map(list => (
              <FeaturedCard key={list.id} list={list} />
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
        </ScrollView>
      )}
    </View>
  );
};

/* ── Featured Card (carousel) ── */
const FeaturedCard: React.FC<{ list: FeaturedList }> = ({ list }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>(list.previewItems);

  useEffect(() => {
    fetchFeaturedImage(list).then(setImageUrl);
    fetchFeaturedItems(list).then((fetched) => {
      if (fetched.length > 0) setItems(fetched);
    });
  }, [list.id]);

  return (
    <View style={styles.card}>
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
        {items.slice(0, 5).map((item, i) => (
          <Text key={i} style={styles.cardItem} numberOfLines={1}>
            {i + 1}. {item}
          </Text>
        ))}
      </View>
    </View>
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

/* ── Featured Row (search results) ── */
const FeaturedRow: React.FC<{ list: FeaturedList }> = ({ list }) => (
  <View style={styles.featuredRow}>
    <View style={[styles.featuredThumb, { backgroundColor: list.color }]}>
      <Ionicons name={list.icon as any} size={26} color="#FFF" />
    </View>
    <View style={styles.featuredInfo}>
      <Text style={styles.featuredTitle} numberOfLines={1}>{list.title}</Text>
      <Text style={styles.featuredMeta}>{list.category} · {list.author}</Text>
    </View>
    <Ionicons name="star" size={14} color="#CC0000" />
  </View>
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
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.primaryText,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
    height: 110,
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
