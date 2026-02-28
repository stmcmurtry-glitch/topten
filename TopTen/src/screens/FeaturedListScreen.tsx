import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FEATURED_LISTS } from '../data/featuredLists';
import { fetchFeaturedItems, fetchFeaturedImage } from '../services/featuredContentService';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { ShareModal } from '../components/ShareModal';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { usePostHog } from 'posthog-react-native';

export const FeaturedListScreen: React.FC<{ route: any; navigation: any }> = ({ route }) => {
  const { featuredId } = route.params as { featuredId: string };
  const list = FEATURED_LISTS.find(l => l.id === featuredId)!;
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>(list.previewItems);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (list.staticImageUrl) {
      setImageUrl(list.staticImageUrl);
    } else {
      fetchFeaturedImage(list).then(setImageUrl);
    }
    fetchFeaturedItems(list).then(fetched => {
      if (fetched.length > 0) setItems(fetched);
    });
  }, [list.id]);

  return (
    <>
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
        <Text style={[styles.descriptionLabel, { color: list.color }]}>HOW WE RANKED THIS</Text>
        <Text style={styles.description}>{list.description}</Text>
      </View>

      {/* Ranked list */}
      <View style={styles.listCard}>
        {list.sponsored && (
          <>
            <TouchableOpacity
              style={styles.sponsoredRow}
              onPress={() => {
                posthog?.capture('sponsored_tap', {
                  list_id: featuredId,
                  sponsor_name: list.sponsored!.name,
                  city: null,
                });
                Linking.openURL(list.sponsored!.url);
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.sponsoredLabel}>SPONSORED</Text>
              <View style={styles.sponsoredContent}>
                <Text style={styles.sponsoredName}>{list.sponsored.name}</Text>
                <Text style={[styles.sponsoredCta, { color: list.color }]}>{list.sponsored.cta}</Text>
                <Ionicons name="open-outline" size={20} color={list.color} />
              </View>
            </TouchableOpacity>
            <View style={styles.divider} />
          </>
        )}
        {items.slice(0, 10).map((item, i) => (
          <React.Fragment key={i}>
            <View style={styles.row}>
              <Text style={[styles.rank, i === 0 && styles.rankTop, i === 0 && { color: list.color }]}>{i + 1}</Text>
              <Text style={[styles.itemTitle, i === 0 && styles.itemTitleTop]} numberOfLines={2}>
                {item}
              </Text>
              {i === 0 && (
                <Ionicons name="trophy" size={14} color={list.color} style={styles.trophy} />
              )}
            </View>
            {i < Math.min(items.length, 10) - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Share button */}
      <TouchableOpacity
        style={[styles.shareButton, { backgroundColor: list.color }]}
        onPress={() => setShowShareModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="share-outline" size={18} color="#FFF" />
        <Text style={styles.shareButtonText}>Share This List</Text>
      </TouchableOpacity>

      {/* Report issue */}
      <TouchableOpacity
        style={styles.reportButton}
        onPress={() => setShowReportModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="flag-outline" size={13} color={colors.secondaryText} />
        <Text style={styles.reportButtonText}>Report an issue</Text>
      </TouchableOpacity>
    </ScrollView>

    <ShareModal
      visible={showShareModal}
      onClose={() => setShowShareModal(false)}
      title={list.title}
      category={list.category}
      items={items}
    />
    <ReportIssueModal
      visible={showReportModal}
      onClose={() => setShowReportModal(false)}
      listTitle={list.title}
      listType="Featured"
    />
    </>
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
  sponsoredRow: {
    flexDirection: 'column',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 5,
    backgroundColor: 'rgba(255,200,0,0.06)',
  },
  sponsoredLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 1,
  },
  sponsoredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sponsoredName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  sponsoredCta: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  }, // backgroundColor applied inline via list.color
  shareButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  reportButtonText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
});
