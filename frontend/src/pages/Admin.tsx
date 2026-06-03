import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertTriangle,
  BarChart3,
  BadgePercent,
  Boxes,
  Clock3,
  FileText,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { AdminCatalogManager } from '@/features/admin/components/AdminCatalogManager';
import { ADMIN_STATUS_CLASS, ORDER_STATUS_LABEL, formatDateTime, latestTrackingEvent, lifecycleProgress, sortTrackingEvents } from '@/lib/orderLifecycle';
import { useCatalogLiveRefresh } from '@/lib/useCatalogLiveRefresh';
import { connectOrderRealtime, type RealtimeStatus } from '@/lib/realtime';
import type { AdminAuditLog, AdminCoupon, AdminInventoryRow, AdminShipment, Order, PaginatedResponse, ReturnRequest, User } from '@/types';

type AdminPage = 'dashboard' | 'orders' | 'products' | 'inventory' | 'shipments' | 'coupons' | 'returns' | 'customers' | 'reports' | 'audit' | 'unsold';
type Kpis = Record<string, number | string>;
type AdminOrderRow = Partial<Order> & {
  id: number;
  order_number?: string;
  customer?: string;
  total?: number | string;
  shipping_address_snapshot?: { full_name?: string };
  created_at?: string;
  status?: string;
};
type DashboardData = { kpis: Kpis; recent_orders: AdminOrderRow[] };
type CustomerRow = { id: number; name?: string; phone?: string; email?: string; orders?: number; spent?: number | string; tier?: string };
type ReportData = Record<string, number | string | undefined>;
type UnsoldRow = { id: number; product_name?: string; sku?: string; stock_qty?: number; days_unsold?: number; capital_blocked?: number | string; severity?: string };
type UnsoldData = { count: number; items: UnsoldRow[] };
type WorkflowPayload = { action: string; provider: string; location: string; note: string };
type OrderPageInfo = Pick<PaginatedResponse<Order>, 'total' | 'page' | 'per_page' | 'pages'>;

const ADMIN_ORDER_PAGE_SIZE = 25;

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isAdminUser(user?: User | null) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

function adminStatusClass(status?: string) {
  return ADMIN_STATUS_CLASS[status as Order['status']] || 'st-processing';
}

const workflowActions = [
  ['confirm', 'Confirm order'],
  ['quality_check', 'Start quality check'],
  ['pack', 'Mark packed'],
  ['create_label', 'Create label / AWB'],
  ['pickup', 'Courier picked up'],
  ['in_transit', 'In transit'],
  ['out_for_delivery', 'Out for delivery'],
  ['delivered', 'Delivered'],
  ['delivery_failed', 'Delivery failed'],
  ['rto_initiated', 'Return to origin'],
  ['rto_delivered', 'RTO delivered'],
  ['cancel', 'Cancel order'],
] as const;

type WorkflowAction = typeof workflowActions[number][0];

function workflowActionOptions(order: Order) {
  const allowedByStatus: Partial<Record<Order['status'], WorkflowAction[]>> = {
    pending: ['cancel'],
    payment_pending: ['cancel'],
    confirmed: ['quality_check', 'pack', 'create_label', 'cancel'],
    quality_check: ['pack', 'create_label'],
    packed: ['create_label', 'pickup', 'in_transit'],
    shipped: ['in_transit', 'out_for_delivery', 'delivery_failed', 'rto_initiated'],
    out_for_delivery: ['delivered', 'delivery_failed', 'rto_initiated'],
    delivery_failed: ['rto_initiated'],
    rto_initiated: ['rto_delivered'],
  };
  const allowed = allowedByStatus[order.status] || [];
  return workflowActions.filter(([action]) => allowed.includes(action));
}

function nextWorkflowAction(order: Order): WorkflowAction {
  const latest = latestTrackingEvent(order);
  if (order.status === 'pending' || order.status === 'payment_pending') return 'cancel';
  if (order.status === 'confirmed') return 'quality_check';
  if (order.status === 'quality_check') return 'pack';
  if (order.status === 'packed') return order.tracking_number ? 'pickup' : 'create_label';
  if (order.status === 'shipped') return latest?.status === 'in_transit' ? 'out_for_delivery' : 'in_transit';
  if (order.status === 'out_for_delivery') return 'delivered';
  if (order.status === 'delivery_failed') return 'rto_initiated';
  if (order.status === 'rto_initiated') return 'rto_delivered';
  return 'cancel';
}

function defaultWorkflowNote(action: string) {
  const notes: Record<string, string> = {
    confirm: 'Order confirmed by CSM operations.',
    quality_check: 'Silk quality check started before packing.',
    pack: 'Order packed and ready for courier handover.',
    create_label: 'Shipping label created and package is ready for handover.',
    pickup: 'Package handed over to courier partner.',
    in_transit: 'Package is moving through the courier network.',
    out_for_delivery: 'Package is with the delivery partner.',
    delivered: 'Order delivered to customer.',
    delivery_failed: 'Delivery attempt failed. Customer follow-up required.',
    rto_initiated: 'Courier started return to origin.',
    rto_delivered: 'Package returned to CSM Silks.',
    cancel: 'Order cancelled by operations team.',
  };
  return notes[action] || 'Order lifecycle updated by CSM operations.';
}

