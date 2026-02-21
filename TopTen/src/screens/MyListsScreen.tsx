import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FeedRow, CATEGORY_COLORS } from '../components/FeedRow';
import { PickCard, EditorsPick } from '../components/PickCard';
import { colors, spacing, borderRadius } from '../theme';

const CATEGORIES = ['All', 'Movies', 'Books', 'Golf', 'Wine'];

const EDITORS_PICKS: EditorsPick[] = [
  { id: 'ep-1', title: 'Top 10 Films of All Time', category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
  { id: 'ep-2', title: 'Books Everyone Should Read', category: 'Books', icon: 'book-outline', color: CATEGORY_COLORS.Books },
  { id: 'ep-3', title: 'World\'s Greatest Golf Courses', category: 'Golf', icon: 'golf-outline', color: CATEGORY_COLORS.Golf },
  { id: 'ep-4', title: 'Wines Worth Every Sip', category: 'Wine', icon: 'wine-outline', color: CATEGORY_COLORS.Wine },
];

export const MyListsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lists } = useListContext();
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredLists = activeCategory === 'All'
    ? lists
    : lists.filter((l) => l.category === activeCategory);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Category Pill Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillBar}
      >
        {CATEGORIES.map((cat) => {
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

      {/* Editor's Picks */}
      <Text style={styles.sectionHeader}>Editor's Picks</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {EDITORS_PICKS.map((pick) => (
          <PickCard key={pick.id} pick={pick} />
        ))}
      </ScrollView>

      {/* My Lists */}
      <Text style={styles.sectionHeader}>My Lists</Text>
      {filteredLists.map((list) => (
        <FeedRow
          key={list.id}
          list={list}
          onPress={() => navigation.navigate('ListDetail', { listId: list.id })}
        />
      ))}
      {filteredLists.length === 0 && (
        <Text style={styles.emptyText}>No lists in this category yet.</Text>
      )}

      {/* Add Custom List */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateList')}
      >
        <Ionicons name="add-circle-outline" size={24} color={colors.activeTab} />
        <Text style={styles.addText}>Add Custom List</Text>
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
  carousel: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.secondaryText,
    fontSize: 15,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  addText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.activeTab,
  },
});
