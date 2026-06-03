import type { Order, TrackingEvent } from '@/types';

export const ORDER_STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Pending',
  payment_pending: 'Payment pending',
  confirmed: 'Confirmed',
  quality_check: 'Quality check',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  rto_initiated: 'Returning to seller',
  rto_delivered: 'Returned to seller',
  cancelled: 'Cancelled',
  return_initiated: 'Return initiated',
  returned: 'Returned',
  refunded: 'Refunded',
};

export const CUSTOMER_STATUS_CLASS: Record<Order['status'], string> = {
  packed: 'os-processing',
  shipped: 'os-shipped',
  out_for_delivery: 'os-shipped',
  delivered: 'os-delivered',
  confirmed: 'os-processing',
  quality_check: 'os-processing',
  return_initiated: 'os-pending',
  returned: 'os-pending',
  refunded: 'os-delivered',
  delivery_failed: 'os-pending',
  rto_initiated: 'os-pending',
  rto_delivered: 'os-pending',
  payment_pending: 'os-pending',
  pending: 'os-pending',
  cancelled: 'os-pending',
};

export const ADMIN_STATUS_CLASS: Record<Order['status'], string> = {
  packed: 'st-processing',
  shipped: 'st-shipped',
  out_for_delivery: 'st-shipped',
  delivered: 'st-delivered',
  confirmed: 'st-processing',
  quality_check: 'st-processing',
  return_initiated: 'st-pending',
  returned: 'st-pending',
  refunded: 'st-delivered',
  delivery_failed: 'st-pending',
  rto_initiated: 'st-pending',
  rto_delivered: 'st-pending',
  payment_pending: 'st-pending',
  pending: 'st-pending',
  cancelled: 'st-pending',
};

export const LIFECYCLE_STAGES = [
  { key: 'placed', label: 'Placed', description: 'Order received' },
  { key: 'confirmed', label: 'Confirmed', description: 'Payment or COD confirmed' },
  { key: 'quality_check', label: 'QC', description: 'Silk inspected' },
  { key: 'packed', label: 'Packed', description: 'Packed for courier' },
  { key: 'shipped', label: 'Shipped', description: 'Courier handover' },
  { key: 'out_for_delivery', label: 'OFD', description: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered', description: 'Delivered to customer' },
] as const;

type LifecycleState = 'done' | 'active' | 'todo' | 'issue';

const ORDER_STATUS_RANK: Record<Order['status'], number> = {
  pending: 0,
  payment_pending: 0,
  confirmed: 1,
  quality_check: 2,
  packed: 3,
  shipped: 4,
  out_for_delivery: 5,
  delivered: 6,
  delivery_failed: 5,
  rto_initiated: 5,
  rto_delivered: 5,
  cancelled: 1,
  return_initiated: 6,
  returned: 6,
  refunded: 6,
};

const ISSUE_STATUSES = new Set<Order['status']>([
  'cancelled',
  'delivery_failed',
  'rto_initiated',
  'rto_delivered',
  'return_initiated',
  'returned',
  'refunded',
]);

export function sortTrackingEvents(events: TrackingEvent[] = []) {
  return [...events].sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime());
}

export function latestTrackingEvent(order: Pick<Order, 'tracking_events'>) {
  const events = sortTrackingEvents(order.tracking_events || []);
  return events[events.length - 1];
}

export function lifecycleProgress(order: Pick<Order, 'status'>) {
  const rank = ORDER_STATUS_RANK[order.status as Order['status']] ?? 0;
  const isIssue = ISSUE_STATUSES.has(order.status as Order['status']);

  return LIFECYCLE_STAGES.map((stage, index) => {
    let state: LifecycleState = 'todo';
    if (index < rank || order.status === 'delivered') state = 'done';
    if (index === rank && order.status !== 'delivered') state = isIssue ? 'issue' : 'active';
    return { ...stage, state };
  });
}

export function trackingSummary(order: Order) {
  const latest = latestTrackingEvent(order);
  if (latest) {
    return {
      title: latest.title,
      description: latest.description || ORDER_STATUS_LABEL[order.status],
      location: latest.location || '',
      time: latest.happened_at,
    };
  }
  return {
    title: ORDER_STATUS_LABEL[order.status],
    description: order.tracking_number ? `AWB ${order.tracking_number}` : 'Tracking event will appear after the next admin or courier update.',
    location: order.courier_name || '',
    time: order.created_at,
  };
}

export function formatDateTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
