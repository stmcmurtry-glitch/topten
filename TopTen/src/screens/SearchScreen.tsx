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
import { isVenueList, derivePlacesQuery, derivePlacesType, searchLocalPlaces, searchPlacesGlobal, getConfigForListId } from '../services/googlePlacesService';
import { resolveCommunityList } from '../data/dynamicListRegistry';
import { getDetectedLocation } from '../services/locationService';
import { TopTenItem } from '../data/schema';
import { colors, spacing, borderRadius } from '../theme';

export const SearchScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { listId, rank, category, communityListId, slotIndex, listTitle = '', region } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 20, right: 20 }}
          style={{ paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={28} color={colors.activeTab} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);
  const isCommunity = !!communityListId;
  // National community lists (no region) always show pre-seeded items — never Google Places
  const isNationalCommunity = isCommunity && !region;
  // Resolve community list early so we can read findItemMode
  const resolvedCommunityList = isCommunity ? resolveCommunityList(communityListId) : null;
  // findItemMode declared on the list takes precedence over all heuristics.
  // For local community lists (have a region) without an explicit mode, default to
  // google-places-local — this covers old Supabase data where the registry resolved
  // null or a list generated before findItemMode was added.
  const findItemMode = resolvedCommunityList?.findItemMode
    ?? (resolvedCommunityList?.useGlobalPlaces ? 'google-places-global' as const : null)
    ?? (isCommunity && region ? 'google-places-local' as const : null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allCommunityItems, setAllCommunityItems] = useState<SearchResult[]>([]);
  const [allPlacesItems, setAllPlacesItems] = useState<SearchResult[]>([]);
  const [useGlobalPlaces, setUseGlobalPlaces] = useState(false);
  const [hasSuggestedOptions, setHasSuggestedOptions] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  // undefined = still detecting, null = unavailable, string = city name
  const [placesCity, setPlacesCity] = useState<string | null | undefined>(
    findItemMode === 'google-places-local' ? (region ?? undefined) :
    !isNationalCommunity && isVenueList(listTitle, category) ? undefined : null
  );
  const { updateListItems, lists } = useListContext();
  const { userRankings, setUserSlots, recordItemLocation } = useCommunity();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesReqRef = useRef(0); // incremented on each Places API call; stale responses are discarded

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
    placesReqRef.current += 1;
    const reqId = placesReqRef.current;
    const isInitialLoad = !q.trim();
    // If we have a resolved community list, use its PLACE_CONFIG query/type directly
    // so mechanics, gyms, salons, etc. don't fall through to the restaurants default.
    const resolvedConfig = resolvedCommunityList ? getConfigForListId(resolvedCommunityList.id) : undefined;
    const effectiveQuery = q.trim() || resolvedConfig?.queryTerm || derivePlacesQuery(listTitle, category);
    // Only apply type filter on initial browse (no user query) — typed searches skip it
    // so specific venues like stadiums, arenas, etc. aren't filtered out
    const placeType = isInitialLoad ? (resolvedConfig?.placeType ?? derivePlacesType(listTitle, category)) : undefined;
    searchLocalPlaces(city, effectiveQuery, placeType)
      .then((r) => {
        if (placesReqRef.current !== reqId) return; // stale — a newer request is in flight
        const items = r as SearchResult[];
        if (isInitialLoad) setAllPlacesItems(items); // cache for instant client-side filtering
        setResults(items);
      })
      .catch(() => { if (placesReqRef.current === reqId) setResults([]); })
      .finally(() => { if (placesReqRef.current === reqId) setLoading(false); });
  }, [listTitle, category]);

  useEffect(() => {
    if (isNationalCommunity) {
      // Store pre-seeded items for filtering/browsing, but start with empty results
      const items: SearchResult[] = resolvedCommunityList?.suggestedOptions?.length
        ? resolvedCommunityList.suggestedOptions.map((title) => ({ title }))
        : resolvedCommunityList
          ? resolvedCommunityList.items.map((i) => ({ title: i.title, location: i.location, artist: i.artist }))
          : [];
      setAllCommunityItems(items);
      setUseGlobalPlaces(findItemMode === 'google-places-global');
      setHasSuggestedOptions(!!(resolvedCommunityList?.suggestedOptions?.length));
      setResults([]); // intentionally empty — user types first
      setLoading(false);
    } else if (findItemMode === 'google-places-local') {
      // Explicit local Places mode — city comes from region param or device location.
      // If the community list already has items (fetched by fetchPlacesForConfig), use
      // those directly as initial results — avoids a redundant Google Places API call.
      if (region) {
        setPlacesCity(region);
        doPlacesSearch('', region);
      } else {
        getDetectedLocation().then((loc) => {
          const city = loc?.city || null;
          setPlacesCity(city);
          if (city) doPlacesSearch('', city);
          else doSearch('');
        });
      }
    } else if (!findItemMode && isVenueList(listTitle, category)) {
      // Legacy fallback for personal venue lists without findItemMode
      if (region) {
        setPlacesCity(region);
        doPlacesSearch('', region);
      } else {
        getDetectedLocation().then((loc) => {
          const city = loc?.city || null;
          setPlacesCity(city);
          if (city) doPlacesSearch('', city);
          else doSearch('');
        });
      }
    } else {
      doSearch('');
    }
  }, [category]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (isNationalCommunity) {
      setBrowsing(false);
      if (!text.trim()) {
        setResults([]);
        return;
      }
      // Show pre-seeded matches immediately (instant)
      const seededMatches = allCommunityItems.filter((i) =>
        i.title.toLowerCase().includes(text.toLowerCase())
      );
      setResults(seededMatches);
      // Debounced augmentation for non-Places lists only (MusicBrainz, TMDB, etc.)
      // Google Places (useGlobalPlaces) fires on submit instead — see onSubmitEditing.
      if (!useGlobalPlaces && !hasSuggestedOptions) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          const seededTitles = new Set(seededMatches.map((i) => i.title.toLowerCase()));
          const apiResults = await searchSuggestions(category, text, listTitle);
          const extra = apiResults.filter((r) => !seededTitles.has(r.title.toLowerCase()));
          if (extra.length > 0) setResults([...seededMatches, ...extra]);
        }, 400);
      }
      return;
    }
    if (placesCity) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Filter the pre-loaded Places list client-side — API only fires on submit (return key)
      const q = text.toLowerCase();
      const filtered = allPlacesItems.filter((r) => r.title.toLowerCase().includes(q));
      setResults(filtered);
    } else {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doSearch(text);
      }, 400);
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (isCommunity) {
      const existing = userRankings[communityListId]?.slots ?? Array(10).fill('');
      const updated = [...existing];
      updated[slotIndex] = result.title;
      setUserSlots(communityListId, updated);
      if (result.location) recordItemLocation(communityListId, result.title, result.location);
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
      ...(result.artist ? { artist: result.artist } : {}),
      ...(result.album ? { album: result.album } : {}),
    };
    updateListItems(listId, [...existing, newItem]);
    navigation.goBack();
  };

  // Still detecting location (only personal venue lists without a known region hit this)
  if (!isNationalCommunity && findItemMode !== 'google-places-local' && isVenueList(listTitle, category) && placesCity === undefined) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.activeTab} />
        <Text style={styles.detectingText}>Finding places near you…</Text>
      </View>
    );
  }

  if (!isNationalCommunity && findItemMode !== 'google-places-local' && !isVenueList(listTitle, category) && !isApiCategory(category)) {
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
          onSubmitEditing={async () => {
            if (!query.trim()) return;
            if (placesCity) {
              doPlacesSearch(query, placesCity);
            } else if (useGlobalPlaces) {
              setLoading(true);
              const placesResults = await searchPlacesGlobal(query);
              const seededTitles = new Set(allCommunityItems.map((i) => i.title.toLowerCase()));
              const extra = (placesResults as SearchResult[]).filter(
                (r) => !seededTitles.has(r.title.toLowerCase())
              );
              const seededMatches = allCommunityItems.filter((i) =>
                i.title.toLowerCase().includes(query.toLowerCase())
              );
              setResults(extra.length > 0 ? [...seededMatches, ...extra] : seededMatches);
              setLoading(false);
            }
          }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => {
            setQuery('');
            if (placesCity) {
              setResults(allPlacesItems); // instantly restore full list
            } else {
              doSearch('');
            }
          }}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
      {query.trim().length > 0 && (
        <TouchableOpacity
          style={[styles.row, styles.rowNoImage, styles.addManualRow]}
          onPress={() => handleSelect({ title: query.trim() })}
        >
          <View style={styles.rowInfo}>
            <Text style={styles.addManualText}>Add "{query.trim()}"</Text>
          </View>
          <Ionicons name="add-circle" size={22} color={colors.activeTab} />
        </TouchableOpacity>
      )}
      {isNationalCommunity ? (
        <TouchableOpacity
          style={styles.browseToggle}
          onPress={() => {
            setBrowsing((b) => {
              if (!b) setResults(allCommunityItems);
              else setResults(query.trim()
                ? allCommunityItems.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
                : []);
              return !b;
            });
          }}
          activeOpacity={0.6}
        >
          <Text style={styles.browseToggleText}>Browse suggestions</Text>
          <Ionicons
            name={browsing ? 'chevron-up' : 'chevron-forward'}
            size={13}
            color={colors.secondaryText}
          />
        </TouchableOpacity>
      ) : (
        <Text style={styles.hint}>
          Suggestions are based on your list's category and may not always match. Can't find it? Type the name above and tap Add.
        </Text>
      )}

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator style={styles.loader} color={colors.activeTab} />
          {category === 'Books' && (
            <Text style={styles.loaderHint}>Taking a moment to find all the books in the world…</Text>
          )}
        </View>
      ) : apiError ? (
        <View style={styles.errorState}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.secondaryText} />
          <Text style={styles.errorTitle}>Couldn't load results</Text>
          <Text style={styles.errorBody}>
            Check your connection and try again.
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
                {item.location
                  ? <Text style={styles.rowLocation}>{item.location}</Text>
                  : item.year ? <Text style={styles.rowYear}>{item.year}</Text> : null
                }
              </View>
              <Ionicons name="add-circle-outline" size={22} color={colors.activeTab} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            isNationalCommunity && !query.trim() && !browsing ? (
              <View style={styles.typePrompt}>
                <Ionicons name="create-outline" size={36} color={colors.border} />
                <Text style={styles.typePromptText}>Type the name of your pick</Text>
              </View>
            ) : query.trim().length > 0 && results.length === 0 ? (
              <Text style={styles.empty}>No matches — add it with the button above</Text>
            ) : null
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
  hint: {
    fontSize: 12,
    color: colors.secondaryText,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 17,
  },
  loaderWrap: {
    alignItems: 'center',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  loaderHint: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
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
  addManualRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  addManualText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
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
  rowLocation: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  browseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  browseToggleText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  typePrompt: {
    alignItems: 'center',
    marginTop: spacing.xxl * 2,
    gap: spacing.md,
  },
  typePromptText: {
    fontSize: 15,
    color: colors.secondaryText,
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
