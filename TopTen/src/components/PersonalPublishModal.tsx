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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius } from '../theme';
import { CATEGORY_COLORS } from './FeedRow';
import { PublishableList } from './PublishModal';

const CAPTION_LIMIT = 140;

interface Props {
  visible: boolean;
  onClose: () => void;
  list: PublishableList;
  onPublished: (postId: string) => void;
}

export const PersonalPublishModal: React.FC<Props> = ({ visible, onClose, list, onPublished }) => {
  const insets = useSafeAreaInsets();
  const { user, userProfile } = useAuth();
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);

  const categoryColor = CATEGORY_COLORS[list.category] ?? '#CC0000';
  const previewItems = list.items.slice(0, 5).map(i => i.title).filter(Boolean);

  useEffect(() => {
    if (!visible) return;
    setCaption('');
  }, [visible]);

  const handlePublish = async () => {
    if (!supabase || !user) return;
    setPublishing(true);
    try {
      const { data, error } = await supabase.from('community_feed_posts').insert({
        user_id: user.id,
        list_id: list.id,
        city_slug: null,
        city_name: null,
        title: list.title,
        category: list.category,
        blurb: caption.trim() || null,
        items: previewItems,
        cover_image_uri: list.coverImageUri ?? null,
        username: userProfile?.username ?? null,
        avatar_url: userProfile?.avatar_url ?? null,
      }).select('id');
      if (error) throw error;
      onPublished(data?.[0]?.id ?? '');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not post. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.iconWrap}>
                <Ionicons name="person-circle-outline" size={28} color={categoryColor} />
              </View>
              <Text style={styles.title}>Post to My Feed</Text>
              <Text style={styles.subtitle}>Share this list on your profile and with your followers.</Text>

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

              {/* Caption */}
              <Text style={styles.captionLabel}>Caption (optional)</Text>
              <TextInput
                style={styles.captionInput}
                value={caption}
                onChangeText={t => setCaption(t.slice(0, CAPTION_LIMIT))}
                placeholder="Add a note about your list…"
                placeholderTextColor={colors.secondaryText}
                multiline
                maxLength={CAPTION_LIMIT}
              />
              <Text style={styles.charCount}>{caption.length}/{CAPTION_LIMIT}</Text>

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
                  : <Text style={styles.ctaText}>Post to My Feed</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
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
  captionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    marginBottom: spacing.xs,
  },
  captionInput: {
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
