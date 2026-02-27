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
import { usePostHog } from 'posthog-react-native';
import { useListContext } from '../data/ListContext';
import { CATEGORIES } from '../data/categories';
import { colors, spacing, borderRadius } from '../theme';

export const CreateListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customName, setCustomName] = useState('');
  const { addList } = useListContext();
  const posthog = usePostHog();

  const canCreate = selectedCategory.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    const title = customName.trim() || undefined;
    const id = addList(selectedCategory, title);
    posthog?.capture('list_created', { category: selectedCategory, has_custom_name: !!title });
    navigation.replace('ListDetail', { listId: id });
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={{ paddingVertical: 8, paddingHorizontal: 4 }}
        >
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          disabled={!canCreate}
          onPress={handleCreate}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          style={{ paddingVertical: 8, paddingHorizontal: 4 }}
        >
          <Text style={[styles.headerButton, styles.createButton, !canCreate && styles.disabled]}>
            Create
          </Text>
        </TouchableOpacity>
      ),
      title: 'New List',
    });
  }, [navigation, canCreate, selectedCategory, customName]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Category</Text>
      <View style={styles.grid}>
        {CATEGORIES.map(({ label, icon, color }) => {
          const active = selectedCategory === label;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.chip, active && { borderColor: color, backgroundColor: color + '22' }]}
              onPress={() => setSelectedCategory(label)}
              activeOpacity={0.7}
            >
              <Ionicons name={icon as any} size={18} color={active ? color : colors.secondaryText} />
              <Text style={[styles.chipText, active && { color, fontWeight: '600' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: spacing.xl }]}>List Name (optional)</Text>
      <TextInput
        style={styles.input}
        value={customName}
        onChangeText={setCustomName}
        placeholder={selectedCategory ? `My Top 10 ${selectedCategory}` : 'Auto-generated from category'}
        placeholderTextColor={colors.secondaryText}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={handleCreate}
      />
      <Text style={styles.hint}>Leave blank to use the default name for this category</Text>
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
