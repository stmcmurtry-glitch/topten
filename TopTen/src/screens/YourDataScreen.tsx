import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadow } from '../theme';

const SECTIONS = [
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Your lists stay on your device',
    body: "Everything you create in Top Ten — your lists, rankings, and edits — is stored locally on your device. We don't upload it, we can't read it, and we don't back it up to any server. It's yours.",
  },
  {
    icon: 'people-outline' as const,
    title: 'Community rankings are anonymous',
    body: 'When you submit a community ranking, we record an anonymous device ID and your submitted choices. There is no name, email, or account linked to it. We use this only to calculate aggregate scores shown to all users.',
  },
  {
    icon: 'ban-outline' as const,
    title: "We don't sell your data",
    body: "We don't sell, rent, or share personal information with advertisers or data brokers. Third-party services we use (like movie and music databases) receive only the search query you typed — nothing else.",
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: "You're in control",
    body: 'You can request removal of your community ranking data at any time. Send us a message using the button below and we\'ll take care of it within a few business days.',
  },
];

export const YourDataScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl * 2 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Here's a plain-English summary of how Top Ten handles your data.
      </Text>

      <View style={styles.card}>
        {SECTIONS.map((section, idx) => (
          <View
            key={section.title}
            style={[styles.section, idx < SECTIONS.length - 1 && styles.sectionBorder]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.iconBadge}>
                <Ionicons name={section.icon} size={16} color={colors.activeTab} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.removalLabel}>Data Removal</Text>
      <View style={styles.removalCard}>
        <TouchableOpacity
          style={styles.removalRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Contact', { subject: 'Data Removal Request' })}
        >
          <Text style={styles.removalRowText}>Contact Us to Remove My Data</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        We'll confirm by email and remove any stored community data within a few business days.
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
  intro: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    ...shadow,
    shadowOpacity: 0.07,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  section: {
    padding: spacing.lg,
  },
  sectionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
    flex: 1,
  },
  sectionBody: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 20,
  },
  removalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
    marginTop: spacing.xl,
  },
  removalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
    marginBottom: spacing.lg,
  },
  removalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  removalRowText: {
    fontSize: 16,
    color: colors.primaryText,
  },
  footer: {
    fontSize: 12,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
