import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Gift, MessageCircle, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { connectNotificationRealtime, type RealtimeStatus } from '@/lib/realtime';
import { useApp } from '@/store/AppContext';
import type { AppNotification, PaginatedResponse } from '@/types';

const NOTIFICATION_PAGE_SIZE = 20;
type NotificationPageInfo = Pick<PaginatedResponse<AppNotification>, 'total' | 'page' | 'per_page'> & { pages: number };
const emptyPageInfo: NotificationPageInfo = { total: 0, page: 1, per_page: NOTIFICATION_PAGE_SIZE, pages: 1 };

const iconByType = {
  order: PackageCheck,
  shipment: Truck,
  loyalty: Gift,
  marketing: ShoppingBag,
  support: MessageCircle,
  default: Bell,
};

function relativeTime(value?: string) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '';
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function Notifications() {
  const navigate = useNavigate();
  const { isAuthed, refreshNotifications, showToast } = useApp();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [marking, setMarking] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageInfo, setPageInfo] = useState<NotificationPageInfo>(emptyPageInfo);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('unavailable');

  const loadNotificationPage = useCallback(async (page = 1, append = false, withSpinner = false) => {
    if (!isAuthed) {
      setItems([]);
      setPageInfo(emptyPageInfo);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    if (append) setLoadingMore(true);
    else if (withSpinner) setLoading(true);
    try {
      const data = await api.notifications.list({ page, per_page: NOTIFICATION_PAGE_SIZE });
      setItems(prev => {
        if (!append) return data.items;
        const seen = new Set(prev.map(item => item.id));
        return [...prev, ...data.items.filter(item => !seen.has(item.id))];
      });
      setPageInfo({ total: data.total, page: data.page, per_page: data.per_page, pages: data.pages || 1 });
      setUnreadCount(Number(data.unread_count || 0));
    } catch {
      if (!append) {
        setItems([]);
        setPageInfo(emptyPageInfo);
        setUnreadCount(0);
      }
    } finally {
      if (append) setLoadingMore(false);
      else if (withSpinner) setLoading(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    void Promise.resolve().then(() => loadNotificationPage(1, false, true));
  }, [loadNotificationPage]);

  useEffect(() => {
    if (!isAuthed) {
      return undefined;
    }
    return connectNotificationRealtime({
      onStatus: setRealtimeStatus,
      onMessage: message => {
        if (message.type === 'notification.created' && message.notification) {
          setItems(prev => {
            const exists = prev.some(item => item.id === message.notification?.id);
            return exists
              ? prev.map(item => item.id === message.notification?.id ? message.notification as AppNotification : item)
              : [message.notification as AppNotification, ...prev];
          });
          if (typeof message.unread_count === 'number') setUnreadCount(message.unread_count);
        }
        if (message.type === 'notifications.read') {
          setItems(prev => prev.map(item => ({ ...item, is_read: true })));
          setUnreadCount(0);
        }
      },
    });
  }, [isAuthed]);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await api.notifications.markRead();
      setItems(prev => prev.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);
      await refreshNotifications();
      showToast('OK', 'Notifications updated', 'All notifications are marked as read');
    } catch (err) {
      showToast('!', 'Unable to update', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setMarking(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="notifications-page">
        <div className="notifications-shell">
          <button className="back-btn notif-back" onClick={() => navigate('/')} aria-label="Back home"><ArrowLeft size={19} /></button>
          <div className="notif-empty">
            <Bell size={48} />
            <h1>Sign in for notifications</h1>
            <p>Order updates, delivery alerts, reward messages, and support notes appear here.</p>
            <button className="btn btn-gold" onClick={() => navigate('/account')}>Sign in</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-shell">
        <div className="notifications-head">
          <button className="back-btn" onClick={() => navigate('/')} aria-label="Back home">
            <ArrowLeft size={19} />
            <span className="back-btn-label">Home</span>
          </button>
          <div>
            <span>Account updates</span>
            <h1>Notifications</h1>
            <small className={`notif-live-chip ${realtimeStatus}`}>
              {realtimeStatus === 'connected' ? 'Live updates connected' : realtimeStatus}
              {pageInfo.total > 0 ? ` • ${items.length} of ${pageInfo.total} loaded` : ''}
              {unreadCount > 0 ? ` • ${unreadCount} unread` : ''}
            </small>
          </div>
          <button className="notif-mark-btn" onClick={() => void markAllRead()} disabled={marking || items.every(item => item.is_read)}>
            <CheckCheck size={17} />
            {marking ? 'Updating...' : 'Mark all read'}
          </button>
        </div>

        {loading ? (
          <div className="notifications-list">
            {Array.from({ length: 5 }).map((_, index) => <div key={index} className="notif-skeleton" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="notif-empty">
            <Bell size={48} />
            <h2>No notifications yet</h2>
            <p>Your order, delivery, return, and reward alerts will appear here.</p>
            <button className="btn btn-primary" onClick={() => navigate('/womens')}>Start shopping</button>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {items.map((item) => {
                const Icon = iconByType[(item.notification_type || 'default') as keyof typeof iconByType] || iconByType.default;
                return (
                  <article key={item.id} className={`notif-item ${item.is_read ? '' : 'unread'}`}>
                    <div className="notif-icon"><Icon size={20} /></div>
                    <div className="notif-copy">
                      <div className="notif-title-row">
                        <h2>{item.title}</h2>
                        {!item.is_read && <span>New</span>}
                      </div>
                      <p>{item.body}</p>
                      <time>{relativeTime(item.created_at)}</time>
                    </div>
                  </article>
                );
              })}
            </div>
            {pageInfo.page < pageInfo.pages && (
              <div className="notifications-load-more">
                <button className="btn btn-outline" disabled={loadingMore} onClick={() => void loadNotificationPage(pageInfo.page + 1, true)}>
                  {loadingMore ? 'Loading updates...' : `Load more (${items.length}/${pageInfo.total})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
