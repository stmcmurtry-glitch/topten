import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FeedRow, CATEGORY_COLORS } from '../components/FeedRow';
import { PickCard } from '../components/PickCard';
import { FEATURED_LISTS } from '../data/featuredLists';
import { COMMUNITY_LISTS, CommunityList } from '../data/communityLists';
import { useCommunity } from '../context/CommunityContext';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { fetchCategoryImage } from '../services/imageService';

const MASTER_CATEGORIES = ['Movies', 'TV', 'Sports', 'Music', 'Food', 'Drinks'];

interface CollectionCardProps {
  category: string;
  count: number;
  onPress: () => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({ category, count, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const catColor = CATEGORY_COLORS[category] ?? '#AAAAAA';

  useEffect(() => {
    fetchCategoryImage(category).then(setImageUrl);
  }, [category]);

  return (
    <TouchableOpacity style={styles.collectionCard} onPress={onPress} activeOpacity={0.8}>
      {/* Full-bleed background */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[StyleSheet.absoluteFill, styles.collectionBg]}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: catColor }]} />
      )}
      {/* Dark scrim so text is always legible */}
      <View style={[StyleSheet.absoluteFill, styles.collectionScrim]} />
      {/* Text overlay */}
      <View style={styles.collectionOverlay}>
        <Text style={styles.collectionCategory} numberOfLines={1}>{category}</Text>
        <Text style={styles.collectionCount}>{count} list{count !== 1 ? 's' : ''}</Text>
      </View>
    </TouchableOpacity>
  );
};

interface CommunityCardProps {
  list: CommunityList;
  submitted: boolean;
  onPress: () => void;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ list, submitted, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const top3 = list.items.slice(0, 3);

  useEffect(() => {
    fetchCategoryImage(list.id).then(setImageUrl);
  }, [list.id]);

  return (
    <TouchableOpacity style={styles.communityCard} onPress={onPress} activeOpacity={0.85}>
      {/* Header — mirrors PickCard exactly */}
      <View style={[styles.communityCardHeader, { backgroundColor: list.color }]}>
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
        <Text style={styles.communityCardCount}>
          {list.participantCount.toLocaleString()} voted
        </Text>
        {top3.map((item, idx) => (
          <Text key={item.id} style={styles.communityCardItem} numberOfLines={1}>
            {idx + 1}. {item.title}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
};

export const MyListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lists } = useListContext();
  const { userRankings } = useCommunity();
  const [activeCategory, setActiveCategory] = useState('All');
  const insets = useSafeAreaInsets();

  // Build dynamic pill categories from user's lists
  const userCategories = Array.from(new Set(lists.map((l) => l.category)));
  const allCategories = ['All', ...MASTER_CATEGORIES, ...userCategories.filter(
    (c) => !MASTER_CATEGORIES.includes(c)
  )];

  // Respect the user-defined order (set via All Lists reorder)
  const filteredLists = activeCategory === 'All'
    ? lists
    : lists.filter((l) => l.category === activeCategory);

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
        {FEATURED_LISTS.map((list) => (
          <PickCard
            key={list.id}
            pick={list}
            onPress={() => navigation.navigate('FeaturedList', { featuredId: list.id })}
          />
        ))}
      </ScrollView>

      {/* Community Lists */}
      <View style={styles.divider} />
      <Text style={styles.sectionHeader}>Community Lists</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {COMMUNITY_LISTS.map((cl) => (
          <CommunityCard
            key={cl.id}
            list={cl}
            submitted={userRankings[cl.id]?.submitted ?? false}
            onPress={() => navigation.navigate('CommunityList', { communityListId: cl.id })}
          />
        ))}
      </ScrollView>

      {/* Thin divider */}
      <View style={styles.divider} />

      {/* My Top Ten */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderInline}>My Top Ten</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AllLists')} activeOpacity={0.7}>
          <Text style={styles.manageButton}>Manage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.feedCard}>
        {displayLists.map((list, index) => (
          <React.Fragment key={list.id}>
            <FeedRow
              list={list}
              onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
              flat
              rank={index + 1}
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
  manageButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
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

  collectionsRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  collectionCard: {
    width: 130,
    height: 90,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    ...shadow,
    shadowOpacity: 0.15,
  },
  collectionBg: {
    borderRadius: borderRadius.squircle,
  },
  collectionScrim: {
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  collectionOverlay: {
    padding: spacing.sm,
  },
  collectionCategory: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  collectionCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
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
});
