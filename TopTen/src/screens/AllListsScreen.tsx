import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { TopTenList } from '../data/schema';
import { ListThumbnail } from '../components/ListThumbnail';
import { PhotoPickerModal } from '../components/PhotoPickerModal';
import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';

const ALL_CATEGORY_LABELS = CATEGORIES.map((c) => c.label);
const ALL_PILLS = ['All', ...ALL_CATEGORY_LABELS];
import { colors, spacing, borderRadius, shadow } from '../theme';

export const AllListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lists, reorderLists, updateListMeta } = useListContext();

  const [activeCategory, setActiveCategory] = useState('All');
  const [showAll, setShowAll] = React.useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const editingList = lists.find((l) => l.id === editingListId);

  // Reset pagination when filter changes
  useEffect(() => { setShowAll(false); }, [activeCategory]);

  const filteredLists = activeCategory === 'All'
    ? lists
    : lists.filter((l) => l.category === activeCategory);

  const visibleLists = showAll ? filteredLists : filteredLists.slice(0, 10);

  // Reorder operates on the global `lists` array using the item's actual position
  const moveUp = (itemId: string) => {
    const idx = lists.findIndex((l) => l.id === itemId);
    if (idx <= 0) return;
    const next = [...lists];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    reorderLists(next);
  };

  const moveDown = (itemId: string) => {
    const idx = lists.findIndex((l) => l.id === itemId);
    if (idx >= lists.length - 1) return;
    const next = [...lists];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    reorderLists(next);
  };

  const renderItem = ({ item }: { item: TopTenList }) => {
    const globalIndex = lists.findIndex((l) => l.id === item.id);
    return (
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ListDetail', { listId: item.id })}
          style={styles.rowContent}
          activeOpacity={0.7}
        >
          <Text style={styles.rankNumber}>{globalIndex + 1}</Text>
          <TouchableOpacity onPress={() => setEditingListId(item.id)} activeOpacity={0.75}>
            <View>
              <ListThumbnail list={item} size={48} radius={10} />
              <View style={styles.thumbEditBadge}>
                <Ionicons name="camera" size={8} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.items.length} of 10 filled</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={() => moveUp(item.id)}
            disabled={globalIndex === 0}
            hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-up"
              size={20}
              color={globalIndex === 0 ? colors.border : colors.secondaryText}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => moveDown(item.id)}
            disabled={globalIndex === lists.length - 1}
            hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-down"
              size={20}
              color={globalIndex === lists.length - 1 ? colors.border : colors.secondaryText}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const PillBar = (
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
  );

  return (
    <View style={styles.container}>

      <FlatList
        data={visibleLists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={PillBar}
        ListFooterComponent={
          !showAll && filteredLists.length > 10 ? (
            <TouchableOpacity style={styles.seeMore} onPress={() => setShowAll(true)} activeOpacity={0.7}>
              <Text style={styles.seeMoreText}>See more</Text>
              <Ionicons name="chevron-down" size={14} color={colors.activeTab} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeCategory === 'All' ? 'No lists yet.' : `No ${activeCategory} lists.`}
            </Text>
          </View>
        }
      />
      <PhotoPickerModal
        visible={editingListId !== null}
        onClose={() => setEditingListId(null)}
        title="Profile Image"
        currentUri={editingList?.profileImageUri}
        onSelectUri={(uri) => {
          if (editingListId) updateListMeta(editingListId, { profileImageUri: uri });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pillBar: {
    paddingBottom: spacing.md,
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    ...shadow,
    shadowOpacity: 0.06,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rankNumber: {
    width: 20,
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondaryText,
    textAlign: 'right',
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  reorderButtons: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  thumbEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: spacing.sm,
  },
  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.lg,
  },
  seeMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondaryText,
  },
});
