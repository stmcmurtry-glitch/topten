import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { fetchFeaturedImage } from '../services/featuredContentService';
import { FeaturedList } from '../data/featuredLists';

export type { FeaturedList as EditorsPick };

interface PickCardProps {
  pick: FeaturedList;
  onPress: () => void;
}

export const PickCard: React.FC<PickCardProps> = ({ pick, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedImage(pick).then(setImageUrl);
  }, [pick.id]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.header, { backgroundColor: pick.color }]}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        <Text style={styles.categoryLabel}>{pick.category.toUpperCase()}</Text>
        <Ionicons name={pick.icon as any} size={28} color="#FFF" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{pick.title}</Text>
        <Text style={styles.meta}>Featured · 10 items</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 155,
    borderRadius: borderRadius.squircle,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: 'hidden',
    marginRight: spacing.md,
    ...shadow,
  },
  header: {
    height: 75,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  body: {
    padding: spacing.sm + 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    color: colors.secondaryText,
  },
});
