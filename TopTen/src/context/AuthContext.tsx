import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const GOOGLE_CLIENT_ID = (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '').trim();

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) { setError('Auth not configured'); return; }
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) { setError('Auth not configured'); return; }
    setError(null);
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
    } else {
      Alert.alert('Check your email', 'A confirmation link has been sent to your email address.');
    }
  };

  const signInWithApple = async () => {
    if (!supabase) { setError('Auth not configured'); return; }
    setError(null);
    try {
      // Import lazily so the module doesn't break Android
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
        // Tokens arrive in the URL hash fragment
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
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
