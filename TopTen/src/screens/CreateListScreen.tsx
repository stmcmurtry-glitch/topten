import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { colors, spacing, borderRadius } from '../theme';

const MASTER_CATEGORIES = [
  { label: 'Movies', icon: 'film-outline' },
  { label: 'TV', icon: 'tv-outline' },
  { label: 'Sports', icon: 'trophy-outline' },
  { label: 'Music', icon: 'musical-notes-outline' },
  { label: 'Food', icon: 'restaurant-outline' },
  { label: 'Drinks', icon: 'wine-outline' },
];

export const CreateListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const { addList } = useListContext();

  const effectiveCategory = isCustom ? customCategory.trim() : selectedCategory;
  const canCreate = effectiveCategory.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    const title = customName.trim() || undefined;
    const id = addList(effectiveCategory, title);
    navigation.replace('ListDetail', { listId: id });
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          disabled={!canCreate}
          onPress={handleCreate}
        >
          <Text style={[styles.headerButton, styles.createButton, !canCreate && styles.disabled]}>
            Create
          </Text>
        </TouchableOpacity>
      ),
      title: 'New List',
    });
  }, [navigation, canCreate, effectiveCategory, customName]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Category</Text>
      <View style={styles.grid}>
        {MASTER_CATEGORIES.map(({ label, icon }) => {
          const active = !isCustom && selectedCategory === label;
          const catColor = CATEGORY_COLORS[label] ?? '#AAAAAA';
          return (
            <TouchableOpacity
              key={label}
              style={[styles.chip, active && { borderColor: catColor, backgroundColor: catColor + '18' }]}
              onPress={() => { setSelectedCategory(label); setIsCustom(false); }}
              activeOpacity={0.7}
            >
              <Ionicons name={icon as any} size={20} color={active ? catColor : colors.secondaryText} />
              <Text style={[styles.chipText, active && { color: catColor, fontWeight: '600' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.chip, isCustom && styles.chipActiveCustom]}
          onPress={() => { setIsCustom(true); setSelectedCategory(''); }}
          activeOpacity={0.7}
        >
          <Ionicons name="add-outline" size={20} color={isCustom ? colors.activeTab : colors.secondaryText} />
          <Text style={[styles.chipText, isCustom && styles.chipTextActiveCustom]}>Custom</Text>
        </TouchableOpacity>
      </View>

      {isCustom && (
        <>
          <Text style={[styles.label, { marginTop: spacing.xl }]}>Custom Category</Text>
          <TextInput
            style={styles.input}
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="e.g. Podcasts, Restaurants…"
            placeholderTextColor={colors.secondaryText}
            autoCapitalize="words"
            autoFocus
            returnKeyType="next"
          />
        </>
      )}

      <Text style={[styles.label, { marginTop: spacing.xl }]}>List Name (optional)</Text>
      <TextInput
        style={styles.input}
        value={customName}
        onChangeText={setCustomName}
        placeholder={effectiveCategory ? `My Top 10 ${effectiveCategory}` : 'Auto-generated from category'}
        placeholderTextColor={colors.secondaryText}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <Text style={styles.hint}>Leave blank to use the default name</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  chipActiveCustom: {
    borderColor: colors.activeTab,
    backgroundColor: colors.activeTab + '18',
  },
  chipTextActiveCustom: {
    color: colors.activeTab,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.primaryText,
  },
  hint: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  headerButton: {
    fontSize: 17,
    color: colors.activeTab,
  },
  createButton: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
});
