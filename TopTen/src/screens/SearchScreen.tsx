import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
import { isVenueList, derivePlacesQuery, derivePlacesType, searchLocalPlaces } from '../services/googlePlacesService';
import { getDetectedLocation } from '../services/locationService';
import { TopTenItem } from '../data/schema';
import { colors, spacing, borderRadius } from '../theme';

export const SearchScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { listId, rank, category, communityListId, slotIndex, listTitle = '' } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 20, right: 20 }}
          style={{ paddingVertical: 8, paddingHorizontal: 4 }}
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
  // undefined = still detecting, null = unavailable, string = city name
  const [placesCity, setPlacesCity] = useState<string | null | undefined>(
    isVenueList(listTitle, category) ? undefined : null
  );
  const { updateListItems, lists } = useListContext();
  const { userRankings, setUserSlots } = useCommunity();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = (q: string) => {
    setLoading(true);
    setApiError(false);
    searchSuggestions(category, q, listTitle)
      .then((r) => { setResults(r); })
      .catch(() => { setResults([]); setApiError(true); })
      .finally(() => setLoading(false));
  };

  const doPlacesSearch = useCallback((q: string, city: string) => {
    setLoading(true);
    const effectiveQuery = q.trim() || derivePlacesQuery(listTitle, category);
    // Only apply type filter on initial browse (no user query) — typed searches skip it
    // so specific venues like stadiums, arenas, etc. aren't filtered out
    const placeType = q.trim() ? undefined : derivePlacesType(listTitle, category);
    searchLocalPlaces(city, effectiveQuery, placeType)
      .then((r) => setResults(r as SearchResult[]))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [listTitle, category]);

  useEffect(() => {
    if (isVenueList(listTitle, category)) {
      getDetectedLocation().then((loc) => {
        const city = loc?.city || null;
        setPlacesCity(city);
        if (city) {
          doPlacesSearch('', city);
        } else {
          doSearch('');
        }
      });
    } else {
      doSearch('');
    }
  }, [category]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (placesCity) {
        doPlacesSearch(text, placesCity);
      } else {
        doSearch(text);
      }
    }, 400);
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

  // Still detecting location for a venue-based list
  if (isVenueList(listTitle, category) && placesCity === undefined) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.activeTab} />
        <Text style={styles.detectingText}>Finding places near you…</Text>
      </View>
    );
  }

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
      {placesCity && (
        <View style={styles.locationPill}>
          <Ionicons name="location-sharp" size={12} color={colors.activeTab} />
          <Text style={styles.locationPillText}>Near {placesCity}</Text>
        </View>
      )}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder={placesCity ? `Search places in ${placesCity}…` : `Search ${category.toLowerCase()}…`}
          placeholderTextColor={colors.secondaryText}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => {
            setQuery('');
            if (placesCity) doPlacesSearch('', placesCity);
            else doSearch('');
          }}>
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
            <TouchableOpacity
              style={[styles.row, !item.imageUrl && styles.rowNoImage]}
              onPress={() => handleSelect(item)}
            >
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.poster} />
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  detectingText: {
    fontSize: 15,
    color: colors.secondaryText,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.activeTab,
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
  rowNoImage: {
    paddingLeft: spacing.lg,
    paddingVertical: spacing.md,
  },
  poster: {
    width: 44,
    height: 66,
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
