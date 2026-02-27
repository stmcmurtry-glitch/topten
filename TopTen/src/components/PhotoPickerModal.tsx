import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadow } from '../theme';

const UNSPLASH_KEY =
  process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ||
  'unqrIzAOMjppLYzOuOau81W5fKHuaUpyo8QPy8jesZI';

interface PhotoPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with a URI string to set, or undefined to remove */
  onSelectUri: (uri: string | undefined) => void;
  currentUri?: string;
  title?: string;
  /** Image crop aspect ratio. Defaults to [1,1] (square) */
  aspect?: [number, number];
  /** Unsplash orientation filter. Defaults to 'squarish' */
  orientation?: 'squarish' | 'landscape' | 'portrait';
}

export const PhotoPickerModal: React.FC<PhotoPickerModalProps> = ({
  visible,
  onClose,
  onSelectUri,
  currentUri,
  title = 'Choose Photo',
  aspect = [1, 1],
  orientation = 'squarish',
}) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setPhotos([]);
      setLoading(false);
    }
  }, [visible]);

  const searchPhotos = (q: string) => {
    if (!q.trim()) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(
      `https://api.unsplash.com/search/photos` +
      `?query=${encodeURIComponent(q.trim())}` +
      `&per_page=9&orientation=${orientation}` +
      `&client_id=${UNSPLASH_KEY}`
    )
      .then((r) => r.json())
      .then((data) => {
        const urls: string[] = (data.results ?? [])
          .map((p: any) => p.urls?.small ?? p.urls?.regular)
          .filter(Boolean);
        setPhotos(urls);
      })
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPhotos(text), 500);
  };

  const handleLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to choose an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect,
      quality: 0.8,
    });
    if (!result.canceled) {
      onSelectUri(result.assets[0].uri);
      onClose();
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect,
      quality: 0.8,
    });
    if (!result.canceled) {
      onSelectUri(result.assets[0].uri);
      onClose();
    }
  };

  const showEmpty = !loading && query.trim().length === 0;
  const showNoResults = !loading && query.trim().length > 0 && photos.length === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={16}>
            <Ionicons name="close" size={22} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.secondaryText} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search photos…"
            placeholderTextColor={colors.secondaryText}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleQueryChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Gallery area */}
        {loading ? (
          <ActivityIndicator color={colors.activeTab} style={styles.loader} size="large" />
        ) : showEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={44} color={colors.border} />
            <Text style={styles.emptyTitle}>Search for a photo</Text>
            <Text style={styles.emptyBody}>Type anything — a place, mood, or subject</Text>
          </View>
        ) : showNoResults ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No results for "{query}"</Text>
            <Text style={styles.emptyBody}>Try a different search term</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(_, i) => i.toString()}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.photoCell}
                onPress={() => { onSelectUri(item); onClose(); }}
                activeOpacity={0.8}
              >
                <Image source={{ uri: item }} style={styles.photo} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Device actions */}
        <Text style={styles.sectionLabel}>OR CHOOSE FROM DEVICE</Text>
        <View style={styles.actionCard}>
          <TouchableOpacity style={styles.actionRow} onPress={handleLibrary} activeOpacity={0.7}>
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(204,0,0,0.08)' }]}>
              <Ionicons name="image-outline" size={20} color={colors.activeTab} />
            </View>
            <Text style={styles.actionLabel}>Photo Library</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity style={styles.actionRow} onPress={handleCamera} activeOpacity={0.7}>
            <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(204,0,0,0.08)' }]}>
              <Ionicons name="camera-outline" size={20} color={colors.activeTab} />
            </View>
            <Text style={styles.actionLabel}>Camera</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          {currentUri && (
            <>
              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => { onSelectUri(undefined); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </View>
                <Text style={[styles.actionLabel, { color: '#FF3B30' }]}>Remove Photo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const CELL_GAP = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
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
    ...shadow,
    shadowOpacity: 0.05,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryText,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    gap: CELL_GAP,
    paddingBottom: spacing.lg,
  },
  photoCell: {
    flex: 1,
    margin: CELL_GAP / 2,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  actionCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 34 + spacing.md,
  },
});
