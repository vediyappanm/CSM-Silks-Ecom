import { api } from '@/lib/api';
import type { AppNotification, Order, Product, ProductVariant, TrackingEvent } from '@/types';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'unavailable';

export type OrderRealtimeMessage = {
  type: 'connection' | 'order.update' | 'pong';
  status?: string;
  scope?: string;
  source?: string;
  order?: Order;
  event?: TrackingEvent | null;
  timestamp?: string;
};

export type NotificationRealtimeMessage = {
  type: 'connection' | 'notification.created' | 'notifications.read' | 'pong';
  status?: string;
  scope?: string;
  notification?: AppNotification;
  unread_count?: number;
  timestamp?: string;
};

export type CatalogRealtimeMessage = {
  type:
    | 'connection'
    | 'catalog.product.created'
    | 'catalog.product.updated'
    | 'catalog.product.deleted'
    | 'catalog.variant.created'
    | 'catalog.variant.updated'
    | 'catalog.category.created'
    | 'catalog.collection.created'
    | 'catalog.image.created'
    | 'inventory.variant.updated'
    | 'pong';
  status?: string;
  scope?: string;
  source?: string;
  product?: Product;
  product_id?: number;
  slug?: string;
  gender?: Product['gender'];
  category_slug?: string;
  is_active?: boolean;
  variant?: Partial<ProductVariant> & { product_id?: number };
  variant_id?: number;
  timestamp?: string;
};

type ConnectOptions<TMessage> = {
  onMessage: (message: TMessage) => void;
  onStatus?: (status: RealtimeStatus) => void;
};

const HEARTBEAT_INTERVAL_MS = 25000;
const HEARTBEAT_TIMEOUT_MS = 60000;

function wsBaseUrl() {
  const explicit = import.meta.env.VITE_WS_TARGET as string | undefined;
  if (explicit) return explicit.replace(/\/$/, '');

  const apiTarget = import.meta.env.VITE_API_TARGET as string | undefined;
  if (apiTarget) {
    const target = new URL(apiTarget);
    target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
    return target.toString().replace(/\/$/, '');
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

function connectRealtime<TMessage>(path: string, options: ConnectOptions<TMessage>) {
  if (!('WebSocket' in window)) {
    options.onStatus?.('unavailable');
    return () => undefined;
  }

  let socket: WebSocket | null = null;
  let stopped = false;
  let retryTimer = 0;
  let heartbeatTimer = 0;
  let staleTimer = 0;
  let lastMessageAt = 0;
  let attempt = 0;

  const getFreshAccessToken = async () => {
    const existing = api.tokens.getAccessToken();
    if (existing) return existing;
    const refreshed = await api.tokens.refreshAccessToken();
    return refreshed ? api.tokens.getAccessToken() : null;
  };

  const scheduleReconnect = (delay: number) => {
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      void open();
    }, delay);
  };

  const clearHeartbeat = () => {
    window.clearInterval(heartbeatTimer);
    window.clearTimeout(staleTimer);
    heartbeatTimer = 0;
    staleTimer = 0;
  };

  const markAlive = () => {
    lastMessageAt = Date.now();
  };

  const armStaleCheck = () => {
    window.clearTimeout(staleTimer);
    staleTimer = window.setTimeout(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastMessageAt >= HEARTBEAT_TIMEOUT_MS) {
        socket.close(4000, 'heartbeat-timeout');
        return;
      }
      armStaleCheck();
    }, HEARTBEAT_TIMEOUT_MS);
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    markAlive();
    armStaleCheck();
    heartbeatTimer = window.setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: 'ping' }));
    }, HEARTBEAT_INTERVAL_MS);
  };

  const open = async () => {
    if (stopped) return;
    const latestToken = await getFreshAccessToken();
    if (!latestToken) {
      options.onStatus?.('unavailable');
      return;
    }
    options.onStatus?.('connecting');
    socket = new WebSocket(`${wsBaseUrl()}${path}`, ['csm-token', latestToken]);

    socket.onopen = () => {
      attempt = 0;
      startHeartbeat();
      options.onStatus?.('connected');
    };

    socket.onmessage = event => {
      try {
        markAlive();
        const message = JSON.parse(event.data) as TMessage & { type?: string };
        if (message.type === 'pong') return;
        options.onMessage(message as TMessage);
      } catch {
        // Ignore non-JSON frames from proxies or dev tooling.
      }
    };

    socket.onclose = event => {
      clearHeartbeat();
      void (async () => {
        socket = null;
        if (stopped) return;
        if (event.code === 4401) {
          const refreshed = await api.tokens.refreshAccessToken();
          if (!refreshed) {
            options.onStatus?.('unavailable');
            return;
          }
          attempt = 0;
        } else {
          attempt += 1;
        }
        options.onStatus?.('disconnected');
        scheduleReconnect(Math.min(1000 * Math.max(attempt, 1), 8000));
      })();
    };

    socket.onerror = () => {
      socket?.close();
    };
  };

  scheduleReconnect(0);

  return () => {
    stopped = true;
    window.clearTimeout(retryTimer);
    clearHeartbeat();
    socket?.close();
  };
}

export function connectOrderRealtime(path: string, options: ConnectOptions<OrderRealtimeMessage>) {
  return connectRealtime(path, options);
}

export function connectNotificationRealtime(options: ConnectOptions<NotificationRealtimeMessage>) {
  return connectRealtime('/ws/notifications/', options);
}

export function connectCatalogRealtime(options: ConnectOptions<CatalogRealtimeMessage>) {
  return connectRealtime('/ws/catalog/', options);
}
