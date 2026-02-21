import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchMovies, MovieResult } from '../services/tmdb';
import { colors, spacing, borderRadius, shadow } from '../theme';

export const DiscoverScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<MovieResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = (q: string) => {
    setLoading(true);
    setError(null);
    searchMovies(q)
      .then(setMovies)
      .catch(() => setError('Could not load movies. Check your connection.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    doSearch('');
  }, []);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const clearQuery = () => {
    setQuery('');
    doSearch('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>

      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={styles.logoTop}>Discover</Text>
        <Text style={styles.logoAccent}>Movies</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search any movie…"
          placeholderTextColor={colors.secondaryText}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearQuery}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      {/* Section label */}
      <Text style={styles.sectionLabel}>
        {query.trim() ? 'Search Results' : 'Popular Right Now'}
      </Text>

      {/* States */}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.activeTab} />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.secondaryText} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <MovieRow movie={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const MovieRow: React.FC<{ movie: MovieResult }> = ({ movie }) => (
  <View style={styles.row}>
    {movie.imageUrl ? (
      <Image source={{ uri: movie.imageUrl }} style={styles.poster} />
    ) : (
      <View style={[styles.poster, styles.posterFallback]}>
        <Ionicons name="film-outline" size={26} color={colors.secondaryText} />
      </View>
    )}
    <View style={styles.movieInfo}>
      <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
      {movie.year ? <Text style={styles.movieYear}>{movie.year}</Text> : null}
      {movie.overview ? (
        <Text style={styles.movieOverview} numberOfLines={2}>{movie.overview}</Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  logoTop: {
    fontSize: 34,
    fontWeight: '300',
    color: colors.primaryText,
    letterSpacing: -0.5,
  },
  logoAccent: {
    fontSize: 34,
    fontWeight: '800',
    color: '#CC0000',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
  },
  poster: {
    width: 70,
    height: 105,
  },
  posterFallback: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    gap: 4,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  movieYear: {
    fontSize: 13,
    color: '#CC0000',
    fontWeight: '600',
  },
  movieOverview: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 17,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondaryText,
  },
});
