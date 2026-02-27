import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TopTenList } from '../data/schema';
import { CATEGORY_COLORS } from './FeedRow';
import { borderRadius } from '../theme';

interface ListThumbnailProps {
  list: TopTenList;
  size: number;
  radius?: number;
}

export const ListThumbnail: React.FC<ListThumbnailProps> = ({ list, size, radius }) => {
  const fallbackColor = CATEGORY_COLORS[list.category] ?? '#AAAAAA';
  const br = radius ?? borderRadius.md;
  const iconSize = Math.round(size * 0.44);

  if (list.profileImageUri) {
    return (
      <View style={{ width: size, height: size, borderRadius: br, overflow: 'hidden' }}>
        <Image source={{ uri: list.profileImageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
