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
import { FeedRow } from '../components/FeedRow';
import { PhotoPickerModal } from '../components/PhotoPickerModal';
import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';
import { colors, spacing, borderRadius, shadow } from '../theme';

const ALL_CATEGORY_LABELS = CATEGORIES.map((c) => c.label);
const ALL_PILLS = ['All', ...ALL_CATEGORY_LABELS];

export const MyListsTabScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lists, updateListMeta } = useListContext();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const editingList = lists.find((l) => l.id === editingListId);

  const filteredLists = activeCategory === 'All'
    ? lists
    : lists.filter((l) => l.category === activeCategory);

  const displayLists = filteredLists.slice(0, 10);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Lists</Text>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={() => navigation.navigate('CreateList')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color={colors.activeTab} />
        </TouchableOpacity>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillBar}
      >
        {ALL_PILLS.map((cat) => {
            const active = cat === activeCategory;
            const accent = cat === 'All' ? colors.activeTab : (CATEGORY_COLORS[cat] ?? colors.activeTab);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, active && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Section row */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>
          {filteredLists.length} list{filteredLists.length !== 1 ? 's' : ''}
          {activeCategory !== 'All' ? `  ·  ${activeCategory}` : ''}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('AllLists')} activeOpacity={0.7}>
          <Text style={styles.manageButton}>Manage</Text>
        </TouchableOpacity>
      </View>

      {/* Feed card */}
      {displayLists.length > 0 ? (
        <View style={styles.feedCard}>
          {displayLists.map((list, index) => (
            <React.Fragment key={list.id}>
              <FeedRow
                list={list}
                onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
                flat
                rank={index + 1}
                onPressThumb={() => setEditingListId(list.id)}
              />
              {index < displayLists.length - 1 && <View style={styles.rowDivider} />}
            </React.Fragment>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeCategory === 'All' ? 'No lists yet.' : `No ${activeCategory} lists yet.`}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('CreateList')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Create one</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* All Lists link */}
      {filteredLists.length > 0 && (
        <TouchableOpacity
          style={styles.allListsLink}
          onPress={() => navigation.navigate('AllLists')}
          activeOpacity={0.7}
        >
          <Text style={styles.allListsText}>All Lists</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.activeTab} />
        </TouchableOpacity>
      )}
      <PhotoPickerModal
        visible={editingListId !== null}
        onClose={() => setEditingListId(null)}
        title="Profile Image"
        currentUri={editingList?.profileImageUri}
        onSelectUri={(uri) => {
          if (editingListId) updateListMeta(editingListId, { profileImageUri: uri });
        }}
      />
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
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primaryText,
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
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  manageButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
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
    paddingVertical: spacing.xxl,
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
});
