import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchLocalPlacesLists } from '../services/googlePlacesService';
import { registerDynamicLists } from '../data/dynamicListRegistry';
import { colors, spacing } from '../theme';

/**
 * Thin loading screen — fetches Google Places lists for `city`, registers
 * them, then replaces itself with AllLocalListsScreen so the user gets the
 * exact same "In Your Area" experience (category pills, status filter,
 * priority sorting, voting) as their home city.
 */
export const CityListsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { city } = route.params as { city: string };

  useEffect(() => {
    fetchLocalPlacesLists(city).then(lists => {
      if (lists.length > 0) registerDynamicLists(lists);
      navigation.replace('AllLocalLists', { lists, city });
    });
  }, [city]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.activeTab} />
      <Text style={styles.text}>Finding lists in {city}…</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  text: {
    fontSize: 15,
    color: colors.secondaryText,
  },
});
