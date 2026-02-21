import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FEATURED_LISTS, FeaturedList } from '../data/featuredLists';
import { FeedRow, CATEGORY_COLORS } from '../components/FeedRow';
import { TopTenList } from '../data/schema';
import { colors, spacing, borderRadius, shadow } from '../theme';

export const DiscoverScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { lists } = useListContext();
  const [query, setQuery] = useState('');

  const q = query.toLowerCase().trim();

  const filteredFeatured = useMemo(() =>
    q ? FEATURED_LISTS.filter(l =>
      l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
    ) : FEATURED_LISTS,
    [q]
  );

  const filteredUserLists = useMemo(() =>
    q ? lists.filter(l =>
      l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
    ) : lists,
    [q, lists]
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
          data={[
            ...filteredFeatured.map(l => ({ ...l, _type: 'featured' as const })),
            ...filteredUserLists.map(l => ({ ...l, _type: 'user' as const })),
          ]}
          keyExtractor={(item) => `${item._type}-${item.id}`}
          contentContainerStyle={styles.searchResults}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={colors.secondaryText} />
              <Text style={styles.emptyText}>No lists matching "{query}"</Text>
            </View>
          }
          renderItem={({ item }) =>
            item._type === 'featured' ? (
              <FeaturedRow list={item as FeaturedList} />
            ) : (
              <FeedRow
                list={item as TopTenList}
                onPress={() => navigation.navigate('ListDetail', { listId: item.id })}
              />
            )
          }
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

          {/* Your Lists */}
          <Text style={styles.sectionHeader}>Your Lists</Text>
          {lists.map(list => (
            <FeedRow
              key={list.id}
              list={list}
              onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
            />
          ))}
          {lists.length === 0 && (
            <Text style={styles.emptyText}>No lists yet — create one on the Lists tab.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
};

/* ── Featured Card (carousel) ── */
const FeaturedCard: React.FC<{ list: FeaturedList }> = ({ list }) => (
  <View style={styles.card}>
    <View style={[styles.cardHeader, { backgroundColor: list.color }]}>
      <Text style={styles.cardCategory}>{list.category.toUpperCase()}</Text>
      <Ionicons name={list.icon as any} size={32} color="#FFF" />
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.cardTitle} numberOfLines={2}>{list.title}</Text>
      <Text style={styles.cardAuthor}>{list.author}</Text>
      {list.previewItems.slice(0, 3).map((item, i) => (
        <Text key={i} style={styles.cardItem} numberOfLines={1}>
          {i + 1}. {item}
        </Text>
      ))}
    </View>
  </View>
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
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
