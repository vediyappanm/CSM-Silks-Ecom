import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SAMPLE_ORDERS } from '@/lib/data';

export function Admin() {
  const [page, setPage] = useState('dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Syne, sans-serif', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR */}
      <div className="admin-sidebar">
        <div className="admin-logo">
          <span className="admin-mark">CSM</span>
          <span className="admin-tag">SaaS Admin Panel</span>
          <div className="admin-version"><span className="v-dot" /> v2.4.1</div>
        </div>
        <div className="admin-nav">
          <div className="nav-group">Main</div>
          {[
            { key: 'dashboard', icon: '📊', label: 'Dashboard' },
            { key: 'orders', icon: '📦', label: 'Orders', badge: '5' },
            { key: 'products', icon: '🪡', label: 'Products' },
            { key: 'customers', icon: '👥', label: 'Customers' },
          ].map(item => (
            <div
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </div>
          ))}
          <div className="nav-group">Analytics</div>
          {[
            { key: 'reports', icon: '📈', label: 'Reports' },
            { key: 'ai-tryon', icon: '✨', label: 'AI Try-On Stats' },
          ].map(item => (
            <div
              key={item.key}
              className={`nav-item ${page === item.key ? 'active' : ''}`}
              onClick={() => setPage(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
          <div className="nav-group">Alerts</div>
          <div className={`nav-item ${page === 'unsold' ? 'active' : ''}`} onClick={() => setPage('unsold')}>
            <span className="nav-icon">⚠️</span>
            Unsold Stock
            <span className="nav-badge gold">12</span>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="admin-card">
            <div className="admin-avatar">A</div>
            <div>
              <div className="admin-name">Admin</div>
              <div className="admin-role">Super Admin</div>
            </div>
            <div className="admin-menu">⚙️</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="admin-main">
        {/* Topbar */}
        <div className="admin-topbar">
          <div className="admin-topbar-title">
            <span>✦</span> {page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ')}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="live-chip"><span className="live-dot2" /> LIVE</div>
            <span className="date-chip">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Content */}
        <div className="admin-content">
          {page === 'dashboard' && <AdminDashboard />}
          {page === 'orders' && <AdminOrders />}
          {page === 'products' && <AdminProducts />}
          {page === 'reports' && <AdminReports />}
          {page === 'unsold' && <AdminUnsold />}
          {page === 'customers' && <AdminCustomers />}
          {page === 'ai-tryon' && <AdminTryOnStats />}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const kpis = [
    { value: '₹12.4L', label: 'Total Revenue', trend: '+18%', up: true, icon: '💰', cls: 'revenue', iconCls: 'gold', sub: 'vs last month' },
    { value: '847', label: 'Total Orders', trend: '+12%', up: true, icon: '📦', cls: 'orders', iconCls: 'blue', sub: 'this quarter' },
    { value: '2,392', label: 'Total Customers', trend: '+24%', up: true, icon: '👥', cls: 'customers', iconCls: 'purple', sub: 'lifetime' },
    { value: '94%', label: 'AI Try-On Accuracy', trend: '+2%', up: true, icon: '✨', cls: 'tryon', iconCls: 'green', sub: '7-day avg' },
  ];

  const recentOrders = [
    { id: 'CSM-2847', customer: 'Priya Venkat', product: 'Royal Kanjivaram Gold Zari', amount: '₹12,999', status: 'shipped', date: '17 Mar' },
    { id: 'CSM-2846', customer: 'Ananya Sharma', product: 'Rose Gold Patola Silk', amount: '₹9,750', status: 'processing', date: '16 Mar' },
    { id: 'CSM-2845', customer: 'Ravi Kumar', product: 'Pure Silk Dhoti — Gold Border', amount: '₹4,999', status: 'pending', date: '16 Mar' },
    { id: 'CSM-2844', customer: 'Meena Iyer', product: 'Crimson Festive Silk', amount: '₹6,499', status: 'delivered', date: '15 Mar' },
    { id: 'CSM-2843', customer: 'Karthik Rajan', product: 'Silk Kurta — Royal Navy', amount: '₹4,299', status: 'delivered', date: '15 Mar' },
  ];

  const statusStyle = (s: string) => {
    const map: Record<string, string> = {
      pending: 'st-pending', processing: 'st-processing', shipped: 'st-shipped', delivered: 'st-delivered',
    };
    return map[s] || '';
  };

  const weeks = [12, 18, 14, 22, 28, 20, 32, 38, 34, 42, 48, 52];
  const maxVal = Math.max(...weeks);

  return (
    <>
      <div className="kpi-grid-4">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi-card ${k.cls}`}>
            <div className="kpi-header">
              <div className={`kpi-icon ${k.iconCls}`}>{k.icon}</div>
              <span className={`kpi-trend ${k.up ? 'up' : 'down'}`}>{k.trend}</span>
            </div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-sub">{k.sub}</div>
            <div className="sparkline">
              {weeks.map((v, j) => (
                <div key={j} className="spark-bar" style={{
                  height: `${(v / maxVal) * 100}%`,
                  background: k.up ? 'rgba(61,214,140,0.4)' : 'rgba(232,64,64,0.4)',
                  animationDelay: `${j * 0.05}s`
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-row-2">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">📈 Revenue Overview</div>
            <div className="chart-tabs">
              <button className="chart-tab act">7D</button>
              <button className="chart-tab">30D</button>
              <button className="chart-tab">90D</button>
            </div>
          </div>
          <svg viewBox="0 0 300 100" style={{ width: '100%', height: 120 }}>
            <path d="M0,70 Q20,60 40,65 T80,50 T120,40 T160,35 T200,25 T240,30 T280,20 T300,15 L300,100 L0,100 Z" fill="rgba(201,161,74,0.1)" />
            <path d="M0,70 Q20,60 40,65 T80,50 T120,40 T160,35 T200,25 T240,30 T280,20 T300,15" fill="none" stroke="var(--gold)" strokeWidth="2" />
          </svg>
        </div>
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">🔥 Top Categories</div>
          </div>
          {[
            { name: 'Kanjivaram', pct: 42, color: 'var(--gold)' },
            { name: 'Bridal', pct: 28, color: '#A855F7' },
            { name: "Men's Silk", pct: 18, color: '#4A8FE8' },
            { name: 'Daily Wear', pct: 12, color: '#3DD68C' },
          ].map((cat, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                <span>{cat.name}</span><span>{cat.pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${cat.pct}%`, height: '100%', background: cat.color, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">📋 Recent Orders</div>
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>Order ID</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {recentOrders.map((o, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>#{o.id}</td>
                <td>{o.customer}</td>
                <td style={{ fontSize: 11, color: 'var(--text3)' }}>{o.product}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{o.amount}</td>
                <td><span className={`status-badge ${statusStyle(o.status)}`}>{o.status}</span></td>
                <td style={{ fontSize: 11 }}>{o.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminOrders() {
  const orders = [
    ...SAMPLE_ORDERS,
    { id: 'CSM-2846', product: { ...SAMPLE_ORDERS[0].product, name: 'Rose Gold Patola Silk', price: 9750 }, status: 'processing' as const, date: '16 Mar 2025', courier: 'Processing' },
    { id: 'CSM-2845', product: { ...SAMPLE_ORDERS[0].product, name: 'Pure Silk Dhoti — Gold Border', price: 4999 }, status: 'pending' as const, date: '16 Mar 2025', courier: 'Pending' },
  ];

  const statusStyle: Record<string, string> = {
    pending: 'st-pending', processing: 'st-processing', shipped: 'st-shipped', delivered: 'st-delivered', cancelled: 'st-cancelled',
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <input
          placeholder="Search orders…"
          style={{
            flex: 1, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 12, color: 'var(--text)', outline: 'none',
            maxWidth: 320
          }}
        />
        <select style={{
          padding: '9px 14px', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 12, color: 'var(--text)', outline: 'none'
        }}>
          <option>All Status</option>
          <option>Pending</option>
          <option>Processing</option>
          <option>Shipped</option>
          <option>Delivered</option>
        </select>
        <button style={{
          padding: '9px 18px', background: 'rgba(201,161,74,0.15)', border: '1px solid rgba(201,161,74,0.22)',
          borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--gold)', cursor: 'pointer'
        }}>
          Filter
        </button>
      </div>
      <div className="chart-card">
        <table className="admin-table">
          <thead>
            <tr><th>Order ID</th><th>Product</th><th>Amount</th><th>Date</th><th>Courier</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={i}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>#{o.id}</td>
                <td style={{ fontSize: 11 }}>{o.product.name}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>₹{o.product.price.toLocaleString('en-IN')}</td>
                <td style={{ fontSize: 11 }}>{o.date}</td>
                <td style={{ fontSize: 11 }}>{o.courier}</td>
                <td><span className={`status-badge ${statusStyle[o.status] || ''}`}>{o.status}</span></td>
                <td>
                  <button style={{
                    padding: '4px 10px', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: 10, color: 'var(--text2)', cursor: 'pointer'
                  }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminProducts() {
  const products = [
    { name: 'Royal Kanjivaram Gold Zari', category: 'Kanjivaram', price: 12999, stock: 24, status: 'Active' },
    { name: 'Crimson Festive Silk', category: 'Festive', price: 6499, stock: 18, status: 'Active' },
    { name: 'Pure Silk Dhoti — Gold Border', category: "Men's", price: 4999, stock: 12, status: 'Active' },
    { name: 'Silk Shirt — Deep Forest Green', category: "Men's", price: 5499, stock: 8, status: 'Active' },
    { name: 'Elegant Pastel Daily Silk', category: 'Daily Wear', price: 3299, stock: 3, status: 'Low Stock' },
  ];

  return (
    <>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
        <input
          placeholder="Search products…"
          style={{
            flex: 1, padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 12, color: 'var(--text)', outline: 'none',
            maxWidth: 320
          }}
        />
        <button style={{
          padding: '9px 18px', background: 'linear-gradient(135deg,var(--gold),#E8C97A)',
          border: 'none', borderRadius: 8, fontFamily: 'Syne, sans-serif',
          fontSize: 11, fontWeight: 600, color: '#000', cursor: 'pointer'
        }}>
          + Add Product
        </button>
      </div>
      <div className="chart-card">
        <table className="admin-table">
          <thead>
            <tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i}>
                <td style={{ fontSize: 11 }}>{p.name}</td>
                <td style={{ fontSize: 11, color: 'var(--text3)' }}>{p.category}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>₹{p.price.toLocaleString('en-IN')}</td>
                <td style={{ fontSize: 11 }}>{p.stock}</td>
                <td>
                  <span className={`status-badge ${p.status === 'Low Stock' ? 'st-pending' : 'st-delivered'}`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <button style={{
                    padding: '4px 10px', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: 10, color: 'var(--text2)', cursor: 'pointer', marginRight: 4
                  }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminReports() {
  return (
    <div className="chart-row-2" style={{ marginBottom: 0 }}>
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">📊 Sales Report</div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 14, color: 'var(--text2)' }}>Sales analytics dashboard</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Revenue breakdown by category, period comparison, GST reports</div>
        </div>
      </div>
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">📋 GST Summary</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Total Sales (Taxable)', value: '₹11.80L' },
            { label: 'CGST (2.5%)', value: '₹29,500' },
            { label: 'SGST (2.5%)', value: '₹29,500' },
            { label: 'Total GST', value: '₹59,000' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)' }}>
              <span>{item.label}</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminUnsold() {
  const unsold = [
    { name: 'Purple Mysore Silk', stock: 2, days: 45, category: 'Mysore Silk' },
    { name: 'Rose Gold Patola Silk', stock: 1, days: 38, category: 'Patola' },
    { name: 'Kanjivaram Silk Veshti', stock: 3, days: 30, category: "Men's" },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          padding: '10px 18px', background: 'rgba(232,64,64,0.12)', border: '1px solid rgba(232,64,64,0.25)',
          borderRadius: 8, fontSize: 12, color: 'var(--red)', fontWeight: 600
        }}>
          ⚠️ 12 Products Unsold for 30+ Days
        </div>
      </div>
      <div className="chart-card">
        <table className="admin-table">
          <thead>
            <tr><th>Product</th><th>Category</th><th>Stock Left</th><th>Days Unsold</th><th>Alert</th></tr>
          </thead>
          <tbody>
            {unsold.map((u, i) => (
              <tr key={i}>
                <td style={{ fontSize: 11 }}>{u.name}</td>
                <td style={{ fontSize: 11, color: 'var(--text3)' }}>{u.category}</td>
                <td style={{ fontSize: 11 }}>{u.stock}</td>
                <td style={{ fontSize: 11 }}>{u.days} days</td>
                <td>
                  <span className="status-badge st-pending" style={{ background: 'rgba(232,64,64,0.15)', color: 'var(--red)' }}>
                    ⚠️ Alert
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminCustomers() {
  return (
    <div className="chart-card">
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
        <div style={{ fontSize: 16, color: 'var(--text2)', fontWeight: 600 }}>Customer Management</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>View, manage and segment your customer base</div>
      </div>
    </div>
  );
}

function AdminTryOnStats() {
  return (
    <div className="chart-card">
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
        <div style={{ fontSize: 16, color: 'var(--text2)', fontWeight: 600 }}>AI Try-On Analytics</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Track AI try-on usage, confidence scores, conversion rates</div>
      </div>
    </div>
  );
}
