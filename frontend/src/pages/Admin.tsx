import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  FileText,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { AdminCatalogManager } from '@/features/admin/components/AdminCatalogManager';
import type { AdminInventoryRow, AdminShipment, Order, ReturnRequest, User } from '@/types';

type AdminPage = 'dashboard' | 'orders' | 'products' | 'inventory' | 'shipments' | 'returns' | 'customers' | 'reports' | 'unsold';
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

function isAdminUser(user?: User | null) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

function adminStatusClass(status?: string) {
  if (status === 'delivered') return 'st-delivered';
  if (status === 'cancelled' || status === 'refunded' || status === 'returned') return 'st-pending';
  if (status === 'shipped' || status === 'out_for_delivery') return 'st-shipped';
  return 'st-processing';
}

export function Admin() {
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [email, setEmail] = useState('admin@csmsilks.com');
  const [password, setPassword] = useState('admin123');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(Boolean(api.tokens.getAccessToken()));
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!api.tokens.getAccessToken()) return;
    api.auth.me()
      .then(user => {
        if (isAdminUser(user)) {
          setAuthed(true);
          return;
        }
        api.tokens.clearTokens();
        setAuthed(false);
      })
      .catch(() => {
        api.tokens.clearTokens();
        setAuthed(false);
      })
      .finally(() => setChecking(false));
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
    { key: 'returns', label: 'Returns', icon: RotateCcw },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'reports', label: 'Reports', icon: FileText },
    { key: 'unsold', label: 'Stock Alerts', icon: AlertTriangle },
  ] as const;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Syne, sans-serif', background: 'var(--bg)', color: 'var(--text)' }}>
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
          {page === 'returns' && <AdminReturns />}
          {page === 'customers' && <AdminCustomers />}
          {page === 'reports' && <AdminReports />}
          {page === 'unsold' && <AdminUnsold />}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  useEffect(() => { api.admin.dashboard().then(data => setData(data as DashboardData)).catch(() => setData(null)); }, []);
  const k = data?.kpis || {};
  return (
    <>
      <div className="kpi-grid-4">
        {[
          ['Revenue Today', k.revenue_today || 0],
          ['Revenue Month', k.revenue_month || 0],
          ['Orders Today', k.orders_today || 0],
          ['Customers', k.total_customers || 0],
        ].map(([label, value]) => (
          <div key={label} className="kpi-card">
            <div className="kpi-value">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
            <div className="kpi-label">{label}</div>
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
  useEffect(() => { api.admin.orders().then(data => setOrders(data.items)).catch(() => setOrders([])); }, []);
  const updateStatus = async (order: Order, status: string) => {
    const updated = await api.admin.updateOrderStatus(order.id, { status });
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  };
  return (
    <div className="chart-card">
      <AdminOrderTable orders={orders} onStatus={updateStatus} />
    </div>
  );
}

function AdminOrderTable({ orders, onStatus }: { orders: AdminOrderRow[]; onStatus?: (order: Order, status: string) => void }) {
  return (
    <table className="admin-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id}>
            <td>{o.order_number}</td>
            <td>{o.customer || o.shipping_address_snapshot?.full_name || '-'}</td>
            <td>Rs {Number(o.total || o.total_amount || 0).toLocaleString('en-IN')}</td>
            <td><span className={`status-badge ${adminStatusClass(o.status)}`}>{o.status}</span></td>
            <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '-'}</td>
            <td>
              {onStatus && (
                <select onChange={e => void onStatus(o as Order, e.target.value)} defaultValue="">
                  <option value="" disabled>Update</option>
                  <option value="quality_check">Quality Check</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              )}
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

  const load = () => {
    api.admin.inventory().then(setItems).catch(() => setItems([]));
  };

  useEffect(load, []);

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

  const load = () => {
    Promise.all([
      api.admin.orders().then(data => data.items),
      api.admin.shipments(),
    ]).then(([orderData, shipmentData]) => {
      setOrders(orderData);
      setShipments(shipmentData);
      setForm(prev => prev.order || !orderData[0] ? prev : { ...prev, order: String(orderData[0].id) });
    }).catch(() => {
      setOrders([]);
      setShipments([]);
    });
  };

  useEffect(load, []);

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

  return (
    <div className="admin-create-grid compact">
      <div className="admin-form-card">
        <div className="chart-title"><Truck size={18} /> Add shipment / tracking</div>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminReturns() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [notice, setNotice] = useState('');

  const load = () => {
    api.admin.returns().then(setReturns).catch(() => setReturns([]));
  };

  useEffect(load, []);

  const updateReturn = async (ret: ReturnRequest, status: ReturnRequest['status']) => {
    const updated = await api.admin.updateReturn(ret.id, { status });
    setReturns(prev => prev.map(item => item.id === updated.id ? updated : item));
    setNotice(`${updated.order_number} return marked ${updated.status}.`);
  };

  return (
    <div className="admin-stack">
      {notice && <div className="admin-alert good">{notice}</div>}
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
                  <select value={ret.status} onChange={e => void updateReturn(ret, e.target.value as ReturnRequest['status'])}>
                    <option value="requested">Requested</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="picked_up">Picked up</option>
                    <option value="refunded">Refunded</option>
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
  useEffect(() => { api.admin.customers().then(data => setCustomers(data as CustomerRow[])).catch(() => setCustomers([])); }, []);
  return (
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
  );
}

function AdminReports() {
  const [report, setReport] = useState<ReportData | null>(null);
  useEffect(() => { api.admin.reports().then(data => setReport(data as ReportData)).catch(() => setReport(null)); }, []);
  return (
    <div className="chart-row-2" style={{ marginBottom: 0 }}>
      {[
        ['Total Revenue', report?.total_revenue || 0],
        ['Taxable Sales', report?.taxable_sales || 0],
        ['CGST', report?.cgst || 0],
        ['SGST', report?.sgst || 0],
      ].map(([label, value]) => (
        <div key={label} className="chart-card">
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">Rs {Number(value).toLocaleString('en-IN')}</div>
        </div>
      ))}
    </div>
  );
}

function AdminUnsold() {
  const [data, setData] = useState<UnsoldData | null>(null);
  useEffect(() => { api.admin.unsold().then(data => setData(data as unknown as UnsoldData)).catch(() => setData(null)); }, []);
  return (
    <div className="chart-card">
      <div className="chart-title">{data?.count || 0} Unsold Stock Alerts</div>
      <table className="admin-table">
        <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Days</th><th>Capital</th><th>Severity</th></tr></thead>
        <tbody>
          {(data?.items || []).map((u) => (
            <tr key={u.id}><td>{u.product_name}</td><td>{u.sku}</td><td>{u.stock_qty}</td><td>{u.days_unsold}</td><td>Rs {Number(u.capital_blocked).toLocaleString('en-IN')}</td><td>{u.severity}</td></tr>
          ))}
        </tbody>
      </table>
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
