import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, shadow } from '../theme';

const STORAGE_KEY = '@topten_notification_prefs';

const TOGGLES = [
  {
    key: 'activity',
    label: 'Activity & Social',
    sub: 'Likes, clones, and friend updates',
  },
  {
    key: 'discovery',
    label: 'Discovery & Trends',
    sub: 'New community lists and trending topics',
  },
  {
    key: 'account',
    label: 'Account & Updates',
    sub: 'Security alerts and app announcements',
  },
];

type Prefs = Record<string, boolean>;

export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState<Prefs>({ activity: true, discovery: true, account: true });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setPrefs(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const toggle = (key: string, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.description}>
        Choose how you'd like to stay informed. You can change these at any time.
      </Text>

      <View style={styles.card}>
        {TOGGLES.map((item, idx) => (
          <View
            key={item.key}
            style={[styles.row, idx < TOGGLES.length - 1 && styles.rowBorder]}
          >
            <View style={styles.labelGroup}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.sub}>{item.sub}</Text>
            </View>
            <Switch
              value={prefs[item.key] ?? true}
              onValueChange={(v) => toggle(item.key, v)}
              trackColor={{ false: colors.border, true: '#CC0000' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
            />
          </View>
        ))}
      </View>
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
  description: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    ...shadow,
    shadowOpacity: 0.07,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.lg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  labelGroup: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primaryText,
  },
  sub: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
  },
});
