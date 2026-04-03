import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Bell, Check, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import type { Notification } from '../types';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user!.id).eq('is_read', false);
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[var(--text-primary)]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-secondary)]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllAsRead}>
            <Check size={18} className="mr-2" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-12">
          <Bell className="mx-auto mb-4 text-[var(--text-muted)]" size={48} />
          <p className="text-[var(--text-secondary)]">No notifications</p>
          <p className="text-sm text-[var(--text-muted)]">You're all caught up!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${!notification.is_read ? 'border-[var(--accent-gold)]/30 bg-[rgba(var(--accent-primary-rgb),0.05)]' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-2 h-2 rounded-full mt-2 ${notification.is_read ? 'bg-transparent' : 'bg-[var(--accent-gold)]'}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[var(--text-primary)]">{notification.title}</h3>
                  {notification.message && (
                    <p className="text-sm text-[var(--text-secondary)]">{notification.message}</p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-1">{formatRelativeTime(notification.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-gold)]"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {notification.link && (
                <Link to={notification.link} className="text-sm text-[var(--accent-gold)] hover:underline mt-2 inline-block">
                  View details
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
