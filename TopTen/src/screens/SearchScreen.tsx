import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { useCommunity } from '../context/CommunityContext';
import { searchSuggestions, isApiCategory, SearchResult } from '../data/suggestions';
import { TopTenItem } from '../data/schema';
import { colors, spacing, borderRadius } from '../theme';

export const SearchScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { listId, rank, category, communityListId, slotIndex } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.activeTab} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  const isCommunity = !!communityListId;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const { updateListItems, lists } = useListContext();
  const { userRankings, setUserSlots } = useCommunity();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = (q: string) => {
    setLoading(true);
    setApiError(false);
    searchSuggestions(category, q)
      .then((r) => { setResults(r); })
      .catch(() => { setResults([]); setApiError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    doSearch('');
  }, [category]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleSelect = (result: SearchResult) => {
    if (isCommunity) {
      const existing = userRankings[communityListId]?.slots ?? Array(10).fill('');
      const updated = [...existing];
      updated[slotIndex] = result.title;
      setUserSlots(communityListId, updated);
      navigation.goBack();
      return;
    }
    const list = lists.find((l) => l.id === listId);
    if (!list) return;
    const existing = list.items.filter((item) => item.rank !== rank);
    const newItem: TopTenItem = {
      id: `${listId}-${rank}`,
      rank,
      title: result.title,
      imageUrl: result.imageUrl,
    };
    updateListItems(listId, [...existing, newItem]);
    navigation.goBack();
  };

  if (!isApiCategory(category)) {
    return (
      <View style={styles.container}>
        <View style={styles.comingSoon}>
          <Ionicons name="construct-outline" size={48} color={colors.secondaryText} />
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonBody}>
            We're working on building a curated list for {category}. Stay tuned!
          </Text>
          <Text style={styles.comingSoonHint}>
            In the meantime, add items to your list manually.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="pencil-outline" size={18} color="#FFF" />
            <Text style={styles.backButtonText}>Type an item instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
      ) : apiError ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.secondaryText} />
          <Text style={styles.errorTitle}>Couldn't load results</Text>
          <Text style={styles.errorBody}>
            The {category} search requires a valid API key.{'\n'}
            Add EXPO_PUBLIC_TMDB_API_KEY to your .env file.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, i) => `${item.title}-${i}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.poster} />
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Ionicons
                    name={category === 'Sports' ? 'trophy-outline' : 'film-outline'}
                    size={20}
                    color={colors.secondaryText}
                  />
                </View>
              )}
              <View style={styles.rowInfo}>
                <Text style={styles.rowText} numberOfLines={2}>{item.title}</Text>
                {item.year ? <Text style={styles.rowYear}>{item.year}</Text> : null}
              </View>
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
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    marginBottom: 1,
    paddingRight: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  poster: {
    width: 44,
    height: 66,
  },
  posterPlaceholder: {
    width: 44,
    height: 66,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  rowText: {
    fontSize: 15,
    color: colors.primaryText,
    fontWeight: '500',
  },
  rowYear: {
    fontSize: 12,
    color: '#CC0000',
    fontWeight: '600',
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: colors.secondaryText,
    marginTop: spacing.xxl,
    fontSize: 15,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  errorBody: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  comingSoonTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: spacing.md,
  },
  comingSoonBody: {
    fontSize: 16,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
  },
  comingSoonHint: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.activeTab,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
