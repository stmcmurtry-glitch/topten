import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopTenList } from '../data/schema';
import { CATEGORY_COLORS } from './FeedRow';
import { fetchCategoryImage, getListTopImageUrl } from '../services/imageService';
import { borderRadius } from '../theme';

interface ListThumbnailProps {
  list: TopTenList;
  size: number;
  radius?: number;
}

export const ListThumbnail: React.FC<ListThumbnailProps> = ({ list, size, radius }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(
    () => list.profileImageUri ?? getListTopImageUrl(list)
  );

  useEffect(() => {
    // User-chosen profile image always wins
    if (list.profileImageUri) {
      setImageUrl(list.profileImageUri);
      return;
    }
    const top = getListTopImageUrl(list);
    if (top) {
      setImageUrl(top);
      return;
    }
    // No ranked item image — fetch a category photo
    fetchCategoryImage(list.category).then(setImageUrl);
  }, [list.id, list.profileImageUri, list.items.length, list.category]);

  const fallbackColor = CATEGORY_COLORS[list.category] ?? '#AAAAAA';
  const br = radius ?? borderRadius.md;
  const iconSize = Math.round(size * 0.44);

  if (imageUrl) {
    return (
      <View style={{ width: size, height: size, borderRadius: br, overflow: 'hidden' }}>
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {/* 5% black tint so white icons stay legible */}
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: br,
        backgroundColor: fallbackColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={list.icon as any} size={iconSize} color="#FFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  tint: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
