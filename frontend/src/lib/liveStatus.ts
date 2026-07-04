import type { RealtimeStatus } from '@/lib/realtime';

const LIVE_LABELS: Record<string, string> = {
  stock: 'Live stock',
  catalog: 'Live catalog',
  orders: 'Live WebSocket',
  notifications: 'Live updates',
};

export function liveStatusLabel(status: RealtimeStatus, kind: keyof typeof LIVE_LABELS = 'stock') {
  if (status === 'connected') return LIVE_LABELS[kind] || 'Live';
  if (status === 'connecting') return 'Connecting…';
  if (status === 'disconnected') return 'Reconnecting…';
  return 'Offline';
}
