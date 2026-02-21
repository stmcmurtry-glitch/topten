import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { searchSuggestions } from '../data/suggestions';
import { TopTenItem } from '../data/schema';
import { colors, spacing, borderRadius } from '../theme';

export const SearchScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { listId, rank, category } = route.params;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { updateListItems, lists } = useListContext();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = (q: string) => {
    setLoading(true);
    searchSuggestions(category, q)
      .then((items) => setResults(items))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  // Load initial results (popular/trending)
  useEffect(() => {
    doSearch('');
  }, [category]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleSelect = (title: string) => {
    const list = lists.find((l) => l.id === listId);
    if (!list) return;

    const existing = list.items.filter((item) => item.rank !== rank);
    const newItem: TopTenItem = {
      id: `${listId}-${rank}`,
      rank,
      title,
    };
    updateListItems(listId, [...existing, newItem]);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={`Search ${category.toLowerCase()}…`}
          placeholderTextColor={colors.secondaryText}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); doSearch(''); }}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.activeTab} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item}-${i}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
              <Text style={styles.rowText}>{item}</Text>
              <Ionicons name="add-circle-outline" size={22} color={colors.activeTab} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No results found</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    margin: spacing.lg,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: spacing.md,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    marginBottom: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: {
    fontSize: 16,
    color: colors.primaryText,
    flex: 1,
  },
  empty: {
    textAlign: 'center',
    color: colors.secondaryText,
    marginTop: spacing.xxl,
    fontSize: 15,
  },
});
