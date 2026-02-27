import 'react-native-url-polyfill/auto';
import * as Sentry from '@sentry/react-native';
import React, { useState, useEffect } from 'react';
import Purchases from 'react-native-purchases';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import * as Crypto from 'expo-crypto';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  enabled: !__DEV__,  // only capture crashes in production builds
});
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListProvider } from './src/data/ListContext';
import { CommunityProvider } from './src/context/CommunityContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

const ONBOARDED_KEY = '@topten_onboarded';
const USER_ID_KEY = '@topten_user_id';

// Identifies the anonymous device ID to PostHog once the provider is mounted
function PostHogIdentifier() {
  const posthog = usePostHog();
  useEffect(() => {
    AsyncStorage.getItem(USER_ID_KEY).then((id) => {
      if (id) {
        posthog?.identify(id);
      }
    });
  }, []);
  return null;
}

export default function App() {
  // undefined = still checking, false = show onboarding, true = go to app
  const [onboarded, setOnboarded] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    try {
      const rcKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
      if (rcKey) Purchases.configure({ apiKey: rcKey });
    } catch (e) {
      // RevenueCat unavailable in Expo Go — no-op
    }

    // Generate a stable anonymous user ID on first launch
    const initUser = async () => {
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = Crypto.randomUUID();
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }
    };

    initUser();
    AsyncStorage.getItem(ONBOARDED_KEY).then((val) => {
      setOnboarded(val === 'true');
    });
  }, []);

  const handleOnboardingDone = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    setOnboarded(true);
  };

  // Still checking storage — render nothing to avoid flash
  if (onboarded === undefined) return null;

  if (!onboarded) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <OnboardingScreen onDone={handleOnboardingDone} />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY ?? ''}
      options={{ host: 'https://us.i.posthog.com' }}
    >
      <PostHogIdentifier />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ListProvider>
            <CommunityProvider>
              <NavigationContainer>
                <TabNavigator />
                <StatusBar style="auto" />
              </NavigationContainer>
            </CommunityProvider>
          </ListProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}
