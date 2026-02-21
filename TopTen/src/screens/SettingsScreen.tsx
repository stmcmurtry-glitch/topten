import React from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

const sections = [
  {
    title: 'App',
    data: [
      { label: 'Version', value: '1.0.0' },
      { label: 'Theme', value: 'System' },
    ],
  },
  {
    title: 'About',
    data: [
      { label: 'Developer', value: 'Top Ten Team' },
      { label: 'Built with', value: 'Expo + React Native' },
    ],
  },
];

export const SettingsScreen: React.FC = () => {
  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item.label}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      )}
      contentContainerStyle={styles.content}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 16,
    color: colors.primaryText,
  },
  value: {
    fontSize: 16,
    color: colors.secondaryText,
  },
});
