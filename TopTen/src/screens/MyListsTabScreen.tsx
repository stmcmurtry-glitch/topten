import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FeedRow } from '../components/FeedRow';
import { PhotoPickerModal } from '../components/PhotoPickerModal';
import { CATEGORIES } from '../data/categories';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import { SignInPrompt } from '../components/SignInPrompt';
import { CategoryFilterSheet } from '../components/CategoryFilterSheet';

export const MyListsTabScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, loading: authLoading } = useAuth();
  const { lists, updateListMeta, reorderLists } = useListContext();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('All');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const editingList = lists.find((l) => l.id === editingListId);

  useEffect(() => {
    setShowAll(false);
  }, [activeCategory]);

  const q = query.toLowerCase().trim();
  const filteredLists = lists
    .filter((l) => activeCategory === 'All' || l.category === activeCategory)
    .filter((l) => !q || l.title.toLowerCase().includes(q));

  const displayLists = showAll ? filteredLists : filteredLists.slice(0, 10);

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

  if (authLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.activeTab} />
      </View>
    );
  }

  if (!user) {
    return (
      <SignInPrompt
        icon="list-outline"
        title="Your Lists"
        message="Sign in to create and save your ranked lists."
        onSignIn={() => navigation.navigate('AuthScreen')}
      />
    );
  }

  const categoryLabel = activeCategory === 'All' ? 'All Categories' : activeCategory;
  const categoryColor = activeCategory === 'All'
    ? undefined
    : CATEGORIES.find(c => c.label === activeCategory)?.color;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
          <Text style={styles.logoLight}>My</Text>
          <Text style={styles.logoBold}>Lists</Text>
        </View>
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={() => navigation.navigate('CreateList')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color={colors.activeTab} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search my lists…"
          placeholderTextColor={colors.secondaryText}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chip */}
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

      {/* Section row */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>
          {filteredLists.length} list{filteredLists.length !== 1 ? 's' : ''}
          {activeCategory !== 'All' ? `  ·  ${activeCategory}` : ''}
        </Text>
      </View>

      {/* Feed card */}
      {displayLists.length > 0 ? (
        <View style={styles.feedCard}>
          {displayLists.map((list, index) => {
            const globalIdx = lists.findIndex((l) => l.id === list.id);
            return (
              <React.Fragment key={list.id}>
                <View style={styles.feedRowWrap}>
                  <View style={{ flex: 1 }}>
                    <FeedRow
                      list={list}
                      onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
                      flat
                      rank={index + 1}
                      onPressThumb={() => setEditingListId(list.id)}
                      inlineChevron
                    />
                  </View>
                  <View style={styles.reorderBtns}>
                    <TouchableOpacity
                      onPress={() => moveUp(list.id)}
                      disabled={globalIdx === 0}
                      hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-up" size={20} color={globalIdx === 0 ? colors.border : colors.secondaryText} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(list.id)}
                      disabled={globalIdx === lists.length - 1}
                      hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="chevron-down" size={20} color={globalIdx === lists.length - 1 ? colors.border : colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                </View>
                {index < displayLists.length - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {q ? 'No lists match your search.' : activeCategory === 'All' ? 'No lists yet.' : `No ${activeCategory} lists yet.`}
          </Text>
          {!q && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateList')}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyButtonText}>Create one</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!showAll && filteredLists.length > 10 && (
        <TouchableOpacity style={styles.seeMore} onPress={() => setShowAll(true)} activeOpacity={0.7}>
          <Text style={styles.seeMoreText}>See more</Text>
          <Ionicons name="chevron-down" size={14} color={colors.activeTab} />
        </TouchableOpacity>
      )}

      <PhotoPickerModal
        visible={editingListId !== null}
        onClose={() => setEditingListId(null)}
        title="Profile Image"
        userId={user?.id}
        currentUri={editingList?.profileImageUri}
        onSelectUri={(uri) => {
          if (editingListId) updateListMeta(editingListId, { profileImageUri: uri });
        }}
      />

      <CategoryFilterSheet
        visible={sheetVisible}
        selected={activeCategory}
        onSelect={setActiveCategory}
        onClose={() => setSheetVisible(false)}
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
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoIcon: {
    width: 45,
    height: 45,
  },
  logoLight: {
    fontSize: 34,
    fontWeight: '300',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  logoBold: {
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
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
  categoryChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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
  feedRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reorderBtns: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
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
});
