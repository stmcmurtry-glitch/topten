import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../theme';

export const VOTE_PROMPT_COMMUNITY_KEY = '@topten_vote_prompt_community';
export const VOTE_PROMPT_LOCAL_KEY = '@topten_vote_prompt_local';

export const VotingPreferencesScreen: React.FC = () => {
  const [communityEnabled, setCommunityEnabled] = useState(true);
  const [localEnabled, setLocalEnabled] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(VOTE_PROMPT_COMMUNITY_KEY),
      AsyncStorage.getItem(VOTE_PROMPT_LOCAL_KEY),
    ]).then(([community, local]) => {
      if (community === 'disabled') setCommunityEnabled(false);
      if (local === 'disabled') setLocalEnabled(false);
    });
  }, []);

  const toggleCommunity = async (value: boolean) => {
    setCommunityEnabled(value);
    await AsyncStorage.setItem(VOTE_PROMPT_COMMUNITY_KEY, value ? 'enabled' : 'disabled');
  };

  const toggleLocal = async (value: boolean) => {
    setLocalEnabled(value);
    await AsyncStorage.setItem(VOTE_PROMPT_LOCAL_KEY, value ? 'enabled' : 'disabled');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        When you open a list for the first time, TopX can ask whether you want to vote before seeing how others ranked — helping you make a more unbiased pick.
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>TopX People's Choice</Text>
            <Text style={styles.description}>
              Show a prompt when opening TopX People's Choice lists, like "Best Movies of All Time."
            </Text>
          </View>
          <Switch
            value={communityEnabled}
            onValueChange={toggleCommunity}
            trackColor={{ false: colors.border, true: colors.activeTab }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>In Your Area Lists</Text>
            <Text style={styles.description}>
              Show a prompt when opening local lists tailored to your city, like "Best Brunch Spots near you."
            </Text>
          </View>
          <Switch
            value={localEnabled}
            onValueChange={toggleLocal}
            trackColor={{ false: colors.border, true: colors.activeTab }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  intro: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 16,
    color: colors.primaryText,
  },
  description: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
});
