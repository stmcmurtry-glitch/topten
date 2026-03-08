import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FEATURED_LISTS, FeaturedList } from '../data/featuredLists';
import { CATEGORIES } from '../data/categories';
import { fetchFeaturedImage } from '../services/featuredContentService';
import { getViewedFeaturedIds, markFeaturedViewed } from '../services/viewedListsService';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { CategoryFilterSheet } from '../components/CategoryFilterSheet';

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
  const [sheetVisible, setSheetVisible] = useState(false);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'browse-again'>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getViewedFeaturedIds().then(setViewedIds);
  }, []);

  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'browse-again', label: 'Browse Again' },
  ] as const;

  const q = query.toLowerCase().trim();
  const filtered = FEATURED_LISTS
    .filter((l) => activeCategory === 'All' || l.category === activeCategory)
    .filter((l) => !q || l.title.toLowerCase().includes(q));

  const unviewed = filtered.filter((l) => !viewedIds.has(l.id));
  const viewed = filtered.filter((l) => viewedIds.has(l.id));

  const handlePress = async (list: FeaturedList) => {
    await markFeaturedViewed(list.id);
    setViewedIds((prev) => new Set([...prev, list.id]));
    navigation.navigate('FeaturedList', { featuredId: list.id });
  };

  const sections: Array<{ key: string; data: FeaturedList[]; label: string }> = [];
  if ((statusFilter === 'all' || statusFilter === 'new') && unviewed.length > 0)
    sections.push({ key: 'new', data: unviewed, label: 'NEW' });
  if ((statusFilter === 'all' || statusFilter === 'browse-again') && viewed.length > 0)
    sections.push({ key: 'viewed', data: viewed, label: 'BROWSE AGAIN' });

  const categoryLabel = activeCategory === 'All' ? 'All Categories' : activeCategory;
  const categoryColor = activeCategory === 'All'
    ? undefined
    : CATEGORIES.find(c => c.label === activeCategory)?.color;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Featured Lists</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search featured lists…"
          placeholderTextColor={colors.secondaryText}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Segmented Control */}
      <View style={styles.segmentedControl}>
        {statusOptions.map(({ key, label }) => {
          const active = statusFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setStatusFilter(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Filter Chip */}
      <TouchableOpacity
        style={[styles.categoryChipBtn, categoryColor && { borderColor: categoryColor }]}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.7}
      >
        {categoryColor && (
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
        )}
        <Text style={[styles.categoryChipBtnText, categoryColor && { color: categoryColor }]}>
          {categoryLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={categoryColor ?? colors.secondaryText} />
      </TouchableOpacity>

      {/* Sections */}
      <FlatList
        data={sections}
        keyExtractor={(s) => s.key}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
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
            <Text style={styles.emptyText}>No lists found.</Text>
          </View>
        }
      />

      <CategoryFilterSheet
        visible={sheetVisible}
        selected={activeCategory}
        onSelect={setActiveCategory}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    backgroundColor: colors.activeTab,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  backBtn: {
    width: 32,
  },
  headerSpacer: {
    width: 32,
  },
  screenTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: spacing.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#E5E5EA',
    borderRadius: borderRadius.md,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentActive: {
    backgroundColor: colors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: colors.primaryText,
  },
  categoryChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.cardBackground,
    ...shadow,
    shadowOpacity: 0.06,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
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
