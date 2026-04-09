import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export type FollowStatus = 'none' | 'pending' | 'accepted';

interface UseFollowStatusResult {
  status: FollowStatus;
  loading: boolean;
  sendRequest: () => void;
  cancelOrUnfollow: () => void;
}

export function useFollowStatus(targetUserId: string): UseFollowStatusResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<FollowStatus>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabase || !targetUserId || user.id === targetUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.resolve(
      supabase
        .from('user_follows')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()
    ).then(({ data }) => {
      if (data?.status === 'accepted') setStatus('accepted');
      else if (data?.status === 'pending') setStatus('pending');
      else setStatus('none');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id, targetUserId]);

  const sendRequest = useCallback(() => {
    if (!user || !supabase) return;
    setStatus('pending');
    Promise.resolve(
      supabase.from('user_follows').insert({
        follower_id: user.id,
        following_id: targetUserId,
        status: 'pending',
      })
    ).catch(() => {
      setStatus('none');
    });
  }, [user?.id, targetUserId]);

  const cancelOrUnfollow = useCallback(() => {
    if (!user || !supabase) return;
    setStatus('none');
    Promise.resolve(
      supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
    ).catch(() => {});
  }, [user?.id, targetUserId]);

  return { status, loading, sendRequest, cancelOrUnfollow };
}
