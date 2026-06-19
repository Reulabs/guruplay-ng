import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  message: string | null;
  read: boolean | null;
  created_at: string;
}

const getFallbackNotifications = (): AppNotification[] => [
  {
    id: 'welcome',
    title: 'Welcome to Guruplay',
    body: 'New account updates and listening activity will appear here.',
    read: false,
    createdAt: new Date().toISOString(),
  },
];

const mapNotification = (row: NotificationRow): AppNotification => ({
  id: row.id,
  title: row.title || 'Notification',
  body: row.body || row.message || '',
  read: Boolean(row.read),
  createdAt: row.created_at,
});

export const useNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setError(null);
      return;
    }

    if (!isSupabaseConfigured) {
      setNotifications(getFallbackNotifications());
      setError('Supabase is not configured.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from('notifications')
      .select('id,user_id,title,body,message,read,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (queryError) {
      setNotifications([]);
      setError(queryError.message);
      setIsLoading(false);
      return;
    }

    setNotifications((data || []).map((row) => mapNotification(row as NotificationRow)));
    setIsLoading(false);
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      return;
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;

    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

    if (!isSupabaseConfigured) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    reload: loadNotifications,
    markAllRead,
  };
};
