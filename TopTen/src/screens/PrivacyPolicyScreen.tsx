import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';

const DATA_CONTRIBUTION_KEY = '@topten_data_contribution';

const SECTIONS = [
  {
    icon: 'person-outline' as const,
    title: 'Your Content & Identity',
    body: 'You retain full ownership of everything you create in Top Ten. Your personal identifiers — such as your name or email — are never sold, rented, or traded to third parties under any circumstances.',
  },
  {
    icon: 'bar-chart-outline' as const,
    title: 'Anonymous Data & Insights',
    body: 'To support the platform, we may aggregate anonymous ranking data to identify global trends. These anonymized insights may be shared with partners for market research purposes. They are strictly anonymized and cannot be traced back to any individual account.',
  },
  {
    icon: 'cloud-outline' as const,
    title: 'Third-Party APIs',
    body: 'Top Ten communicates with third-party services such as TMDb and Edamam to fetch movie and food data. These services receive only specific search queries. They never have access to your personal Top Ten account information.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Your Rights',
    body: 'You may request deletion of your account data at any time by contacting us. You can opt out of anonymous data aggregation using the toggle above. Your choices take effect immediately.',
  },
];

export const PrivacyPolicyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [dataContribution, setDataContribution] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(DATA_CONTRIBUTION_KEY).then((raw) => {
      if (raw !== null) setDataContribution(JSON.parse(raw));
    });
  }, []);

  const toggleContribution = (value: boolean) => {
    setDataContribution(value);
    AsyncStorage.setItem(DATA_CONTRIBUTION_KEY, JSON.stringify(value));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Data Contribution toggle — prominent, actionable */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleCardHeader}>
          <Ionicons name="analytics-outline" size={20} color={colors.activeTab} />
          <Text style={styles.toggleCardTitle}>Data Contribution</Text>
        </View>
        <Text style={styles.toggleCardBody}>
          Allow Top Ten to include your anonymous ranking data in aggregated trend reports shared with research partners. Your identity is never exposed.
        </Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            {dataContribution ? 'Contributing anonymously' : 'Opted out'}
          </Text>
          <Switch
            value={dataContribution}
            onValueChange={toggleContribution}
            trackColor={{ false: colors.border, true: '#CC0000' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>

      {/* Policy sections */}
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

      <Text style={styles.footer}>
        Questions? Contact us at stmcmurtry@gmail.com
      </Text>
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

  /* ── Data Contribution toggle ── */
  toggleCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.lg,
    ...shadow,
    shadowOpacity: 0.07,
    marginBottom: spacing.xl,
  },
  toggleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggleCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  toggleCardBody: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
  },

  /* ── Policy sections ── */
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

  /* ── Footer ── */
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.activeTab,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  footer: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
