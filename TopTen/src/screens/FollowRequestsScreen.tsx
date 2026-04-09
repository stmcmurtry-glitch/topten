import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { useFollowRequests } from '../context/FollowRequestContext';
import { colors, spacing, borderRadius, shadow } from '../theme';

interface FollowRequest {
  id: string;
  follower_id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

export const FollowRequestsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { refetch: refetchBadge } = useFollowRequests();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user || !supabase) return;
    const { data } = await supabase
      .from('user_follows')
      .select('id, follower_id')
      .eq('following_id', user.id)
      .eq('status', 'pending');

    if (!data || data.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const followerIds = data.map((r: any) => r.follower_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, username, nickname, avatar_url')
      .in('id', followerIds);

    const profileMap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

    setRequests(data.map((r: any) => ({
      id: r.id,
      follower_id: r.follower_id,
      username: profileMap[r.follower_id]?.username ?? null,
      nickname: profileMap[r.follower_id]?.nickname ?? null,
      avatar_url: profileMap[r.follower_id]?.avatar_url ?? null,
    })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const acceptRequest = async (followId: string, followerId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== followId));
    refetchBadge();
    Promise.resolve(
      supabase!
        .from('user_follows')
        .update({ status: 'accepted' })
        .eq('id', followId)
    ).catch(() => {});
  };

  const declineRequest = async (followId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== followId));
    refetchBadge();
    Promise.resolve(
      supabase!
        .from('user_follows')
        .delete()
        .eq('id', followId)
    ).catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primaryText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.activeTab} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-add-outline" size={44} color={colors.border} />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySub}>When someone requests to follow you, it'll appear here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const displayName = item.nickname ?? (item.username ? `@${item.username}` : 'Unknown User');
            const username = item.username ? `@${item.username}` : null;
            return (
              <View style={styles.requestRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('UserProfile', { userId: item.follower_id })}
                  activeOpacity={0.8}
                >
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="person" size={20} color={colors.secondaryText} />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nameCol}
                  onPress={() => navigation.navigate('UserProfile', { userId: item.follower_id })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.displayName} numberOfLines={1}>{displayName}</Text>
                  {username && item.nickname ? (
                    <Text style={styles.username}>{username}</Text>
                  ) : null}
                </TouchableOpacity>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => acceptRequest(item.id, item.follower_id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => declineRequest(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCol: {
    flex: 1,
  },
  displayName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  username: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptBtn: {
    backgroundColor: colors.activeTab,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
  },
  acceptText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  declineBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  declineText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  emptySub: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