function defaultWorkflowForm(order: Order): WorkflowPayload {
  const action = nextWorkflowAction(order);
  return {
    action,
    provider: order.courier_name || 'manual',
    location: order.status === 'out_for_delivery' ? 'Customer delivery area' : 'CSM Kanchipuram operations',
    note: defaultWorkflowNote(action),
  };
}

function formatAdminMoney(value: number | string | undefined) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatAdminNumber(value: number | string | undefined) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function Admin() {
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(Boolean(api.tokens.getAccessToken()));
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    let active = true;
    const checkAdminSession = async () => {
      if (!api.tokens.hasStoredSession()) {
        setChecking(false);
        return;
      }
      const sessionReady = await api.tokens.ensureFreshAccessToken();
      if (!sessionReady) {
        if (active) {
          setAuthed(false);
          setChecking(false);
        }
        return;
      }
      try {
        const user = await api.auth.me();
        if (!active) return;
        if (isAdminUser(user)) {
          setAuthed(true);
          return;
        }
        api.tokens.clearTokens();
        setAuthed(false);
      } catch {
        if (!active) return;
        api.tokens.clearTokens();
        setAuthed(false);
      } finally {
        if (active) setChecking(false);
      }
    };
    void checkAdminSession();
    return () => {
      active = false;
    };
  }, []);

  const login = async () => {
    setLoginError('');
    try {
      const session = await api.auth.adminLogin(email, password);
      if (!isAdminUser(session.user)) throw new Error('This account does not have admin access.');
      setAuthed(true);
    } catch (err) {
      api.tokens.clearTokens();
      setAuthed(false);
      setLoginError(err instanceof Error ? err.message : 'Unable to sign in');
    }
  };

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="chart-card" style={{ width: 420 }}>
          <div className="chart-title">Checking admin session...</div>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="chart-card" style={{ width: 420 }}>
          <div className="chart-title" style={{ marginBottom: 18 }}>CSM Admin Login</div>
          {loginError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{loginError}</div>}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={adminInput} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={adminInput} />
          <button className="btn btn-gold" onClick={() => void login()}>Login</button>
        </div>
      </div>
    );
  }

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'orders', label: 'Orders', icon: ShoppingBag },
    { key: 'products', label: 'Catalog', icon: Boxes },
    { key: 'inventory', label: 'Inventory', icon: PackageCheck },
    { key: 'shipments', label: 'Shipments', icon: Truck },
    { key: 'coupons', label: 'Coupons', icon: BadgePercent },
    { key: 'returns', label: 'Returns', icon: RotateCcw },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'audit', label: 'Audit Logs', icon: ShieldCheck },
    { key: 'unsold', label: 'Stock Alerts', icon: AlertTriangle },
  ] as const;

  return (
    <div className="admin-shell">
      <div className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-mark">CSM</span>
          <span className="admin-tag">Retailer Admin</span>
          <div className="admin-version"><span className="v-dot" /> Django v1</div>
        </div>
        <div className="admin-nav">
          <div className="nav-group">Operations</div>
          {nav.map(({ key, label, icon: Icon }) => (
            <div key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}>
              <Icon className="nav-icon" size={17} /> <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar-title">{page.charAt(0).toUpperCase() + page.slice(1)}</div>
          <div className="live-chip"><span className="live-dot2" /> LIVE API</div>
        </div>
        <div className="admin-content">
          {page === 'dashboard' && <AdminDashboard />}
          {page === 'orders' && <AdminOrders />}
          {page === 'products' && <AdminCatalogManager />}
          {page === 'inventory' && <AdminInventory />}
          {page === 'shipments' && <AdminShipments />}
          {page === 'coupons' && <AdminCoupons />}
          {page === 'returns' && <AdminReturns />}
          {page === 'customers' && <AdminCustomers />}
          {page === 'reports' && <AdminReports />}
          {page === 'audit' && <AdminAuditLogs />}
          {page === 'unsold' && <AdminUnsold />}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [notice, setNotice] = useState('');
  const [orderRealtimeStatus, setOrderRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const load = useCallback(() => {
    return api.admin.dashboard().then(data => setData(data as DashboardData)).catch(() => setData(null));
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => connectOrderRealtime('/ws/orders/', {
    onStatus: setOrderRealtimeStatus,
    onMessage: message => {
      if (message.type !== 'order.update' || !message.order) return;
      setNotice(`Live dashboard refresh: ${message.order.order_number} moved to ${ORDER_STATUS_LABEL[message.order.status] || message.order.status}.`);
      void load();
    },
  }), [load]);
  const catalogRealtimeStatus = useCatalogLiveRefresh({
    onUpdate: message => {
      if (!message.type.startsWith('catalog.') && message.type !== 'inventory.variant.updated') return;
      setNotice(message.variant?.sku ? `Live dashboard stock refresh: ${message.variant.sku} changed.` : 'Live dashboard catalog refresh received.');
      void load();
    },
  });
  const k = data?.kpis || {};
  const kpiCards = [
    {
      label: 'Net Revenue Today',
      value: formatAdminMoney((k.net_revenue_today || k.revenue_today) as number | string | undefined),
      note: `Gross ${formatAdminMoney(k.gross_revenue_today as number | string | undefined)} / refunds ${formatAdminMoney(k.refunds_today as number | string | undefined)}`,
    },
    {
      label: 'Net Revenue Month',
      value: formatAdminMoney((k.net_revenue_month || k.revenue_month) as number | string | undefined),
      note: `Gross ${formatAdminMoney(k.gross_revenue_month as number | string | undefined)} / refunds ${formatAdminMoney(k.refunds_month as number | string | undefined)}`,
    },
    {
      label: 'Orders Today',
      value: formatAdminNumber(k.orders_today as number | string | undefined),
      note: `${formatAdminNumber(k.paid_orders_today as number | string | undefined)} paid / ${formatAdminNumber(k.refunded_orders_today as number | string | undefined)} refunded`,
    },
    {
      label: 'Returns Today',
      value: formatAdminNumber(k.returns_today as number | string | undefined),
      note: `${formatAdminNumber(k.total_customers as number | string | undefined)} customers in CRM`,
    },
  ];
  return (
    <>
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head compact">
        <div>
          <span className="admin-eyebrow">Realtime overview</span>
          <h2>Business pulse</h2>
          <p>Revenue, order count, and recent orders refresh from live order lifecycle events.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${orderRealtimeStatus}`}>{orderRealtimeStatus === 'connected' ? 'Live orders' : orderRealtimeStatus}</span>
          <span className={`ws-chip ${catalogRealtimeStatus}`}>{catalogRealtimeStatus === 'connected' ? 'Live catalog' : catalogRealtimeStatus}</span>
          <button className="admin-soft-btn" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="kpi-grid-4">
        {kpiCards.map(({ label, value, note }) => (
          <div key={label} className="kpi-card">
            <div className="kpi-value">{value}</div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-note">{note}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-title">Recent Orders</div>
        <AdminOrderTable orders={data?.recent_orders || []} />
      </div>
    </>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [orderPageInfo, setOrderPageInfo] = useState<OrderPageInfo>({ total: 0, page: 1, per_page: ADMIN_ORDER_PAGE_SIZE, pages: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const loadOrdersPage = useCallback((page = 1, append = false) => {
    if (append) setLoadingMore(true);
    return api.admin.orders({ page, per_page: ADMIN_ORDER_PAGE_SIZE }).then(data => {
      setOrderPageInfo({ total: data.total, page: data.page, per_page: data.per_page, pages: data.pages || 0 });
      setOrders(prev => {
        if (!append) return data.items;
        const known = new Set(prev.map(order => order.id));
        return [...prev, ...data.items.filter(order => !known.has(order.id))];
      });
    }).catch(() => {
      if (!append) setOrders([]);
    }).finally(() => {
      if (append) setLoadingMore(false);
    });
  }, []);
  const load = useCallback(() => {
    return loadOrdersPage(1, false);
  }, [loadOrdersPage]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => connectOrderRealtime('/ws/orders/', {
    onStatus: setRealtimeStatus,
    onMessage: message => {
      if (message.type !== 'order.update' || !message.order) return;
      setOrders(prev => {
        const exists = prev.some(order => order.id === message.order?.id);
        if (!exists) return [message.order as Order, ...prev];
        return prev.map(order => order.id === message.order?.id ? message.order as Order : order);
      });
      if (message.event) {
        setNotice(`Live update: ${message.order.order_number} - ${message.event.title}.`);
      }
    },
  }), []);
  const runWorkflow = async (order: Order, payload: WorkflowPayload) => {
    const updated = await api.admin.workflowOrder(order.id, {
      action: payload.action,
      provider: payload.provider || 'manual',
      location: payload.location || 'CSM Kanchipuram operations',
      note: payload.note || defaultWorkflowNote(payload.action),
    });
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    setNotice(`${updated.order_number} moved to ${ORDER_STATUS_LABEL[updated.status] || updated.status}. Customer tracking log updated.`);
  };
  const downloadInvoice = async (order: Order) => {
    const blob = await api.admin.orderInvoice(order.id);
    saveBlob(blob, `invoice-${order.order_number}.html`);
  };
  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head">
        <div>
          <span className="admin-eyebrow">Fulfillment control</span>
          <h2>Order lifecycle and customer trace</h2>
          <p>Every action below writes a customer-visible tracking event and an admin audit log.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live WebSocket' : realtimeStatus}</span>
          <button className="admin-primary-btn" onClick={load}><RefreshCw size={14} /> Refresh orders</button>
        </div>
      </div>
      <div className="chart-card">
        <AdminOrderTable orders={orders} onWorkflow={runWorkflow} onInvoice={downloadInvoice} />
        {orderPageInfo.page < (orderPageInfo.pages || 0) && (
          <div className="admin-load-more-row">
            <span>Showing {orders.length} of {orderPageInfo.total} orders</span>
            <button className="admin-soft-btn" onClick={() => void loadOrdersPage(orderPageInfo.page + 1, true)} disabled={loadingMore}>
              <RefreshCw size={14} /> {loadingMore ? 'Loading...' : 'Load more orders'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminOrderTable({ orders, onWorkflow, onInvoice }: { orders: AdminOrderRow[]; onWorkflow?: (order: Order, payload: WorkflowPayload) => void; onInvoice?: (order: Order) => void }) {
  const [forms, setForms] = useState<Record<number, WorkflowPayload>>({});
  const getForm = (order: Order) => forms[order.id] || defaultWorkflowForm(order);
  const updateForm = (order: Order, patch: Partial<WorkflowPayload>) => {
    setForms(prev => {
      const current = prev[order.id] || defaultWorkflowForm(order);
      const next = { ...current, ...patch };
      if (patch.action && !patch.note) next.note = defaultWorkflowNote(patch.action);
      return { ...prev, [order.id]: next };
    });
  };

  if (onWorkflow) {
    return (
      <div className="admin-order-flow-list">
        {orders.map(row => {
          const order = row as Order;
          const form = getForm(order);
          const latest = latestTrackingEvent(order);
          const events = sortTrackingEvents(order.tracking_events || []);
          const progress = lifecycleProgress(order);
          const customer = row.customer || row.shipping_address_snapshot?.full_name || 'Customer';
          const options = workflowActionOptions(order);
          return (
            <div key={row.id} className="admin-order-flow-card">
              <div className="admin-order-flow-main">
                <div className="admin-order-flow-head">
                  <div>
                    <span className="admin-order-number">{row.order_number}</span>
                    <small>{customer} / {row.created_at ? formatDateTime(row.created_at) : '-'}</small>
                  </div>
                  <span className={`status-badge ${adminStatusClass(row.status)}`}>{ORDER_STATUS_LABEL[order.status] || row.status}</span>
                </div>
                <div className="admin-order-meta-grid">
                  <span>Total <b>Rs {Number(row.total || row.total_amount || 0).toLocaleString('en-IN')}</b></span>
                  <span>Courier <b>{order.courier_name || 'Pending'}</b></span>
                  <span>AWB <b>{order.tracking_number || 'Not created'}</b></span>
                </div>
                <div className="admin-mini-lifecycle">
                  {progress.map(stage => <span key={stage.key} className={stage.state}>{stage.label}</span>)}
                </div>
                <div className="admin-order-events">
                  <strong><Clock3 size={14} /> Customer-visible logs</strong>
                  {events.slice(-3).reverse().map(event => (
                    <div key={`${event.id}-${event.happened_at}`} className="admin-order-event-row">
                      <span>{event.title}</span>
                      <small>{[event.location, formatDateTime(event.happened_at)].filter(Boolean).join(' / ')}</small>
                    </div>
                  ))}
                  {!events.length && <div className="admin-order-event-row"><span>No tracking event yet</span><small>Next action will create one.</small></div>}
                  {latest && <em>Latest customer message: {latest.description}</em>}
                </div>
              </div>

              <div className="admin-order-control">
                <label className="admin-field">Next update
                  <select value={options.some(([action]) => action === form.action) ? form.action : options[0]?.[0] || ''} onChange={e => updateForm(order, { action: e.target.value })} disabled={!options.length}>
                    {options.map(([action, label]) => <option key={action} value={action}>{label}</option>)}
                    {!options.length && <option value="">No safe workflow action</option>}
                  </select>
                </label>
                <label className="admin-field">Courier/provider
                  <input value={form.provider} onChange={e => updateForm(order, { provider: e.target.value })} placeholder="manual / Shiprocket / DTDC" />
                </label>
                <label className="admin-field">Location
                  <input value={form.location} onChange={e => updateForm(order, { location: e.target.value })} placeholder="CSM Kanchipuram operations" />
                </label>
                <label className="admin-field">Customer note
                  <textarea rows={3} value={form.note} onChange={e => updateForm(order, { note: e.target.value })} />
                </label>
                <div className="admin-order-control-actions">
                  <button className="admin-primary-btn" onClick={() => void onWorkflow(order, options.some(([action]) => action === form.action) ? form : { ...form, action: options[0]?.[0] || form.action })} disabled={!options.length}><Send size={14} /> Apply update</button>
                  {onInvoice && <button onClick={() => void onInvoice(order)}>Invoice</button>}
                </div>
                <p><MapPin size={13} /> This creates a timeline event on customer tracking immediately after save.</p>
              </div>
            </div>
          );
        })}
        {orders.length === 0 && <div className="admin-empty-row">No orders yet.</div>}
      </div>
    );
  }

  return (
    <table className="admin-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id}>
            <td>{o.order_number}</td>
            <td>{o.customer || o.shipping_address_snapshot?.full_name || '-'}</td>
            <td>Rs {Number(o.total || o.total_amount || 0).toLocaleString('en-IN')}</td>
            <td><span className={`status-badge ${adminStatusClass(o.status)}`}>{ORDER_STATUS_LABEL[o.status as Order['status']] || o.status}</span></td>
            <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '-'}</td>
            <td>
              {onInvoice && <button onClick={() => void onInvoice(o as Order)}>Invoice</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AdminInventory() {
  const [items, setItems] = useState<AdminInventoryRow[]>([]);
  const [adjustments, setAdjustments] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    return api.admin.inventory().then(setItems).catch(() => setItems([]));
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const realtimeStatus = useCatalogLiveRefresh({
    onUpdate: message => {
      if (message.type !== 'inventory.variant.updated' && !message.type.startsWith('catalog.variant')) return;
      setNotice(message.variant?.sku ? `Live stock update received for ${message.variant.sku}.` : 'Live stock update received.');
      void load();
    },
  });

  const adjust = async (row: AdminInventoryRow) => {
    const delta = Number(adjustments[row.variant_id] || 0);
    if (!delta) return;
    await api.admin.adjustInventory({
      variant_id: row.variant_id,
      quantity_delta: delta,
      note: `Admin stock ${delta > 0 ? 'add' : 'reduce'} from operations UI`,
    });
    setAdjustments(prev => ({ ...prev, [row.variant_id]: '' }));
    setNotice(`${row.sku} stock adjusted by ${delta}.`);
    load();
  };

  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head">
        <div>
          <span className="admin-eyebrow">Stock control</span>
          <h2>Inventory adjustment</h2>
          <p>Add received stock, reduce damaged stock, and keep low-stock flags visible before customers buy.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live inventory' : realtimeStatus}</span>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Reserved</th><th>Available</th><th>Status</th><th>Adjust</th></tr></thead>
          <tbody>
            {items.map(row => (
              <tr key={row.variant_id}>
                <td>{row.product_name}</td>
                <td>{row.sku}</td>
                <td>{row.stock_qty}</td>
                <td>{row.reserved_qty}</td>
                <td>{row.available_qty}</td>
                <td><span className={`status-badge ${row.low_stock ? 'st-pending' : 'st-delivered'}`}>{row.low_stock ? 'Low stock' : 'Healthy'}</span></td>
                <td>
                  <div className="admin-inline-form">
                    <input
                      type="number"
                      value={adjustments[row.variant_id] || ''}
                      onChange={e => setAdjustments(prev => ({ ...prev, [row.variant_id]: e.target.value }))}
                      placeholder="+10 / -2"
                    />
                    <button onClick={() => void adjust(row)}>Save</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminShipments() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [form, setForm] = useState({ order: '', provider: 'manual', awb_number: '', tracking_url: '', status: 'created' as AdminShipment['status'], event_location: '', event_note: '' });
  const [notice, setNotice] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');

  const load = useCallback(() => {
    return Promise.all([
      api.admin.orders({ per_page: 100 }).then(data => data.items),
      api.admin.shipments(),
    ]).then(([orderData, shipmentData]) => {
      setOrders(orderData);
      setShipments(shipmentData);
      setForm(prev => prev.order || !orderData[0] ? prev : { ...prev, order: String(orderData[0].id) });
    }).catch(() => {
      setOrders([]);
      setShipments([]);
    });
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => connectOrderRealtime('/ws/orders/', {
    onStatus: setRealtimeStatus,
    onMessage: message => {
      if (message.type !== 'order.update' || !message.order) return;
      setNotice(`Live shipment refresh: ${message.order.order_number} tracking changed.`);
      void load();
    },
  }), [load]);

  const saveShipment = async () => {
    if (!form.order) return;
    const shipment = await api.admin.createShipment({
      order: Number(form.order),
      provider: form.provider,
      awb_number: form.awb_number,
      tracking_url: form.tracking_url,
      status: form.status,
      event_location: form.event_location,
      event_note: form.event_note,
    });
    setNotice(`${shipment.order_number} shipment saved.`);
    setForm(prev => ({ ...prev, event_location: '', event_note: '' }));
    load();
  };

  const downloadShipmentFile = async (shipment: AdminShipment, kind: 'label' | 'manifest') => {
    const blob = kind === 'label' ? await api.admin.shipmentLabel(shipment.id) : await api.admin.shipmentManifest(shipment.id);
    saveBlob(blob, `${kind}-${shipment.order_number}.txt`);
  };

  return (
    <div className="admin-create-grid compact">
      <div className="admin-form-card">
        <div className="chart-title chart-title-between">
          <span><Truck size={18} /> Add shipment / tracking</span>
          <small className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live shipments' : realtimeStatus}</small>
        </div>
        <label className="admin-field wide">Order
          <select value={form.order} onChange={e => setForm({ ...form, order: e.target.value })}>
            {orders.map(order => <option key={order.id} value={order.id}>{order.order_number} - Rs {Number(order.total_amount).toLocaleString('en-IN')}</option>)}
          </select>
        </label>
        <div className="admin-form-grid">
          <label className="admin-field">Courier<input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="Shiprocket / DTDC" /></label>
          <label className="admin-field">AWB / Tracking<input value={form.awb_number} onChange={e => setForm({ ...form, awb_number: e.target.value })} /></label>
          <label className="admin-field wide">Tracking URL<input value={form.tracking_url} onChange={e => setForm({ ...form, tracking_url: e.target.value })} placeholder="https://..." /></label>
          <label className="admin-field">Status
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as AdminShipment['status'] })}>
              <option value="created">Created</option>
              <option value="picked_up">Picked up</option>
              <option value="in_transit">In transit</option>
              <option value="out_for_delivery">Out for delivery</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="rto_initiated">RTO initiated</option>
              <option value="rto_delivered">RTO delivered</option>
            </select>
          </label>
          <label className="admin-field">Current location<input value={form.event_location} onChange={e => setForm({ ...form, event_location: e.target.value })} placeholder="Kanchipuram hub" /></label>
          <label className="admin-field wide">Customer update note<input value={form.event_note} onChange={e => setForm({ ...form, event_note: e.target.value })} placeholder="Package handed to courier / reached Chennai hub" /></label>
        </div>
        {notice && <div className="admin-alert good">{notice}</div>}
        <button className="admin-primary-btn admin-submit" onClick={() => void saveShipment()}>Save shipment</button>
      </div>
      <div className="admin-form-card">
        <div className="chart-title">Current shipments</div>
        <div className="admin-collection-list">
          {shipments.map(shipment => (
            <div key={shipment.id} className="admin-collection-row">
              <div>
                <strong>{shipment.order_number}</strong>
                <span>{shipment.provider} / {shipment.awb_number || 'No AWB'} / {shipment.status}</span>
                {shipment.events?.length ? (
                  <span className="admin-muted-line">{shipment.events[shipment.events.length - 1].title} - {shipment.events[shipment.events.length - 1].location || 'location pending'}</span>
                ) : null}
              </div>
              <span className={`status-badge ${shipment.status === 'delivered' ? 'st-delivered' : 'st-shipped'}`}>{shipment.status}</span>
              <div className="admin-row-actions">
                <button onClick={() => void downloadShipmentFile(shipment, 'label')}>Label</button>
                <button onClick={() => void downloadShipmentFile(shipment, 'manifest')}>Manifest</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type CouponForm = {
  code: string;
  description: string;
  discount_type: AdminCoupon['discount_type'];
  value: string;
  min_order_value: string;
  usage_limit: string;
  is_active: boolean;
};

const emptyCouponForm: CouponForm = {
  code: '',
  description: '',
  discount_type: 'percent',
  value: '10',
  min_order_value: '0',
  usage_limit: '',
  is_active: true,
};

function couponToForm(coupon: AdminCoupon): CouponForm {
  return {
    code: coupon.code,
    description: coupon.description || '',
    discount_type: coupon.discount_type,
    value: String(coupon.value || ''),
    min_order_value: String(coupon.min_order_value || '0'),
    usage_limit: coupon.usage_limit == null ? '' : String(coupon.usage_limit),
    is_active: coupon.is_active,
  };
}

function formToCouponPayload(form: CouponForm): Partial<AdminCoupon> {
  return {
    code: form.code.trim().toUpperCase(),
    description: form.description.trim(),
    discount_type: form.discount_type,
    value: form.value || '0',
    min_order_value: form.min_order_value || '0',
    usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    is_active: form.is_active,
  };
}

function AdminCoupons() {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [form, setForm] = useState<CouponForm>(emptyCouponForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    return api.admin.coupons().then(setCoupons).catch(() => setCoupons([]));
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyCouponForm);
  };

  const saveCoupon = async () => {
    if (!form.code.trim()) {
      setNotice('Coupon code is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = formToCouponPayload(form);
      const saved = editingId
        ? await api.admin.updateCoupon(editingId, payload)
        : await api.admin.createCoupon(payload);
      setNotice(`${saved.code} ${editingId ? 'updated' : 'created'} successfully.`);
      resetForm();
      load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const editCoupon = (coupon: AdminCoupon) => {
    setEditingId(coupon.id);
    setForm(couponToForm(coupon));
    setNotice('');
  };

  const toggleCoupon = async (coupon: AdminCoupon) => {
    const updated = await api.admin.updateCoupon(coupon.id, { is_active: !coupon.is_active });
    setCoupons(prev => prev.map(item => item.id === updated.id ? updated : item));
    setNotice(`${updated.code} is now ${updated.is_active ? 'active' : 'paused'}.`);
  };

  return (
    <div className="admin-create-grid compact">
      <div className="admin-form-card">
        <div className="chart-title"><BadgePercent size={18} /> {editingId ? 'Edit coupon' : 'Create coupon'}</div>
        <div className="admin-form-grid">
          <label className="admin-field">Code
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH20" />
          </label>
          <label className="admin-field">Discount type
            <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value as AdminCoupon['discount_type'] })}>
              <option value="percent">Percentage</option>
              <option value="flat">Flat amount</option>
            </select>
          </label>
          <label className="admin-field">Value
            <input type="number" min="0" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="20" />
          </label>
          <label className="admin-field">Minimum order
            <input type="number" min="0" value={form.min_order_value} onChange={e => setForm({ ...form, min_order_value: e.target.value })} placeholder="1000" />
          </label>
          <label className="admin-field">Usage limit
            <input type="number" min="0" value={form.usage_limit} onChange={e => setForm({ ...form, usage_limit: e.target.value })} placeholder="Blank = unlimited" />
          </label>
          <label className="admin-field coupon-active-field">
            <span>Active coupon</span>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
          </label>
          <label className="admin-field wide">Description
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Launch offer for orders above Rs 1000" />
          </label>
        </div>
        {notice && <div className={`admin-alert ${notice.includes('Unable') || notice.includes('required') ? 'bad' : 'good'}`}>{notice}</div>}
        <div className="admin-row-actions coupon-form-actions">
          <button className="admin-primary-btn" onClick={() => void saveCoupon()} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update coupon' : 'Create coupon'}</button>
          {editingId && <button onClick={resetForm}>Cancel edit</button>}
        </div>
      </div>

      <div className="admin-form-card">
        <div className="chart-title">Coupon library</div>
        <div className="admin-collection-list">
          {coupons.map(coupon => (
            <div key={coupon.id} className="admin-collection-row coupon-row">
              <div>
                <strong>{coupon.code}</strong>
                <span>
                  {coupon.discount_type === 'percent' ? `${Number(coupon.value).toLocaleString('en-IN')}% off` : `Rs ${Number(coupon.value).toLocaleString('en-IN')} off`}
                  {' '}above Rs {Number(coupon.min_order_value).toLocaleString('en-IN')}
                </span>
                <span className="admin-muted-line">
                  Used {coupon.used_count}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''} times. {coupon.description || 'No description'}
                </span>
              </div>
              <span className={`status-badge ${coupon.is_active ? 'st-delivered' : 'st-pending'}`}>{coupon.is_active ? 'Active' : 'Paused'}</span>
              <div className="admin-row-actions">
                <button onClick={() => editCoupon(coupon)}>Edit</button>
                <button onClick={() => void toggleCoupon(coupon)}>{coupon.is_active ? 'Pause' : 'Activate'}</button>
              </div>
            </div>
          ))}
          {coupons.length === 0 && <div className="admin-empty-row">No coupons yet. Create one to show discounts in checkout.</div>}
        </div>
      </div>
    </div>
  );
}

const returnStatusOptions: Record<ReturnRequest['status'], Array<[ReturnRequest['status'], string]>> = {
  requested: [['requested', 'Requested'], ['approved', 'Approve'], ['rejected', 'Reject']],
  approved: [['approved', 'Approved'], ['picked_up', 'Mark picked up'], ['rejected', 'Reject']],
  picked_up: [['picked_up', 'Picked up'], ['refunded', 'Refund']],
  refunded: [['refunded', 'Refunded']],
  rejected: [['rejected', 'Rejected']],
};

function returnIsTerminal(status: ReturnRequest['status']) {
  return status === 'refunded' || status === 'rejected';
}

function AdminReturns() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [notice, setNotice] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');

  const load = useCallback(() => {
    return api.admin.returns().then(setReturns).catch(() => setReturns([]));
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => connectOrderRealtime('/ws/orders/', {
    onStatus: setRealtimeStatus,
    onMessage: message => {
      if (message.type !== 'order.update' || !message.order) return;
      if (message.order.status !== 'return_initiated' && message.order.status !== 'returned' && message.order.status !== 'refunded') return;
      setNotice(`Live return refresh: ${message.order.order_number} is ${ORDER_STATUS_LABEL[message.order.status] || message.order.status}.`);
      void load();
    },
  }), [load]);

  const updateReturn = async (ret: ReturnRequest, status: ReturnRequest['status']) => {
    const updated = await api.admin.updateReturn(ret.id, { status });
    setReturns(prev => prev.map(item => item.id === updated.id ? updated : item));
    setNotice(`${updated.order_number} return marked ${updated.status}.`);
  };

  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head">
        <div>
          <span className="admin-eyebrow">Return operations</span>
          <h2>Return requests</h2>
          <p>Customer return requests and refund status changes update this queue through order lifecycle events.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live returns' : realtimeStatus}</span>
          <button className="admin-soft-btn" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Return</th><th>Customer</th><th>Reason</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            {returns.map(ret => (
              <tr key={ret.id}>
                <td>{ret.order_number}</td>
                <td>{ret.customer}</td>
                <td>{ret.reason}<span className="admin-muted-line">{ret.details}</span></td>
                <td><span className={`status-badge ${ret.status === 'refunded' ? 'st-delivered' : 'st-processing'}`}>{ret.status}</span></td>
                <td>{new Date(ret.created_at).toLocaleDateString('en-IN')}</td>
                <td>
                  <select value={ret.status} disabled={returnIsTerminal(ret.status)} onChange={e => void updateReturn(ret, e.target.value as ReturnRequest['status'])}>
                    {returnStatusOptions[ret.status].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [notice, setNotice] = useState('');
  const load = useCallback(() => {
    return api.admin.customers().then(data => setCustomers(data as CustomerRow[])).catch(() => setCustomers([]));
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => connectOrderRealtime('/ws/orders/', {
    onStatus: setRealtimeStatus,
    onMessage: message => {
      if (message.type !== 'order.update' || !message.order) return;
      setNotice(`Customer spend refreshed from ${message.order.order_number}.`);
      void load();
    },
  }), [load]);
  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head compact">
        <div>
          <span className="admin-eyebrow">Customer ledger</span>
          <h2>Customer spend and tiers</h2>
          <p>Order lifecycle updates refresh customer order counts and spend totals.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live customers' : realtimeStatus}</span>
          <button className="admin-soft-btn" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="chart-card">
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Orders</th><th>Spent</th><th>Tier</th></tr></thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}><td>{c.name}</td><td>{c.phone || c.email}</td><td>{c.orders}</td><td>Rs {Number(c.spent || 0).toLocaleString('en-IN')}</td><td>{c.tier}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminReports() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [notice, setNotice] = useState('');
  const load = useCallback(() => {
    return api.admin.reports().then(data => setReport(data as ReportData)).catch(() => setReport(null));
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => connectOrderRealtime('/ws/orders/', {
    onStatus: setRealtimeStatus,
    onMessage: message => {
      if (message.type !== 'order.update' || !message.order) return;
      setNotice(`Reports refreshed from ${message.order.order_number}.`);
      void load();
    },
  }), [load]);
  const reportCards = [
    ['Net Revenue', formatAdminMoney((report?.net_revenue || report?.total_revenue) as number | string | undefined), `Gross ${formatAdminMoney(report?.gross_revenue)} minus refunds`],
    ['Gross Revenue', formatAdminMoney(report?.gross_revenue), `${formatAdminNumber(report?.paid_orders)} paid orders`],
    ['Refunds', formatAdminMoney(report?.refunds), `${formatAdminNumber(report?.refunded_orders)} fully refunded / ${formatAdminNumber(report?.partially_refunded_orders)} partial`],
    ['Return Rate', `${formatAdminNumber(report?.return_rate)}%`, `${formatAdminNumber(report?.return_orders)} refunded returns`],
    ['Taxable Sales', formatAdminMoney(report?.taxable_sales), 'Paid order subtotal only'],
    ['GST Collected', formatAdminMoney(report?.gst_total), `CGST ${formatAdminMoney(report?.cgst)} / SGST ${formatAdminMoney(report?.sgst)}`],
  ];
  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head compact">
        <div>
          <span className="admin-eyebrow">Financial pulse</span>
          <h2>Revenue and GST reports</h2>
          <p>Paid orders, refunds, returns, and GST totals refresh from live order events.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live reports' : realtimeStatus}</span>
          <button className="admin-soft-btn" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="chart-row-2" style={{ marginBottom: 0 }}>
        {reportCards.map(([label, value, note]) => (
          <div key={label} className="chart-card">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-note">{note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAuditLogs() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [query, setQuery] = useState('');
  const [orderRealtimeStatus, setOrderRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const [notice, setNotice] = useState('');
  const load = useCallback(() => {
    return api.admin.auditLogs({ action: actionFilter, q: query.trim() }).then(setLogs).catch(() => setLogs([]));
  }, [actionFilter, query]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => connectOrderRealtime('/ws/orders/', {
    onStatus: setOrderRealtimeStatus,
    onMessage: message => {
      if (message.type !== 'order.update' || !message.order) return;
      setNotice(`Audit refreshed from order event ${message.order.order_number}.`);
      void load();
    },
  }), [load]);
  const catalogRealtimeStatus = useCatalogLiveRefresh({
    onUpdate: message => {
      if (!message.type.startsWith('catalog.') && message.type !== 'inventory.variant.updated') return;
      setNotice(message.variant?.sku ? `Audit refreshed from stock event ${message.variant.sku}.` : 'Audit refreshed from catalog event.');
      void load();
    },
  });
  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head">
        <div>
          <span className="admin-eyebrow">Traceability</span>
          <h2>Admin audit trail</h2>
          <p>Operational changes from order workflow, stock adjustments, returns, shipment edits, and courier webhooks.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${orderRealtimeStatus}`}>{orderRealtimeStatus === 'connected' ? 'Live orders' : orderRealtimeStatus}</span>
          <span className={`ws-chip ${catalogRealtimeStatus}`}>{catalogRealtimeStatus === 'connected' ? 'Live catalog' : catalogRealtimeStatus}</span>
          <button className="admin-soft-btn" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="admin-table-toolbar audit-toolbar">
        <label className="admin-field audit-filter">Action
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">All actions</option>
            <option value="payment.refund">Payment refunds</option>
            <option value="payment.refund_rejected">Rejected refunds</option>
            <option value="order.workflow.confirm">Order confirmations</option>
            <option value="order.workflow.pack">Order packing</option>
            <option value="order.create_label">Label creation</option>
            <option value="shipping.webhook">Courier webhooks</option>
            <option value="return.update">Return updates</option>
          </select>
        </label>
        <label className="admin-field audit-filter wide">Search audit text
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Order number, entity id, action, or summary" />
        </label>
        <span>{logs.length} matching log{logs.length === 1 ? '' : 's'}</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Summary</th><th>IP</th></tr></thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                <td>{log.user_name}<span className="admin-muted-line">{log.user_email || 'system event'}</span></td>
                <td><span className="status-badge st-shipped">{log.action}</span></td>
                <td>{log.entity_type}<span className="admin-muted-line">#{log.entity_id || '-'}</span></td>
                <td>{log.summary}</td>
                <td>{log.ip_address || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6}><div className="admin-empty-row">No audit logs match the current filters.</div></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUnsold() {
  const [data, setData] = useState<UnsoldData | null>(null);
  const [notice, setNotice] = useState('');
  const load = useCallback(() => {
    return api.admin.unsold().then(data => setData(data as unknown as UnsoldData)).catch(() => setData(null));
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const realtimeStatus = useCatalogLiveRefresh({
    onUpdate: message => {
      if (!message.type.startsWith('catalog.') && message.type !== 'inventory.variant.updated') return;
      setNotice(message.variant?.sku ? `Stock alerts refreshed from ${message.variant.sku}.` : 'Stock alerts refreshed from live catalog.');
      void load();
    },
  });
  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
      <div className="admin-panel-head compact">
        <div>
          <span className="admin-eyebrow">Inventory risk</span>
          <h2>{data?.count || 0} unsold stock alerts</h2>
          <p>Inventory and catalog changes refresh this risk view immediately.</p>
        </div>
        <div className="admin-head-actions">
          <span className={`ws-chip ${realtimeStatus}`}>{realtimeStatus === 'connected' ? 'Live stock alerts' : realtimeStatus}</span>
          <button className="admin-soft-btn" onClick={() => void load()}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="chart-card">
        <table className="admin-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Days</th><th>Capital</th><th>Severity</th></tr></thead>
          <tbody>
            {(data?.items || []).map((u) => (
              <tr key={u.id}><td>{u.product_name}</td><td>{u.sku}</td><td>{u.stock_qty}</td><td>{u.days_unsold}</td><td>Rs {Number(u.capital_blocked).toLocaleString('en-IN')}</td><td>{u.severity}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const adminInput: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  marginBottom: 12,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};
