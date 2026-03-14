import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { ShareCard, CARD_WIDTH } from './ShareCard';
import { colors, spacing, borderRadius } from '../theme';

const APP_STORE_URL = 'https://apps.apple.com/us/app/topten-your-ranked-lists/id6759584244';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  category: string;
  items: string[];
}

export const ShareModal: React.FC<Props> = ({ visible, onClose, title, category, items }) => {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    // Copy App Store link to clipboard so user can paste it as an Instagram link sticker
    Clipboard.setString(APP_STORE_URL);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        pixelRatio: 2,
      } as any);
      await Share.share({
        message: `Check out my Top X ${title}!\n\nDownload TopX on the App Store: ${APP_STORE_URL}`,
        url: uri,
      });
    } catch {
      Alert.alert('Could not share', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(APP_STORE_URL);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <ShareCard ref={cardRef} title={title} category={category} items={items} />

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.85}
          >
            {sharing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#FFF" />
                <Text style={styles.shareButtonText}>Share</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.copyLinkButton} onPress={handleCopyLink} activeOpacity={0.7}>
            <Ionicons name={linkCopied ? 'checkmark' : 'link-outline'} size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.copyLinkText}>
              {linkCopied ? 'App Store link copied!' : 'Copy App Store link for Instagram'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    width: CARD_WIDTH,
    alignItems: 'center',
    gap: spacing.lg,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#CC0000',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  copyLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  copyLinkText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  cancel: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
  },
});
