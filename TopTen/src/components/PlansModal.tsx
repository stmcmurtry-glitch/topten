import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { colors, spacing, borderRadius, shadow } from '../theme';

const PREMIUM_FEATURES = [
  'Unlimited lists',
  'Unlimited custom cover photos',
  'No ads',
];

const BASIC_FEATURES = [
  'Community rankings & voting',
  'Discover featured lists',
  'Build up to 100 lists free',
];

interface PlansModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PlansModal: React.FC<PlansModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    Promise.all([
      Purchases.getOfferings(),
      Purchases.getCustomerInfo(),
    ]).then(([offerings, info]) => {
      const pkgs = offerings.current?.availablePackages ?? [];
      setMonthlyPkg(
        pkgs.find(p => p.identifier === '$rc_monthly') ??
        pkgs.find(p => p.packageType === 'MONTHLY') ??
        pkgs.find(p => p.product.identifier.includes('monthly')) ??
        null
      );
      setAnnualPkg(
        pkgs.find(p => p.identifier === '$rc_annual') ??
        pkgs.find(p => p.packageType === 'ANNUAL') ??
        pkgs.find(p => p.product.identifier.includes('annual')) ??
        null
      );
      setIsPremium(!!info.entitlements.active['premium']);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [visible]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['premium']) {
        setIsPremium(true);
        Alert.alert('Welcome to Premium!', 'Your subscription is now active.');
        onClose();
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active['premium']) {
        setIsPremium(true);
        Alert.alert('Restored!', 'Your Premium subscription has been restored.');
        onClose();
      } else {
        Alert.alert('Nothing to restore', 'No active Premium subscription found.');
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const monthlyPrice = monthlyPkg?.product.priceString ?? '$2.49';
  const annualPrice = annualPkg?.product.priceString ?? '$9.99';
  const selectedPkg = selectedPlan === 'annual' ? annualPkg : monthlyPkg;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Close */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={20} color={colors.secondaryText} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="star" size={32} color={colors.activeTab} />
            </View>
            <Text style={styles.heroTitle}>TopTen Premium</Text>
            <Text style={styles.heroSub}>
              {isPremium
                ? 'You\'re all set. Thanks for supporting TopTen.'
                : 'Unlock everything. No limits, no ads.'}
            </Text>
          </View>

          {/* Plan toggle — only show if not premium */}
          {!isPremium && (
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleOption, selectedPlan === 'monthly' && styles.toggleOptionActive]}
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleLabel, selectedPlan === 'monthly' && styles.toggleLabelActive]}>
                  Monthly
                </Text>
                <Text style={[styles.togglePrice, selectedPlan === 'monthly' && styles.togglePriceActive]}>
                  {monthlyPrice}/mo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, selectedPlan === 'annual' && styles.toggleOptionActive]}
                onPress={() => setSelectedPlan('annual')}
                activeOpacity={0.8}
              >
                <View style={styles.toggleLabelRow}>
                  <Text style={[styles.toggleLabel, selectedPlan === 'annual' && styles.toggleLabelActive]}>
                    Annual
                  </Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Save 33%</Text>
                  </View>
                </View>
                <Text style={[styles.togglePrice, selectedPlan === 'annual' && styles.togglePriceActive]}>
                  {annualPrice}/yr
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Feature list */}
          <View style={styles.featureCard}>
            {/* Premium features */}
            {PREMIUM_FEATURES.map((label, i) => (
              <React.Fragment key={label}>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  <View style={styles.featureText}>
                    <Text style={styles.featureLabel}>{label}</Text>
                    <Text style={styles.featurePremiumTag}>Premium</Text>
                  </View>
                </View>
                {i < PREMIUM_FEATURES.length - 1 && <View style={styles.featureDivider} />}
              </React.Fragment>
            ))}

            {/* Basic section divider */}
            <View style={styles.basicDivider}>
              <Text style={styles.basicDividerLabel}>INCLUDED IN BASIC</Text>
            </View>

            {/* Basic features */}
            {BASIC_FEATURES.map((label, i) => (
              <React.Fragment key={label}>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.secondaryText} />
                  <Text style={styles.featureLabel}>{label}</Text>
                </View>
                {i < BASIC_FEATURES.length - 1 && <View style={styles.featureDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* CTA */}
          {isPremium ? (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
              <Text style={styles.activeBadgeText}>Premium Active</Text>
            </View>
          ) : loading ? (
            <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xl }} />
          ) : (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => selectedPkg && handlePurchase(selectedPkg)}
              activeOpacity={0.88}
              disabled={purchasing || !selectedPkg}
            >
              {purchasing
                ? <ActivityIndicator color="#FFF" />
                : (
                  <Text style={styles.ctaText}>
                    {selectedPlan === 'annual'
                      ? `Start for ${annualPrice} / year`
                      : `Start for ${monthlyPrice} / month`}
                  </Text>
                )
              }
            </TouchableOpacity>
          )}

          <Text style={styles.legalText}>
            Subscription auto-renews. Cancel anytime in App Store settings.
          </Text>
        </ScrollView>

        {/* Restore */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore} disabled={restoring}>
          {restoring
            ? <ActivityIndicator color={colors.secondaryText} size="small" />
            : <Text style={styles.restoreText}>Restore Purchases</Text>
          }
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.08,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },

  /* ── Hero ── */
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(204,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryText,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: spacing.md,
  },

  /* ── Plan toggle ── */
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: 4,
    marginBottom: spacing.lg,
    ...shadow,
    shadowOpacity: 0.06,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    gap: 2,
  },
  toggleOptionActive: {
    backgroundColor: '#000000',
  },
  toggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  toggleLabelActive: {
    color: '#FFF',
  },
  togglePrice: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.secondaryText,
  },
  togglePriceActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  saveBadge: {
    backgroundColor: '#34C759',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },

  /* ── Feature list ── */
  featureCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    ...shadow,
    shadowOpacity: 0.06,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    gap: spacing.md,
  },
  featureDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 20 + spacing.md,
  },
  basicDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  basicDividerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.5,
  },
  featureText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
  },
  featurePremiumTag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.activeTab,
    backgroundColor: 'rgba(204,0,0,0.08)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  /* ── CTA ── */
  ctaButton: {
    backgroundColor: '#000000',
    borderRadius: borderRadius.squircle,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(52,199,89,0.1)',
    borderRadius: borderRadius.squircle,
    marginBottom: spacing.md,
  },
  activeBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#34C759',
  },
  legalText: {
    fontSize: 11,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.sm,
  },

  /* ── Restore ── */
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  restoreText: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '500',
  },
});
