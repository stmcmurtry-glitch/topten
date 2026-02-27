import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
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

const CATEGORY_QUERIES: Record<string, string> = {
  Movies:        'cinema film',
  TV:            'television watching',
  Sports:        'athlete sport',
  Music:         'concert music',
  Food:          'food restaurant',
  Drinks:        'cocktails drinks bar',
  Books:         'books library reading',
  Travel:        'travel landscape',
  Gaming:        'gaming controller',
  People:        'portrait people',
  Fashion:       'fashion style',
  Health:        'fitness wellness',
  Tech:          'technology',
  Nature:        'nature landscape',
  Arts:          'art gallery',
  Miscellaneous: 'abstract colorful',
};

interface PhotoPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with a URI string to set, or undefined to remove */
  onSelectUri: (uri: string | undefined) => void;
  category: string;
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
  category,
  currentUri,
  title = 'Choose Photo',
  aspect = [1, 1],
  orientation = 'squarish',
}) => {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const query = CATEGORY_QUERIES[category] ?? category;
    fetch(
      `https://api.unsplash.com/search/photos` +
      `?query=${encodeURIComponent(query)}` +
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
  }, [visible, category, orientation]);

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

        {/* Curated gallery */}
        <Text style={styles.sectionLabel}>GALLERY</Text>
        {loading ? (
          <ActivityIndicator color={colors.activeTab} style={styles.loader} size="large" />
        ) : photos.length > 0 ? (
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
        ) : (
          <Text style={styles.galleryEmpty}>No photos available</Text>
        )}

        {/* Device actions */}
        <Text style={styles.sectionLabel}>OR CHOOSE FROM</Text>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  loader: {
    marginTop: spacing.xxl,
  },
  galleryEmpty: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  grid: {
    paddingHorizontal: spacing.lg,
    gap: CELL_GAP,
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
