import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

const ROWS = [
  { label: 'Version',     value: '1.0.0' },
  { label: 'Theme',       value: 'System' },
  { label: 'Developer',   value: 'Top Ten Team' },
  { label: 'Built with',  value: 'Expo + React Native' },
];

export const AboutScreen: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.card}>
      {ROWS.map((row, i) => (
        <View
          key={row.label}
          style={[styles.row, i < ROWS.length - 1 && styles.rowBorder]}
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowBorder: {
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
