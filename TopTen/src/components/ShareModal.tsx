import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { ShareCard, CARD_WIDTH } from './ShareCard';
import { colors, spacing, borderRadius } from '../theme';

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

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        pixelRatio: 2,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Top Ten list',
      });
    } catch {
      Alert.alert('Could not share', 'Please try again.');
    } finally {
      setSharing(false);
    }
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
  cancel: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
  },
});
