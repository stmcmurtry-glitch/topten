import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EXPLORE_CITIES, ExploreCity } from '../data/exploreCities';
import { searchCities } from '../services/googlePlacesService';
import { fetchCityImage } from '../services/featuredContentService';
import { colors, spacing, borderRadius, shadow } from '../theme';

const { width } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (width - spacing.lg * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.65);

type CityResult = { name: string; secondary: string };

export const ExploreAreasScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No auto-focus — keyboard only appears when user taps the search bar

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchCities(text);
      setResults(found);
      setLoading(false);
    }, 350);
  }, []);

  const handleSelectAutocomplete = (name: string) => {
    navigation.navigate('CityLists', { city: name });
  };

  const isSearching = query.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Popular Areas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.secondaryText} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search for a city or area…"
          placeholderTextColor={colors.secondaryText}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator size="small" color={colors.secondaryText} />}
      </View>

      {isSearching ? (
        /* ── Autocomplete results list ── */
        <>
          <Text style={styles.sectionLabel}>RESULTS</Text>
          <FlatList
            key="search-results"
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No areas found for "{query}"</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleSelectAutocomplete(item.name)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name="location-sharp" size={18} color={colors.secondaryText} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  {item.secondary ? (
                    <Text style={styles.rowSecondary}>{item.secondary}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        /* ── Default: photo grid of popular areas ── */
        <>
          <Text style={styles.sectionLabel}>POPULAR AREAS</Text>
          <FlatList
            key="city-grid"
            data={EXPLORE_CITIES}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.rowWrap}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <CityCard
                city={item}
                index={index}
                onPress={() => navigation.navigate('CityLists', { city: item.name })}
              />
            )}
          />
        </>
      )}
    </View>
  );
};

/* ── City photo card ── */
const CityCard: React.FC<{ city: ExploreCity; index: number; onPress: () => void }> = ({ city, index, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCityImage(city.id, city.wikiTitle).then(setImageUrl);
  }, [city.id]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardInner, { backgroundColor: '#2C2C2E' }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={styles.cardOverlay} />
        <View style={styles.cardLabel}>
          <Text style={styles.cardCity} numberOfLines={1}>{city.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  backBtn: {
    width: 32,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadow,
    shadowOpacity: 0.06,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  /* Autocomplete list */
  listContent: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 36 + spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
  },
  rowSecondary: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 1,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.secondaryText,
  },
  /* Photo grid */
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: CARD_GAP,
  },
  rowWrap: {
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.12,
  },
  cardInner: {
    flex: 1,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  cardLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.50)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  cardCity: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
});
