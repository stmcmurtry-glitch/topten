import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';

const SECTIONS = [
  {
    icon: 'person-outline' as const,
    title: 'Your Content & Identity',
    body: 'You retain full ownership of everything you create in Top Ten. Your personal identifiers — such as your name or email — are never sold, rented, or traded to third parties under any circumstances.',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'Anonymous Data & Insights',
    body: 'To support the platform, we may aggregate anonymous ranking data to identify global trends. These anonymized insights may be shared with partners for market research purposes. They are strictly anonymized and cannot be traced back to any individual.',
  },
  {
    icon: 'cloud-outline' as const,
    title: 'Third-Party APIs',
    body: 'Top Ten communicates with third-party services such as TMDb and MusicBrainz to fetch content data. These services receive only specific search queries and never have access to your personal information.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Your Rights',
    body: 'You may request deletion of your data at any time by contacting us. Your request will be processed within a few business days.',
  },
];

export const PrivacyPolicyScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionGroupHeader}>Privacy Policy</Text>
      <Text style={styles.effectiveDate}>Effective February 2026</Text>

      <View style={styles.policyCard}>
        {SECTIONS.map((section, idx) => (
          <View
            key={section.title}
            style={[styles.policySection, idx < SECTIONS.length - 1 && styles.policySectionBorder]}
          >
            <View style={styles.policySectionHeader}>
              <View style={styles.iconBadge}>
                <Ionicons name={section.icon} size={16} color={colors.activeTab} />
              </View>
              <Text style={styles.policySectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.policySectionBody}>{section.body}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={() => Linking.openURL('https://sites.google.com/view/toptenapp-privacy/home')}
        activeOpacity={0.7}
      >
        <Text style={styles.footerLink}>View full privacy policy ↗</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Contact')}
        activeOpacity={0.7}
      >
        <Text style={styles.footerLink}>Questions? Get in touch ↗</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionGroupHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  effectiveDate: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: spacing.md,
  },
  policyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    ...shadow,
    shadowOpacity: 0.07,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  policySection: {
    padding: spacing.lg,
  },
  policySectionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  policySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(204,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  policySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  policySectionBody: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.activeTab,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
