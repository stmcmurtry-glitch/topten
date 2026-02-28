import React, { useState } from 'react';
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
import { CommunityList } from '../data/communityLists';
import { CATEGORIES } from '../data/categories';
import { useCommunity } from '../context/CommunityContext';
import { fetchCommunityImage } from '../services/featuredContentService';
import { sortCommunityLists, getCommunityBucket, PriorityBucket } from '../utils/listPriority';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { BackButton } from '../components/BackButton';

const ALL_CATEGORY_LABELS = CATEGORIES.map((c) => c.label);

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
}> = ({ list, bucket, onPress }) => {
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchCommunityImage(list.id, list.imageQuery, list.category, list.items[0]?.title).then(setImageUrl);
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
          <StatusBadge bucket={bucket} />
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>{list.title}</Text>
        <Text style={styles.rowMeta}>{list.participantCount.toLocaleString()} voted</Text>
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
  const { userRankings } = useCommunity();
  const [activeCategory, setActiveCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vote-now' | 'voted'>('all');

  const allCategories = ['All', ...ALL_CATEGORY_LABELS];
  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'vote-now', label: 'Vote Now' },
    { key: 'voted', label: 'Voted' },
  ] as const;

  const filtered = activeCategory === 'All'
    ? lists
    : lists.filter((l) => l.category === activeCategory);

  const { recent, newLists, done } = sortCommunityLists(filtered, userRankings);

  const sections: Array<{ key: string; data: CommunityList[]; label: string }> = [];
  if ((statusFilter === 'all' || statusFilter === 'voted') && recent.length > 0)
    sections.push({ key: 'recent', data: recent, label: 'RECENTLY VOTED' });
  if ((statusFilter === 'all' || statusFilter === 'vote-now') && newLists.length > 0)
    sections.push({ key: 'new', data: newLists, label: 'VOTE NOW' });
  if ((statusFilter === 'all' || statusFilter === 'voted') && done.length > 0)
    sections.push({ key: 'done', data: done, label: 'VOTED' });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>In Your Area</Text>
          {city ? (
            <View style={styles.cityPill}>
              <Ionicons name="location-sharp" size={11} color={colors.activeTab} />
              <Text style={styles.cityText}>{city}</Text>
            </View>
          ) : null}
        </View>
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
                  <LocalFeedRow
                    list={list}
                    bucket={getCommunityBucket(list.id, userRankings)}
                    onPress={() => navigation.navigate('CommunityList', { communityListId: list.id })}
                  />
                  {idx < section.data.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No local lists in this category.</Text>
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
  headerCenter: {
    alignItems: 'center',
    gap: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  cityText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.activeTab,
  },
  pillBarWrapper: {
    paddingVertical: spacing.md,
  },
  pillBar: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
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
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeNew: {
    backgroundColor: '#007AFF',
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
  badgeTextNew: {
    color: '#FFF',
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
