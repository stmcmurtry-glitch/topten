import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();

export interface ProfileData {
  username?: string;
  date_of_birth?: string;
  gender?: string;
  favorite_categories?: string[];
  location_city?: string;
  location_region?: string;
}

export interface UserProfile {
  username?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  favorite_categories?: string[] | null;
  location_city?: string | null;
  location_region?: string | null;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsOnboarding: boolean;
  profileChecked: boolean;
  error: string | null;
  signInWithEmail: (emailOrUsername: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateProfile: (data: ProfileData) => Promise<string | null>;
  updateAvatar: (uri: string | null) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const fetchProfileData = async (userId: string): Promise<{ needsOnboarding: boolean; profile: UserProfile }> => {
  if (!supabase) return { needsOnboarding: false, profile: {} };
  const { data } = await supabase
    .from('user_profiles')
    .select('has_completed_onboarding, username, date_of_birth, gender, favorite_categories, location_city, location_region, avatar_url')
    .eq('id', userId)
    .single();
  return {
    needsOnboarding: !data?.has_completed_onboarding,
    profile: {
      username: data?.username ?? null,
      date_of_birth: data?.date_of_birth ?? null,
      gender: data?.gender ?? null,
      favorite_categories: data?.favorite_categories ?? null,
      location_city: data?.location_city ?? null,
      location_region: data?.location_region ?? null,
      avatar_url: data?.avatar_url ?? null,
    },
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setProfileChecked(true);
      return;
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { needsOnboarding: needs, profile } = await fetchProfileData(u.id);
        setNeedsOnboarding(needs);
        setUserProfile(profile);
      }
      setLoading(false);
      setProfileChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) {
        setProfileChecked(false);
        const { needsOnboarding: needs, profile } = await fetchProfileData(u.id);
        setNeedsOnboarding(needs);
        setUserProfile(profile);
        setProfileChecked(true);
      } else {
        setUserProfile(null);
        setNeedsOnboarding(false);
        setProfileChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (emailOrUsername: string, password: string) => {
    if (!supabase) { setError('Auth not configured'); return; }
    setError(null);

    let email = emailOrUsername.trim();

    // If no @ symbol, treat as username — look up email
    if (!email.includes('@')) {
      const { data, error: lookupErr } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('username', email.toLowerCase())
        .single();
      if (lookupErr || !data?.email) {
        setError('Username not found.');
        return;
      }
      email = data.email;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    if (!supabase) { setError('Auth not configured'); return; }
    setError(null);

    // Check username availability
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (existing) {
      setError('That username is already taken. Please choose another.');
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) { setError(err.message); return; }

    // Save username + email to profile right after signup
    if (data.user) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        username: username.toLowerCase(),
        email,
      });
      setUserProfile({ username: username.toLowerCase() });
    }
  };

  const signInWithApple = async () => {
    if (!supabase) { setError('Auth not configured'); return; }
    setError(null);
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setError('Apple Sign In failed — no identity token returned.');
        return;
      }
      const { error: err } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (err) setError(err.message);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        setError(e?.message ?? 'Apple Sign In failed');
      }
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase || !SUPABASE_URL) { setError('Auth not configured'); return; }
    setError(null);
    try {
      const redirectTo = 'topten://auth/callback';
      const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (result.type === 'success' && result.url) {
        const hash = result.url.includes('#') ? result.url.split('#')[1] : '';
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: err } = await supabase.auth.setSession({ access_token, refresh_token });
          if (err) setError(err.message);
        } else {
          setError('Google Sign In failed — could not extract tokens.');
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Google Sign In failed');
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setNeedsOnboarding(false);
    setProfileChecked(true);
  };

  const updateProfile = async (data: ProfileData): Promise<string | null> => {
    if (!supabase || !user) return null;

    // Check username uniqueness if being set
    if (data.username) {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', data.username.toLowerCase())
        .neq('id', user.id)
        .maybeSingle();
      if (existing) return 'That username is already taken. Please choose another.';
    }

    // Build payload — omit undefined keys so existing DB values aren't overwritten
    const payload: Record<string, any> = {
      id: user.id,
      has_completed_onboarding: true,
    };
    if (data.username) payload.username = data.username.toLowerCase();
    if (data.date_of_birth !== undefined) payload.date_of_birth = data.date_of_birth;
    if (data.gender !== undefined) payload.gender = data.gender;
    if (data.favorite_categories !== undefined) payload.favorite_categories = data.favorite_categories;
    if (data.location_city !== undefined) payload.location_city = data.location_city;
    if (data.location_region !== undefined) payload.location_region = data.location_region;

    const { error: upsertErr } = await supabase.from('user_profiles').upsert(payload);
    if (upsertErr) return upsertErr.message;

    setUserProfile(prev => ({
      ...prev,
      ...data,
      username: data.username ? data.username.toLowerCase() : prev?.username,
    }));
    setNeedsOnboarding(false);
    return null;
  };

  const updateAvatar = async (uri: string | null): Promise<string | null> => {
    if (!supabase || !user) return 'Not signed in';
    try {
      let publicUrl: string | null = null;
      if (uri) {
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        const path = `${user.id}/avatar.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) return uploadErr.message;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      } else {
        await supabase.storage.from('avatars').remove([`${user.id}/avatar.jpg`]);
      }
      await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setUserProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      return null;
    } catch (e: any) {
      return e?.message ?? 'Failed to update photo';
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user, userProfile, loading, needsOnboarding, profileChecked,
      error, signInWithEmail, signUpWithEmail,
      signInWithApple, signInWithGoogle,
      signOut, clearError, updateProfile, updateAvatar,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
