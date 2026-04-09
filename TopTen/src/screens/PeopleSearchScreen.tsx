import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { FollowButton } from '../components/FollowButton';
import { colors, spacing, borderRadius } from '../theme';

interface UserResult {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

export const PeopleSearchScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    // Autofocus after mount
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleChange = (q: string) => {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      if (!supabase) { setLoading(false); return; }
      const term = q.trim();
      const { data } = await supabase
        .from('user_profiles')
        .select('id, username, nickname, avatar_url')
        .or(`username.ilike.%${term}%,nickname.ilike.%${term}%`)
        .limit(20);
      setResults(data ?? []);
      setLoading(false);
      setSearched(true);
    }, 300);
  };

  const goToProfile = (userId: string) => {
    Keyboard.dismiss();
    navigation.navigate('UserProfile', { userId });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color={colors.secondaryText} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={handleChange}
            placeholder="Search by name or @username"
            placeholderTextColor={colors.secondaryText}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl }} />
      ) : query.trim().length < 2 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people" size={40} color={colors.activeTab} />
          </View>
          <Text style={styles.emptyTitle}>Find people on TopX</Text>
          <Text style={styles.emptySub}>Search by name or username to find and follow other users.</Text>
        </View>
      ) : searched && results.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={40} color={colors.border} />
          <Text style={styles.emptyTitle}>No results for "{query}"</Text>
          <Text style={styles.emptySub}>Try a different name or username.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const displayName = item.nickname ?? (item.username ? `@${item.username}` : 'Unknown');
            const username = item.username ? `@${item.username}` : null;
            return (
              <View style={styles.userRow}>
                <TouchableOpacity
                  style={styles.userRowLeft}
                  onPress={() => goToProfile(item.id)}
                  activeOpacity={0.8}
                >
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={20} color={colors.secondaryText} />
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                    {username && item.nickname ? (
                      <Text style={styles.username}>{username}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <FollowButton targetUserId={item.id} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 38,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.primaryText,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  userRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  username: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.xl * 1.5,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(204,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryText,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 21,
  },
});
