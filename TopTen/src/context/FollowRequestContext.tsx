import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

interface FollowRequestContextType {
  pendingCount: number;
  refetch: () => void;
}

const FollowRequestContext = createContext<FollowRequestContextType>({
  pendingCount: 0,
  refetch: () => {},
});

export const FollowRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const refetch = useCallback(() => {
    if (!supabase || !user?.id) {
      setPendingCount(0);
      return;
    }
    Promise.resolve(
      supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('status', 'pending')
    ).then(({ count }) => setPendingCount(count ?? 0)).catch(() => {});
  }, [user?.id]);

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <FollowRequestContext.Provider value={{ pendingCount, refetch }}>
      {children}
    </FollowRequestContext.Provider>
  );
};

export const useFollowRequests = () => useContext(FollowRequestContext);
