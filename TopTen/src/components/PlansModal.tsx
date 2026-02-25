import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface Feature {
  label: string;
  included: boolean;
}

interface Tier {
  id: string;
  name: string;
  price: string;
  priceDetail: string;
  accentColor: string;
  dark?: boolean;
  features: Feature[];
  note?: string;
}

const TIERS: Tier[] = [
  {
    id: 'basic',
    name: 'Free',
    price: 'Free',
    priceDetail: 'forever',
    accentColor: colors.secondaryText,
    features: [
      { label: 'Up to 100 lists', included: true },
      { label: 'Community rankings & voting', included: true },
      { label: 'Discover featured lists', included: true },
      { label: 'Unlimited lists', included: false },
      { label: 'Unlimited search (movies, TV, books)', included: false },
      { label: 'No ads', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$2.49',
    priceDetail: 'per month',
    accentColor: '#CC0000',
    dark: true,
    note: 'Or $9.99 / year — save 33%',
    features: [
      { label: 'Unlimited lists', included: true },
      { label: 'Community rankings & voting', included: true },
      { label: 'Discover featured lists', included: true },
      { label: 'Unlimited search (movies, TV, books)', included: true },
      { label: 'No ads', included: true },
    ],
  },
];

interface PlansModalProps {
  visible: boolean;
  currentTier: string;
  onClose: () => void;
}

const TierCard: React.FC<{ tier: Tier; isCurrent: boolean }> = ({ tier, isCurrent }) => {
  const textColor = tier.dark ? '#FFFFFF' : colors.primaryText;
  const subColor = tier.dark ? 'rgba(255,255,255,0.6)' : colors.secondaryText;

  const handleUpgrade = () => {
    Alert.alert(
      `Upgrade to ${tier.name}`,
      'In-app purchases are coming soon. Stay tuned!',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.tierCard, tier.dark && styles.tierCardDark]}>
      {/* Accent top bar */}
      <View style={[styles.tierAccent, { backgroundColor: tier.accentColor }]} />

      <View style={styles.tierBody}>
        {/* Header row */}
        <View style={styles.tierHeader}>
          <View style={styles.tierNameRow}>
            <Text style={[styles.tierName, { color: textColor }]}>{tier.name}</Text>
            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
          <View style={styles.tierPriceBlock}>
            <Text style={[styles.tierPrice, { color: tier.accentColor }]}>{tier.price}</Text>
            <Text style={[styles.tierPriceDetail, { color: subColor }]}>{tier.priceDetail}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.tierDivider, { backgroundColor: tier.dark ? 'rgba(255,255,255,0.12)' : colors.border }]} />

        {/* Feature list */}
        <View style={styles.featureList}>
          {tier.features.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Ionicons
                name={f.included ? 'checkmark-circle' : 'remove-circle-outline'}
                size={18}
                color={f.included ? '#34C759' : (tier.dark ? 'rgba(255,255,255,0.25)' : colors.border)}
              />
              <Text
                style={[
                  styles.featureLabel,
                  { color: f.included ? textColor : subColor },
                  !f.included && styles.featureLabelDimmed,
                ]}
              >
                {f.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Note */}
        {tier.note && (
          <Text style={[styles.tierNote, { color: subColor }]}>* {tier.note}</Text>
        )}

        {/* CTA */}
        {isCurrent ? (
          <View style={styles.currentPlanButton}>
            <Text style={[styles.currentPlanText, { color: subColor }]}>Your current plan</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: tier.accentColor }]}
            onPress={handleUpgrade}
            activeOpacity={0.85}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const PlansModal: React.FC<PlansModalProps> = ({ visible, currentTier, onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Handle + close */}
        <View style={styles.sheetHeader}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sheetTitle}>Upgrade to Premium</Text>
        <Text style={styles.sheetSub}>Unlock unlimited lists, full search, and an ad-free experience.</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} isCurrent={tier.id === currentTier} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.md + 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.5,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  sheetSub: {
    fontSize: 14,
    color: colors.secondaryText,
    marginHorizontal: spacing.lg,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  /* ── Tier Card ── */
  tierCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.07,
  },
  tierCardDark: {
    backgroundColor: '#1C1C1E',
    borderColor: '#3A3A3C',
  },
  tierAccent: {
    height: 4,
  },
  tierBody: {
    padding: spacing.lg,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tierName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  currentBadge: {
    backgroundColor: '#34C759',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  tierPriceBlock: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tierPriceDetail: {
    fontSize: 12,
    marginTop: 1,
  },
  tierDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  featureList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  featureLabelDimmed: {
    opacity: 0.5,
  },
  tierNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  upgradeButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  currentPlanButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentPlanText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
