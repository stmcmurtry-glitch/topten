import React, { useState } from 'react';
import { ChangeLocationModal } from '../components/ChangeLocationModal';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CommunityList } from '../data/communityLists';
import { CATEGORIES } from '../data/categories';
import { useCommunity } from '../context/CommunityContext';
import { fetchCommunityImage } from '../services/featuredContentService';
import { sortCommunityLists, getCommunityBucket, PriorityBucket } from '../utils/listPriority';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { CategoryFilterSheet } from '../components/CategoryFilterSheet';

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.sectionLabel}>{text}</Text>
);

const StatusBadge: React.FC<{ bucket: PriorityBucket }> = ({ bucket }) => {
  if (bucket === 'recent') {
    return (
      <View style={[styles.badge, styles.badgeRecent]}>
        <Text style={[styles.badgeText, styles.badgeTextRecent]}>VOTED ✓</Text>
      </View>
    );
  }
  if (bucket === 'new') {
    return null;
  }
  return (
    <View style={[styles.badge, styles.badgeDone]}>
      <Text style={[styles.badgeText, styles.badgeTextDone]}>VOTED</Text>
    </View>
  );
};

const LocalFeedRow: React.FC<{
  list: CommunityList;
  bucket: PriorityBucket;
  onPress: () => void;
  liveCount?: number;
}> = ({ list, bucket, onPress, liveCount }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCommunityImage(list.id, list.imageQuery, list.category, list.items[0]?.title, list.staticImageUrl).then(setImageUrl);
  }, [list.id]);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.thumb, { backgroundColor: list.color }]}>
        <LinearGradient
          colors={['#000000', list.color]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={list.icon as any} size={28} color="#FFF" />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTopRow}>
          <View style={[styles.categoryChip, { backgroundColor: list.color + '22' }]}>
            <Text style={[styles.categoryChipText, { color: list.color }]}>
              {list.category.toUpperCase()}
            </Text>
          </View>
          <StatusBadge bucket={bucket} />
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>{list.title}</Text>
        <Text style={styles.rowMeta}>{(liveCount ?? 0).toLocaleString()} voted</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
};

interface RouteParams {
  lists: CommunityList[];
  city?: string;
}

export const AllLocalListsScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { lists, city } = route.params as RouteParams;
  const insets = useSafeAreaInsets();
  const { userRankings, participantCounts } = useCommunity();
  const [activeCategory, setActiveCategory] = useState('All');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'vote-now' | 'voted'>('all');
  const [changeLocationVisible, setChangeLocationVisible] = useState(false);
  const [query, setQuery] = useState('');

  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'vote-now', label: 'Vote Now' },
    { key: 'voted', label: 'Voted' },
  ] as const;

  const q = query.toLowerCase().trim();
  const filtered = lists
    .filter((l) => activeCategory === 'All' || l.category === activeCategory)
    .filter((l) => !q || l.title.toLowerCase().includes(q));

  const { recent, newLists, done } = sortCommunityLists(filtered, userRankings);

  const sections: Array<{ key: string; data: CommunityList[]; label: string }> = [];
  if ((statusFilter === 'all' || statusFilter === 'voted') && recent.length > 0)
    sections.push({ key: 'recent', data: recent, label: 'RECENTLY VOTED' });
  if ((statusFilter === 'all' || statusFilter === 'vote-now') && newLists.length > 0)
    sections.push({ key: 'new', data: newLists, label: 'VOTE NOW' });
  if ((statusFilter === 'all' || statusFilter === 'voted') && done.length > 0)
    sections.push({ key: 'done', data: done, label: 'VOTED' });

  const categoryLabel = activeCategory === 'All' ? 'All Categories' : activeCategory;
  const categoryColor = activeCategory === 'All'
    ? undefined
    : CATEGORIES.find(c => c.label === activeCategory)?.color;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.screenTitle}>In Your Area</Text>
          {city ? (
            <TouchableOpacity
              style={styles.cityPill}
              onPress={() => setChangeLocationVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.8)" />
              <Text style={styles.cityText}>{city}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search local lists…"
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

      <ChangeLocationModal
        visible={changeLocationVisible}
        currentCity={city || ''}
        onClose={() => setChangeLocationVisible(false)}
        onLocationChanged={() => navigation.goBack()}
      />

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
                  <LocalFeedRow
                    list={list}
                    bucket={getCommunityBucket(list.id, userRankings)}
                    onPress={() => navigation.navigate('CommunityList', { communityListId: list.id })}
                    liveCount={participantCounts[list.id]}
                  />
                  {idx < section.data.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No local lists found.</Text>
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
    paddingBottom: spacing.lg,
  },
  backBtn: {
    width: 32,
  },
  headerSpacer: {
    width: 32,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cityText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
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
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeRecent: {
    backgroundColor: '#2ECC71',
  },
  badgeDone: {
    backgroundColor: colors.border,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  badgeTextRecent: {
    color: '#FFF',
  },
  badgeTextDone: {
    color: colors.secondaryText,
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
