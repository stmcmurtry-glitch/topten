import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FeedRow, CATEGORY_COLORS } from '../components/FeedRow';
import { PickCard, EditorsPick } from '../components/PickCard';
import { colors, spacing, borderRadius, shadow } from '../theme';

const MASTER_CATEGORIES = ['Movies', 'TV', 'Sports', 'Music', 'Food', 'Drinks'];

const FEATURED_PICKS: EditorsPick[] = [
  { id: 'ep-1', title: 'Top 10 Films of All Time', category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
  { id: 'ep-2', title: 'Best TV Shows Ever Made', category: 'TV', icon: 'tv-outline', color: CATEGORY_COLORS.TV },
  { id: 'ep-3', title: 'Greatest Sports Moments', category: 'Sports', icon: 'trophy-outline', color: CATEGORY_COLORS.Sports },
  { id: 'ep-4', title: 'Albums That Defined a Decade', category: 'Music', icon: 'musical-notes-outline', color: CATEGORY_COLORS.Music },
  { id: 'ep-5', title: 'Dishes to Try Before You Die', category: 'Food', icon: 'restaurant-outline', color: CATEGORY_COLORS.Food },
  { id: 'ep-6', title: 'Wines Worth Every Sip', category: 'Drinks', icon: 'wine-outline', color: CATEGORY_COLORS.Drinks },
];

interface CollectionCardProps {
  category: string;
  count: number;
  onPress: () => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ category, count, onPress }) => {
  const catColor = CATEGORY_COLORS[category] ?? '#AAAAAA';
  const iconMap: Record<string, string> = {
    Movies: 'film-outline', TV: 'tv-outline', Sports: 'trophy-outline',
    Music: 'musical-notes-outline', Food: 'restaurant-outline', Drinks: 'wine-outline',
    Books: 'book-outline', Foods: 'restaurant-outline', Golf: 'golf-outline', Wine: 'wine-outline',
  };
  const icon = iconMap[category] ?? 'list-outline';
  return (
    <TouchableOpacity style={styles.collectionCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.collectionIcon, { backgroundColor: catColor }]}>
        <Ionicons name={icon as any} size={22} color="#FFF" />
      </View>
      <Text style={styles.collectionCategory} numberOfLines={1}>{category}</Text>
      <Text style={styles.collectionCount}>{count} list{count !== 1 ? 's' : ''}</Text>
    </TouchableOpacity>
  );
};

export const MyListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lists } = useListContext();
  const [activeCategory, setActiveCategory] = useState('All');
  const insets = useSafeAreaInsets();

  // Build dynamic pill categories from user's lists
  const userCategories = Array.from(new Set(lists.map((l) => l.category)));
  const allCategories = ['All', ...MASTER_CATEGORIES, ...userCategories.filter(
    (c) => !MASTER_CATEGORIES.includes(c)
  )];

  // Sort by most recently created (latest first)
  const sortedLists = [...lists].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const filteredLists = activeCategory === 'All'
    ? sortedLists
    : sortedLists.filter((l) => l.category === activeCategory);

  const displayLists = filteredLists.slice(0, 10);
  const hasMore = filteredLists.length > 10;

  // Build collections: categories that have at least one list
  const collectionCategories = Array.from(new Set(lists.map((l) => l.category)));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {/* App Logo */}
      <View style={styles.headerRow}>
        <View style={styles.logoRow}>
          <Text style={styles.logoTop}>Top</Text>
          <Text style={styles.logoTen}>Ten</Text>
        </View>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={() => navigation.navigate('CreateList')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color={colors.activeTab} />
        </TouchableOpacity>
      </View>

      {/* Category Pill Bar */}
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

      {/* Featured Lists */}
      <Text style={styles.sectionHeader}>Featured Lists</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {FEATURED_PICKS.map((pick) => (
          <PickCard key={pick.id} pick={pick} />
        ))}
      </ScrollView>

      {/* Thin divider */}
      <View style={styles.divider} />

      {/* My Top Ten Lists */}
      <Text style={styles.sectionHeader}>My Top Ten Lists</Text>

      <View style={styles.feedCard}>
        {displayLists.map((list, index) => (
          <React.Fragment key={list.id}>
            <FeedRow
              list={list}
              onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
              flat
            />
            {index < displayLists.length - 1 && <View style={styles.rowDivider} />}
          </React.Fragment>
        ))}
      </View>

      {displayLists.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No lists in this category yet.</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('CreateList')}
          >
            <Text style={styles.emptyButtonText}>Create one</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.allListsLink}
        onPress={() => navigation.navigate('AllLists')}
        activeOpacity={0.7}
      >
        <Text style={styles.allListsText}>All Lists</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.activeTab} />
      </TouchableOpacity>

      {/* Thin divider */}
      <View style={styles.divider} />

      {/* Collections */}
      {collectionCategories.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Collections</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collectionsRow}
          >
            {collectionCategories.map((cat) => {
              const count = lists.filter((l) => l.category === cat).length;
              return (
                <CollectionCard
                  key={cat}
                  category={cat}
                  count={count}
                  onPress={() => setActiveCategory(cat)}
                />
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Add List Footer */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateList')}
      >
        <Ionicons name="add-circle-outline" size={22} color={colors.activeTab} />
        <Text style={styles.addText}>New List</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'baseline',
    gap: 4,
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
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.06,
  },
  pillBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
  allListsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 2,
  },
  allListsText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
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
    marginLeft: spacing.lg + 50 + spacing.md,
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

  collectionsRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  collectionCard: {
    width: 110,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow,
    shadowOpacity: 0.07,
  },
  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  collectionCategory: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: 2,
  },
  collectionCount: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
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
});
