import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIsPremium } from '../services/premiumService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { getDetectedLocation } from '../services/locationService';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { CATEGORY_COLORS } from './FeedRow';
import { PlansModal } from './PlansModal';

const BLURB_LIMIT = 140;

function slugify(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export interface PublishableList {
  id: string;
  title: string;
  category: string;
  items: Array<{ title: string }>;   // pre-sorted, top items first
  coverImageUri?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  list: PublishableList;
}

export const PublishModal: React.FC<Props> = ({ visible, onClose, list }) => {
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [checking, setChecking] = useState(true);
  const [blurb, setBlurb] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [city, setCity] = useState<{ name: string; slug: string } | null>(null);

  const categoryColor = CATEGORY_COLORS[list.category] ?? '#CC0000';
  const previewItems = list.items
    .slice(0, 5)
    .map((i) => i.title)
    .filter(Boolean);

  useEffect(() => {
    if (!visible) return;
    setChecking(true);
    setBlurb('');

    Promise.all([
      getIsPremium(),
      getDetectedLocation(),
    ]).then(([premium, loc]) => {
      setIsPremium(premium);
      if (loc?.city) {
        setCity({ name: loc.city, slug: slugify(loc.city) });
      }
      setChecking(false);
    });
  }, [visible]);

  const handlePublish = async () => {
    if (!supabase || !user || !city) return;
    setPublishing(true);
    try {
      const { error } = await supabase.from('community_feed_posts').insert({
        user_id: user.id,
        list_id: list.id,
        city_slug: city.slug,
        city_name: city.name,
        title: list.title,
        category: list.category,
        blurb: blurb.trim() || null,
        items: previewItems,
        cover_image_uri: list.coverImageUri ?? null,
        username: userProfile?.username ?? user.email?.split('@')[0] ?? null,
        avatar_url: userProfile?.avatar_url ?? null,
      });
      if (error) throw error;
      Alert.alert('Posted!', `Your list is now live in the ${city.name} feed.`);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.overlay} onPress={onClose}>
            <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.handle} />

              {checking ? (
                <ActivityIndicator color={colors.activeTab} style={{ marginVertical: spacing.xl }} />
              ) : !isPremium ? (
                /* ── Upsell state ── */
                <>
                  <View style={styles.iconWrap}>
                    <Ionicons name="megaphone-outline" size={28} color={colors.activeTab} />
                  </View>
                  <Text style={styles.title}>Local Feed</Text>
                  <Text style={styles.subtitle}>
                    Share your lists with your city — available to TopX Premium members.
                  </Text>
                  <TouchableOpacity
                    style={[styles.ctaButton, { backgroundColor: colors.activeTab }]}
                    onPress={() => { onClose(); setTimeout(() => setShowPlans(true), 300); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.ctaText}>Upgrade to Premium</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelText}>Not now</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ── Publish form ── */
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                  <View style={styles.iconWrap}>
                    <Ionicons name="megaphone-outline" size={28} color={categoryColor} />
                  </View>
                  <Text style={styles.title}>Post to Local Feed</Text>
                  {city && (
                    <View style={styles.cityPill}>
                      <Ionicons name="location-sharp" size={12} color={colors.activeTab} />
                      <Text style={styles.cityPillText}>{city.name}</Text>
                    </View>
                  )}

                  {/* List preview */}
                  <View style={styles.previewCard}>
                    <Text style={styles.previewTitle} numberOfLines={1}>{list.title}</Text>
                    {previewItems.map((item, i) => (
                      <Text key={i} style={styles.previewItem} numberOfLines={1}>
                        {i + 1}. {item}
                      </Text>
                    ))}
                    {previewItems.length === 0 && (
                      <Text style={styles.previewEmpty}>No items yet — add some before posting.</Text>
                    )}
                  </View>

                  {/* Blurb */}
                  <Text style={styles.blurbLabel}>Caption (optional)</Text>
                  <TextInput
                    style={styles.blurbInput}
                    value={blurb}
                    onChangeText={(t) => setBlurb(t.slice(0, BLURB_LIMIT))}
                    placeholder="Add a note about your list…"
                    placeholderTextColor={colors.secondaryText}
                    multiline
                    maxLength={BLURB_LIMIT}
                  />
                  <Text style={styles.charCount}>{blurb.length}/{BLURB_LIMIT}</Text>

                  <TouchableOpacity
                    style={[
                      styles.ctaButton,
                      { backgroundColor: categoryColor },
                      (publishing || previewItems.length === 0) && styles.ctaDisabled,
                    ]}
                    onPress={handlePublish}
                    disabled={publishing || previewItems.length === 0}
                    activeOpacity={0.85}
                  >
                    {publishing
                      ? <ActivityIndicator color="#FFF" />
                      : <Text style={styles.ctaText}>
                          {city ? `Post to ${city.name} Feed` : 'Post to Local Feed'}
                        </Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <PlansModal visible={showPlans} onClose={() => setShowPlans(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(204,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.lg,
  },
  cityPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.activeTab,
  },
  previewCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 3,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  previewItem: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  previewEmpty: {
    fontSize: 13,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  blurbLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  blurbInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 15,
    color: colors.primaryText,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: spacing.xs,
  },
  charCount: {
    fontSize: 11,
    color: colors.secondaryText,
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  ctaButton: {
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  cancelText: {
    fontSize: 15,
    color: colors.secondaryText,
  },
});
