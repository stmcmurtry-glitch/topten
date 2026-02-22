import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FEATURED_LISTS } from '../data/featuredLists';
import { fetchFeaturedItems, fetchFeaturedImage } from '../services/featuredContentService';
import { colors, spacing, borderRadius, shadow } from '../theme';

export const FeaturedListScreen: React.FC<{ route: any; navigation: any }> = ({ route }) => {
  const { featuredId } = route.params as { featuredId: string };
  const list = FEATURED_LISTS.find(l => l.id === featuredId)!;
  const insets = useSafeAreaInsets();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>(list.previewItems);

  useEffect(() => {
    fetchFeaturedImage(list).then(setImageUrl);
    fetchFeaturedItems(list).then(fetched => {
      if (fetched.length > 0) setItems(fetched);
    });
  }, [list.id]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
    >
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: list.color }]}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, styles.heroScrim]} />
        <View style={[styles.heroContent, { paddingTop: insets.top + 60 }]}>
          <View style={styles.heroCategoryRow}>
            <Ionicons name={list.icon as any} size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroCategory}>{list.category.toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>{list.title}</Text>
          <Text style={styles.heroAuthor}>By {list.author}</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionLabel}>HOW WE RANKED THIS</Text>
        <Text style={styles.description}>{list.description}</Text>
      </View>

      {/* Ranked list */}
      <View style={styles.listCard}>
        {items.slice(0, 10).map((item, i) => (
          <React.Fragment key={i}>
            <View style={styles.row}>
              <Text style={[styles.rank, i === 0 && styles.rankTop]}>{i + 1}</Text>
              <Text style={[styles.itemTitle, i === 0 && styles.itemTitleTop]} numberOfLines={2}>
                {item}
              </Text>
              {i === 0 && (
                <Ionicons name="trophy" size={14} color="#CC0000" style={styles.trophy} />
              )}
            </View>
            {i < Math.min(items.length, 10) - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    minHeight: 240,
    justifyContent: 'flex-end',
  },
  heroScrim: {
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  heroContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.xs,
  },
  heroCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  heroAuthor: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  descriptionCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.05,
  },
  descriptionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CC0000',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    color: colors.secondaryText,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  listCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.06,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    gap: spacing.md,
  },
  rank: {
    width: 22,
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textAlign: 'center',
  },
  rankTop: {
    color: '#CC0000',
    fontWeight: '800',
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
  },
  itemTitleTop: {
    fontWeight: '700',
  },
  trophy: {
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 22 + spacing.md,
  },
});
