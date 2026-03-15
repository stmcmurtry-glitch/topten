import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases from 'react-native-purchases';

const DEV_OVERRIDE_KEY = '@dev_premium_override';

/** Returns true if the user has an active Premium entitlement.
 *  In __DEV__ mode, an AsyncStorage override takes priority (used for Expo Go testing). */
export async function getIsPremium(): Promise<boolean> {
  if (__DEV__) {
    try {
      const raw = await AsyncStorage.getItem(DEV_OVERRIDE_KEY);
      if (raw !== null) return raw === 'true';
    } catch {}
  }
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active['premium'];
  } catch {
    return false;
  }
}

/** Dev-only: set or clear the premium override. */
export async function setDevPremiumOverride(enabled: boolean | null): Promise<void> {
  if (enabled === null) {
    await AsyncStorage.removeItem(DEV_OVERRIDE_KEY);
  } else {
    await AsyncStorage.setItem(DEV_OVERRIDE_KEY, enabled ? 'true' : 'false');
  }
}

/** Dev-only: read the current override state (null = not set). */
export async function getDevPremiumOverride(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(DEV_OVERRIDE_KEY);
    if (raw === null) return null;
    return raw === 'true';
  } catch {
    return null;
  }
}
