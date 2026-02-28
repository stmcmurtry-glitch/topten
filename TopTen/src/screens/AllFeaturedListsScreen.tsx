import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FEATURED_LISTS, FeaturedList } from '../data/featuredLists';
import { CATEGORIES } from '../data/categories';
import { fetchFeaturedImage } from '../services/featuredContentService';
import { getViewedFeaturedIds, markFeaturedViewed, isViewedSync } from '../services/viewedListsService';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { BackButton } from '../components/BackButton';

const ALL_CATEGORY_LABELS = CATEGORIES.map((c) => c.label);

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.sectionLabel}>{text}</Text>
);

const FeaturedFeedRow: React.FC<{
  list: FeaturedList;
  viewed: boolean;
  onPress: () => void;
}> = ({ list, viewed, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(
    list.staticImageUrl ?? null
  );

  useEffect(() => {
    if (!list.staticImageUrl) {
      fetchFeaturedImage(list).then(setImageUrl);
    }
  }, [list.id]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.thumb, { backgroundColor: list.color }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name={list.icon as any} size={28} color="#FFF" />
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTopRow}>
          <View style={[styles.categoryChip, { backgroundColor: list.color + '22' }]}>
            <Text style={[styles.categoryChipText, { color: list.color }]}>
              {list.category.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>{list.title}</Text>
        <Text style={styles.rowMeta}>{list.author}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
};

export const AllFeaturedListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getViewedFeaturedIds().then(setViewedIds);
  }, []);

  const allCategories = ['All', ...ALL_CATEGORY_LABELS];

  const filtered = activeCategory === 'All'
    ? FEATURED_LISTS
    : FEATURED_LISTS.filter((l) => l.category === activeCategory);

  const unviewed = filtered.filter((l) => !viewedIds.has(l.id));
  const viewed = filtered.filter((l) => viewedIds.has(l.id));

  const handlePress = async (list: FeaturedList) => {
    await markFeaturedViewed(list.id);
    setViewedIds((prev) => new Set([...prev, list.id]));
    navigation.navigate('FeaturedList', { featuredId: list.id });
  };

  const sections: Array<{ key: string; data: FeaturedList[]; label: string }> = [];
  if (unviewed.length > 0) sections.push({ key: 'new', data: unviewed, label: 'NEW' });
  if (viewed.length > 0) sections.push({ key: 'viewed', data: viewed, label: 'BROWSE MORE' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Featured Lists</Text>
        <View style={styles.backButton} />
      </View>

      {/* Category Pill Bar */}
      <View style={styles.pillBarWrapper}>
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
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      </View>

      {/* Sections */}
      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: section }) => (
          <View style={styles.sectionBlock}>
            <SectionLabel text={section.label} />
            <View style={styles.card}>
              {section.data.map((list, idx) => (
                <React.Fragment key={list.id}>
                  <FeaturedFeedRow
                    list={list}
                    viewed={viewedIds.has(list.id)}
                    onPress={() => handlePress(list)}
                  />
                  {idx < section.data.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No lists in this category.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  pillBarWrapper: {
    paddingVertical: spacing.md,
  },
  pillBar: {
    paddingHorizontal: spacing.lg,
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
    color: '#FFF',
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  sectionBlock: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryChip: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  newBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    lineHeight: 20,
  },
  rowMeta: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 80 + spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondaryText,
  },
});
