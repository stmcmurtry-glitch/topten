import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFollowStatus } from '../hooks/useFollowStatus';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius } from '../theme';

interface Props {
  targetUserId: string;
}

export const FollowButton: React.FC<Props> = ({ targetUserId }) => {
  const { user } = useAuth();
  const { status, loading, sendRequest, cancelOrUnfollow } = useFollowStatus(targetUserId);

  // Don't show for own profile or when not signed in
  if (!user || user.id === targetUserId) return null;

  if (loading) {
    return (
      <ActivityIndicator
        size="small"
        color={colors.activeTab}
        style={{ marginLeft: spacing.sm }}
      />
    );
  }

  if (status === 'none') {
    return (
      <TouchableOpacity style={styles.followBtn} onPress={sendRequest} activeOpacity={0.8}>
        <Text style={styles.followBtnText}>Follow</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.followingBtn} onPress={cancelOrUnfollow} activeOpacity={0.8}>
      <Text style={styles.followingBtnText}>
        {status === 'pending' ? 'Requested' : 'Following ✓'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  followBtn: {
    backgroundColor: colors.activeTab,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
  },
  followBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  followingBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  followingBtnText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '600',
  },
});
