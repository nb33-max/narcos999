import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, PackageOpen, Tags, Activity, Globe, MessagesSquare, Settings2,
  LogOut, Plus, Pencil, Trash2, X, Search, RefreshCw, Upload, Star, BadgePercent, Truck,
  Eye, EyeOff, ArrowDown, ArrowUp, ShieldCheck, ShieldAlert, CheckCircle2, Circle, Send,
  Filter, Loader2, Lock, ToggleLeft, ToggleRight, User, ExternalLink, FileText, Bot, Film, CreditCard,
  MessageSquarePlus,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useApp } from '../store/AppContext.jsx';
import { useToast } from '../store/ToastContext.jsx';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '../lib/api';
import AdminCodeGate, { clearAdminGate } from '../components/AdminCodeGate.jsx';
import { formatCurrency, formatDate, timeAgo, STATUS_COLORS } from '../lib/format';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'orders', label: 'Orders', icon: PackageOpen },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'geoblock', label: 'Geo-Block', icon: Globe },
  { id: 'messages', label: 'Messages', icon: MessagesSquare },
  { id: 'stories', label: 'Stories', icon: Film },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'REFUNDED'];

function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return '🏳️';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
}

export default function AdminPage() {
  const { user, settings, trackEvent } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    trackEvent('admin_view', { path: '/admin', metadata: { tab } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="max-w-md mx-auto px-4 py-32 text-center">
        <Lock size={44} className="mx-auto text-crimson" />
        <h1 className="font-serif text-2xl font-bold text-pine mt-4">ADMIN ACCESS REQUIRED</h1>
        <p className="text-moss text-sm mt-3">Please sign in with an administrator account to access the command center.</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-6">BACK TO STORE</button>
      </div>
    );
  }

  return (
    <AdminCodeGate>
      <div className="min-h-screen bg-subcard/40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-xl font-bold text-pine leading-tight">NARCOS BAY COMMAND CENTER</h1>
              <p className="text-[11px] text-moss uppercase tracking-widest">Signed in as {user.email} · {user.role}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="pill bg-emerald-500/10 text-emerald-600"><ShieldCheck size={11} /> SITE LIVE</span>
              <button onClick={() => navigate('/admin/bot')} className="btn-outline !py-2 text-[10px]"><Bot size={12} /> BOT PANEL</button>
              <button onClick={() => { clearAdminGate(); localStorage.removeItem('nb_token'); window.location.href = '/'; }} className="btn-outline !py-2 text-[10px]"><LogOut size={12} /> LOGOUT</button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto mt-4 pb-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${tab === id ? 'bg-pine text-canvas shadow-sm' : 'bg-white text-moss hover:text-pine border border-stone/60'}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === 'overview' && <OverviewTab settings={settings} />}
            {tab === 'products' && <ProductsTab settings={settings} />}
            {tab === 'orders' && <OrdersTab settings={settings} />}
            {tab === 'categories' && <CategoriesTab settings={settings} />}
            {tab === 'analytics' && <AnalyticsTab settings={settings} />}
            {tab === 'geoblock' && <GeoBlockTab settings={settings} />}
            {tab === 'messages' && <MessagesTab settings={settings} />}
            {tab === 'stories' && <StoriesTab />}
            {tab === 'payments' && <PaymentsTab />}
            {tab === 'settings' && <SettingsTab settings={settings} />}
          </div>
        </div>
      </div>
    </AdminCodeGate>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5 flex items-start justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-moss">{label}</p>
        <p className="text-2xl font-bold text-pine mt-1.5">{value}</p>
        {sub && <p className="text-[11px] text-moss mt-1">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: (color || '#8B0000') + '14', color: color || '#8B0000' }}>
        <Icon size={18} />
      </div>
    </div>
  );
}

// ---------------- TAB 1: OVERVIEW ----------------
function OverviewTab({ settings }) {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);

  const load = useCallback(async () => {
    try {
      const [o, ors] = await Promise.all([apiGet('/analytics/overview'), apiGet('/orders')]);
      setData(o); setOrders(ors.slice(0, 8));
    } catch { toast('Failed to load overview', 'error'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const quickUpdate = async (id, status) => {
    try {
      await apiPut(`/orders/${id}/status`, { status });
      toast(`Order status → ${status}`, 'success');
      load();
    } catch { toast('Update failed', 'error'); }
  };

  if (!data) return <div className="py-20 text-center"><Loader2 size={26} className="animate-spin text-moss mx-auto" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={BadgePercent} label="Total Revenue" value={formatCurrency(data.totals.revenue, settings)} sub="Last 30 days" color="#8B0000" />
        <StatCard icon={PackageOpen} label="Total Orders" value={data.totals.orders} sub={`${data.pending} pending actions`} color="#3B82F6" />
        <StatCard icon={Package} label="Published Products" value={data.totals.products} sub="Active catalog" color="#10B981" />
        <StatCard icon={User} label="Customers" value={data.totals.customers} sub="Registered users" color="#F59E0B" />
        <StatCard icon={Truck} label="Low Stock" value={data.totals.lowStock} sub="≤ threshold units" color="#EF4444" />
        <StatCard icon={MessagesSquare} label="Unread Messages" value={data.totals.unread} sub="Support inbox" color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Traffic Overview</h3>
            <div className="flex gap-2 text-[10px]">
              <span className="pill bg-crimson/10 text-crimson">Events</span>
              <span className="pill bg-pine/10 text-pine">Pageviews</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.timeline}>
              <defs>
                <linearGradient id="gEvt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B0000" stopOpacity={0.35} /><stop offset="100%" stopColor="#8B0000" stopOpacity={0} /></linearGradient>
                <linearGradient id="gPv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3E4A3E" stopOpacity={0.35} /><stop offset="100%" stopColor="#3E4A3E" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#687268" />
              <YAxis tick={{ fontSize: 10 }} stroke="#687268" />
              <Tooltip />
              <Area type="monotone" dataKey="events" name="Events" stroke="#8B0000" fill="url(#gEvt)" strokeWidth={2} />
              <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#3E4A3E" fill="url(#gPv)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-4">Device Breakdown</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.devices} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {(data.devices || []).map((_, i) => <Cell key={i} fill={['#8B0000', '#3E4A3E', '#3B82F6', '#F59E0B'][i % 4]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {(data.devices || []).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-moss"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ['#8B0000', '#3E4A3E', '#3B82F6', '#F59E0B'][i % 4] }} />{d.name}</span>
                <span className="font-bold text-pine">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Recent Orders Queue</h3>
          <button onClick={load} className="btn-ghost !py-2 text-[10px]"><RefreshCw size={12} /> REFRESH</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-moss border-b border-stone">
                <th className="py-2 pr-3">Order</th><th className="py-2 pr-3">Customer</th><th className="py-2 pr-3">Total</th><th className="py-2 pr-3">Payment</th><th className="py-2 pr-3">Status</th><th className="py-2">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-stone/40 last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-xs font-bold text-pine">{o.order_number}</td>
                  <td className="py-2.5 pr-3 text-moss">{o.customer_name}</td>
                  <td className="py-2.5 pr-3 font-bold text-pine">{formatCurrency(o.total_amount, settings)}</td>
                  <td className="py-2.5 pr-3"><span className="pill" style={{ background: (STATUS_COLORS[o.payment_status] || '#888') + '1a', color: STATUS_COLORS[o.payment_status] || '#888' }}>{o.payment_status}</span></td>
                  <td className="py-2.5 pr-3"><span className="pill" style={{ background: (STATUS_COLORS[o.status] || '#888') + '1a', color: STATUS_COLORS[o.status] || '#888' }}>{o.status}</span></td>
                  <td className="py-2.5">
                    <select
                      value={o.status} onChange={(e) => quickUpdate(o.id, e.target.value)}
                      className="text-[11px] font-bold border border-stone rounded-lg px-2 py-1.5 bg-white text-pine outline-none">
                      {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------- TAB 2: PRODUCTS ----------------
function ProductsTab({ settings }) {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([apiGet('/products'), apiGet('/categories')]);
      setProducts(p); setCategories(c);
    } catch { toast('Failed to load products', 'error'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await apiDelete(`/products/${p.id}`); toast('Product deleted', 'info'); load(); } catch { toast('Delete failed', 'error'); }
  };

  const save = async (payload) => {
    setSaving(true);
    try {
      if (editing?.id) await apiPut(`/products/${editing.id}`, payload);
      else await apiPost('/products', payload);
      toast(editing?.id ? 'Product updated' : 'Product created', 'success');
      setEditing(null); load();
    } catch (e) { toast(e.message || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-moss">{products.length} products in catalog</p>
        <button onClick={() => setEditing({ media: [], pricing_tiers: [], tags: [] })} className="btn-primary"><Plus size={14} /> ADD PRODUCT</button>
      </div>

      <div className="card p-5 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-moss border-b border-stone">
              <th className="py-2 pr-3">Product</th><th className="py-2 pr-3">SKU</th><th className="py-2 pr-3">Category</th><th className="py-2 pr-3">Stock</th><th className="py-2 pr-3">Price / Tiers</th><th className="py-2 pr-3">Status</th><th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td className="py-10 text-center text-moss" colSpan={7}><Loader2 size={20} className="animate-spin mx-auto" /></td></tr> :
              products.map((p) => {
                const img = p.media?.find((m) => m.is_primary)?.secure_url || p.media?.[0]?.secure_url;
                return (
                  <tr key={p.id} className="border-b border-stone/40 last:border-0 align-middle">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-3">
                        <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover bg-subcard shrink-0" />
                        <div>
                          <p className="font-semibold text-pine">{p.name}</p>
                          <p className="text-[10px] text-moss flex items-center gap-1.5">
                            {p.featured && <span className="flex items-center gap-0.5 text-amber-500"><Star size={9} />Featured</span>}
                            {p.new_arrival && <span className="text-emerald-600">New</span>}
                            {p.best_seller && <span className="text-crimson">Best</span>}
                            {p.is_hidden && <span className="flex items-center gap-0.5 text-moss"><EyeOff size={9} />Hidden</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-moss">{p.sku || '—'}</td>
                    <td className="py-2.5 pr-3 text-moss">{p.category_name || '—'}</td>
                    <td className="py-2.5 pr-3">
                      <span className={p.inventory <= p.low_stock_threshold ? 'text-crimson font-bold' : 'text-pine font-bold'}>{p.inventory}</span>
                      {p.inventory <= p.low_stock_threshold && <span className="text-[9px] font-bold uppercase text-crimson ml-1">low</span>}
                    </td>
                    <td className="py-2.5 pr-3">
                      <p className="font-bold text-pine">{p.price_on_request ? 'On Request' : formatCurrency(p.price, settings)}</p>
                      {(p.pricing_tiers || []).slice(0, 2).map((t, i) => (
                        <p key={i} className="text-[10px] text-moss">{t.quantity}{t.unit} — {formatCurrency(t.price, settings)}</p>
                      ))}
                    </td>
                    <td className="py-2.5 pr-3"><span className="pill" style={{ background: (p.status === 'PUBLISHED' ? '#10B981' : '#888') + '1a', color: p.status === 'PUBLISHED' ? '#10B981' : '#888' }}>{p.status}</span></td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => setEditing(JSON.parse(JSON.stringify(p)))} className="btn-ghost !py-1.5 !px-2" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => remove(p)} className="btn-ghost !py-1.5 !px-2 hover:!text-crimson" title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {editing && <ProductModal product={editing} categories={categories} onClose={() => setEditing(null)} onSave={save} saving={saving} />}
    </div>
  );
}

function ProductModal({ product, categories, onClose, onSave, saving }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: product.name || '', slug: product.slug || '', category_id: product.category_id || '', sku: product.sku || '',
    batch_number: product.batch_number || '', description: product.description || '', short_description: product.short_description || '',
    thc_percent: product.thc_percent ?? '', cbd_percent: product.cbd_percent ?? '', terpene_percent: product.terpene_percent ?? '', strain_type: product.strain_type || 'Hybrid',
    pricing_model: product.pricing_model || 'STANDARD', price: product.price ?? '', compare_at_price: product.compare_at_price ?? '', price_on_request: product.price_on_request || false,
    inventory: product.inventory ?? 0, low_stock_threshold: product.low_stock_threshold ?? 5, status: product.status || 'PUBLISHED',
    featured: product.featured || false, best_seller: product.best_seller || false, new_arrival: product.new_arrival || false, is_hidden: product.is_hidden || false,
    tags: product.tags || [],
  });
  const [media, setMedia] = useState(product.media || []);
  const [tiers, setTiers] = useState(product.pricing_tiers || []);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput('');
  };

  const DIRECT_LIMIT = 3 * 1024 * 1024;

  const uploadOne = (file, onProgress) => new Promise((resolve, reject) => {
    const isVideo = (file.type || '').startsWith('video');
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    xhr.upload.onprogress = onProgress;
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let res;
        try { res = JSON.parse(xhr.responseText); } catch { reject(new Error('Bad response')); return; }
        resolve({ media_type: res.media_type || (isVideo ? 'video' : 'image'), secure_url: res.secure_url });
      } else {
        let msg = 'Upload failed';
        try { const r = JSON.parse(xhr.responseText); msg = (r.error && r.error.message) || r.error || msg; } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    if (file.size > DIRECT_LIMIT) {
      apiPost('/media/sign').then((sig) => {
        if (!sig || !sig.signature || !sig.cloud_name) { reject(new Error('Signing failed')); return; }
        fd.append('file', file);
        fd.append('api_key', sig.api_key);
        fd.append('timestamp', String(sig.timestamp));
        fd.append('signature', sig.signature);
        fd.append('folder', sig.folder);
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`);
        xhr.send(fd);
      }).catch(() => reject(new Error('Signing failed')));
    } else {
      fd.append('file', file);
      xhr.open('POST', '/api/media/upload');
      const tok = localStorage.getItem('nb_token');
      if (tok) xhr.setRequestHeader('Authorization', `Bearer ${tok}`);
      xhr.send(fd);
    }
  });

  const uploadFiles = (fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;
    const total = list.length;
    let done = 0;
    let failed = 0;
    setUploading(true);
    setUploadProgress(0);
    list.forEach((file, fi) => {
      uploadOne(file, (e) => {
        if (e.lengthComputable) {
          const filePct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(Math.round(((fi + filePct / 100) / total) * 100));
        }
      }).then((res) => {
        setMedia((m) => [...m, { media_type: res.media_type, secure_url: res.secure_url, alt_text: '', display_order: m.length + 1, is_primary: m.length === 0 }]);
      }).catch(() => { failed += 1; }).finally(() => {
        done += 1;
        if (done === total) {
          setUploading(false); setUploadProgress(0);
          if (failed) toast(`${failed} of ${total} files failed`, 'error');
          else toast(total === 1 ? 'Media uploaded' : `${total} files uploaded`, 'success');
        }
      });
    });
  };

  const updateMedia = (i, patch) => setMedia((m) => m.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeMedia = (i) => setMedia((m) => m.filter((_, idx) => idx !== i));

  const addTier = () => setTiers((t) => [...t, { quantity: 10, unit: 'g', price: '', display_order: t.length + 1 }]);
  const updateTier = (i, patch) => setTiers((t) => t.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeTier = (i) => setTiers((t) => t.filter((_, idx) => idx !== i));

  const submit = () => {
    if (!form.name) { toast('Name is required', 'error'); return; }
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const batch = form.batch_number || `NB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    onSave({
      ...form,
      slug,
      batch_number: batch,
      thc_percent: form.thc_percent === '' || form.thc_percent === null ? null : Number(form.thc_percent),
      cbd_percent: form.cbd_percent === '' || form.cbd_percent === null ? null : Number(form.cbd_percent),
      terpene_percent: form.terpene_percent === '' || form.terpene_percent === null ? null : Number(form.terpene_percent),
      price: form.price === '' ? null : Number(form.price),
      compare_at_price: form.compare_at_price === '' ? null : Number(form.compare_at_price),
      inventory: Number(form.inventory) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 5,
      media: media.map((m) => ({ media_type: m.media_type, secure_url: m.secure_url, alt_text: m.alt_text, display_order: m.display_order, is_primary: m.is_primary })),
      pricing_tiers: tiers.map((t) => ({ quantity: Number(t.quantity), unit: t.unit, price: Number(t.price), display_order: t.display_order })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl h-full bg-white overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone sticky top-0 bg-white z-10">
          <h2 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">{product?.id ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="btn-ghost !p-2"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="field-heading">Basic Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Title *</label><input className="input" value={form.name} onChange={set('name')} /></div>
              <div><label className="label">Category</label>
                <select className="input" value={form.category_id} onChange={set('category_id')}>
                  <option value="">Uncategorized</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={set('sku')} /></div>
              <div><label className="label">Tags (comma separated)</label>
                <div className="flex gap-2">
                  <input className="input" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                  <button onClick={addTag} className="btn-outline !px-3 text-xs">ADD</button>
                </div>
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-1.5 mt-1">
                {form.tags.map((t, i) => (
                  <span key={i} className="pill bg-subcard text-pine flex items-center gap-1">
                    {t}
                    <button onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }))}><X size={10} /></button>
                  </span>
                ))}
              </div>
              <div className="sm:col-span-2"><label className="label">Full Description</label><textarea rows={3} className="input" value={form.description} onChange={set('description')} /></div>
            </div>
          </section>

          <section>
            <h3 className="field-heading">Pricing & Bulk Tiers</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div><label className="label">Standard Price</label><input type="number" className="input" value={form.price} onChange={set('price')} /></div>
              <div><label className="label">Compare-at Price</label><input type="number" className="input" value={form.compare_at_price} onChange={set('compare_at_price')} /></div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-2 text-sm text-moss">
                <input type="checkbox" checked={form.price_on_request} onChange={set('price_on_request')} className="accent-crimson" /> Price on Request
              </label>
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-moss">Tiered Gram / Bulk Pricing</p>
              <button onClick={addTier} className="btn-outline !py-1.5 text-[10px]"><Plus size={11} /> ADD TIER</button>
            </div>
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="number" className="input !py-2 w-20" value={t.quantity} onChange={(e) => updateTier(i, { quantity: e.target.value })} />
                  <select className="input !py-2 w-20" value={t.unit} onChange={(e) => updateTier(i, { unit: e.target.value })}>
                    {['g', 'kg', 'oz', 'lb', 'pack'].map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <input type="number" className="input !py-2 flex-1" placeholder="Price" value={t.price} onChange={(e) => updateTier(i, { price: e.target.value })} />
                  <input type="number" className="input !py-2 w-20" placeholder="Order" value={t.display_order} onChange={(e) => updateTier(i, { display_order: e.target.value })} />
                  <button onClick={() => removeTier(i)} className="btn-ghost !p-2 hover:!text-crimson"><X size={14} /></button>
                </div>
              ))}
              {tiers.length === 0 && <p className="text-xs text-moss/60">No tiers — standard pricing only.</p>}
            </div>
          </section>

          <section>
            <h3 className="field-heading">Stock & Visibility</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Inventory Count</label><input type="number" className="input" value={form.inventory} onChange={set('inventory')} /></div>
              <div><label className="label">Low-Stock Threshold</label><input type="number" className="input" value={form.low_stock_threshold} onChange={set('low_stock_threshold')} /></div>
              <div><label className="label">Status</label>
                <select className="input" value={form.status} onChange={set('status')}>
                  {['PUBLISHED', 'DRAFT', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[['featured', 'Featured', Star], ['best_seller', 'Best Seller', BadgePercent], ['new_arrival', 'New Arrival', SparkleIcon], ['is_hidden', 'Hidden', EyeOff]].map(([key, label, Icon]) => (
                <label key={key} className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm font-semibold transition-colors ${form[key] ? 'border-crimson bg-crimson/5 text-crimson' : 'border-stone text-moss'}`}>
                  <input type="checkbox" className="hidden" checked={form[key]} onChange={set(key)} />
                  <Icon size={14} /> {label}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="field-heading">Media Pipeline</h3>
            <div
              className="border-2 border-dashed border-stone rounded-xl p-6 text-center cursor-pointer hover:border-crimson/50 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); uploadFiles(e.dataTransfer.files); }}>
              <input ref={fileRef} type="file" multiple accept="image/*,video/mp4" className="hidden" onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
              <Upload size={20} className="mx-auto text-moss" />
              <p className="text-sm font-semibold text-pine mt-2">{uploading ? `Uploading… ${uploadProgress}%` : 'Drag & drop or click to upload multiple files'}</p>
              <p className="text-[11px] text-moss mt-1">Select several high-res images & MP4 reels at once</p>
              {uploading && <div className="w-full bg-subcard rounded-full h-1.5 mt-3 max-w-xs mx-auto"><div className="h-full bg-crimson rounded-full transition-all" style={{ width: uploadProgress + '%' }} /></div>}
            </div>
            <div className="space-y-2 mt-3">
              {media.map((m, i) => (
                <div key={i} className="flex items-center gap-3 bg-subcard rounded-lg p-2.5">
                  {m.media_type === 'video' ? <FileText size={26} className="text-crimson shrink-0" /> : <img src={m.secure_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-white" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase ${m.media_type === 'video' ? 'text-crimson' : 'text-pine'}`}>{m.media_type || 'image'}</span>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-moss cursor-pointer">
                        <input type="checkbox" className="accent-crimson" checked={!!m.is_primary} onChange={(e) => setMedia((mm) => mm.map((it, idx) => ({ ...it, is_primary: idx === i ? e.target.checked : false })))} />
                        Primary
                      </label>
                    </div>
                    <input className="w-full !py-1 text-xs" placeholder="Alt text" value={m.alt_text || ''} onChange={(e) => updateMedia(i, { alt_text: e.target.value })} />
                    <div className="flex items-center gap-1 text-moss">
                      <button onClick={() => updateMedia(i, { display_order: (m.display_order || i + 1) - 1 })} className="btn-ghost !p-1"><ArrowUp size={12} /></button>
                      <button onClick={() => updateMedia(i, { display_order: (m.display_order || i + 1) + 1 })} className="btn-ghost !p-1"><ArrowDown size={12} /></button>
                      <span className="text-[10px] font-bold">Order: {m.display_order}</span>
                      <button onClick={() => removeMedia(i)} className="btn-ghost !p-1 ml-auto hover:!text-crimson"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {media.length === 0 && <p className="text-xs text-moss/60">No media attached yet.</p>}
            </div>
          </section>

          <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
            <button onClick={onClose} className="btn-outline flex-1">CANCEL</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'SAVING…' : 'SAVE PRODUCT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon({ size = 14 }) {
  return <Star size={size} />;
}

// ---------------- TAB 3: ORDERS ----------------
function OrdersTab({ settings }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [payFilter, setPayFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try { setOrders(await apiGet('/orders')); } catch { toast('Failed to load orders', 'error'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter((o) =>
    (statusFilter === 'ALL' || o.status === statusFilter) &&
    (payFilter === 'ALL' || o.payment_status === payFilter) &&
    (!search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-moss"><Filter size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Filters</span></div>
        <select className="input !py-2 w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>ALL</option>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input !py-2 w-40" value={payFilter} onChange={(e) => setPayFilter(e.target.value)}>
          <option>ALL</option>{PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="relative ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss" />
          <input className="input !py-2 pl-9 w-64" placeholder="Search order # or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card p-5 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-moss border-b border-stone">
              <th className="py-2 pr-3">Order</th><th className="py-2 pr-3">Customer</th><th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Items</th><th className="py-2 pr-3">Total</th><th className="py-2 pr-3">Payment</th><th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} onClick={() => setSelected(o)} className="border-b border-stone/40 last:border-0 cursor-pointer hover:bg-subcard/50">
                <td className="py-2.5 pr-3 font-mono text-xs font-bold text-pine">{o.order_number}</td>
                <td className="py-2.5 pr-3 text-moss">{o.customer_name}<p className="text-[10px]">{o.customer_email}</p></td>
                <td className="py-2.5 pr-3 text-xs text-moss">{formatDate(o.created_at)}</td>
                <td className="py-2.5 pr-3 text-moss">{(o.items || []).reduce((s, it) => s + it.quantity, 0)} units</td>
                <td className="py-2.5 pr-3 font-bold text-pine">{formatCurrency(o.total_amount, settings)}</td>
                <td className="py-2.5 pr-3"><span className="pill" style={{ background: (STATUS_COLORS[o.payment_status] || '#888') + '1a', color: STATUS_COLORS[o.payment_status] || '#888' }}>{o.payment_status}</span></td>
                <td className="py-2.5"><span className="pill" style={{ background: (STATUS_COLORS[o.status] || '#888') + '1a', color: STATUS_COLORS[o.status] || '#888' }}>{o.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-moss text-sm">No orders match the current filters.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} onUpdated={(updated) => { setSelected(updated); load(); }} settings={settings} />}
    </div>
  );
}

function OrderDrawer({ order, onClose, onUpdated, settings }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState('');
  const [tracking, setTracking] = useState(order.tracking_number || '');
  const [pay, setPay] = useState(order.payment_status);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    apiGet(`/orders/${order.id}/comments`).then(setComments).catch(() => {});
  }, [order.id]);

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      await apiPost(`/orders/${order.id}/comments`, { message: commentText.trim() });
      setCommentText('');
      setComments(await apiGet(`/orders/${order.id}/comments`));
      toast('Comment added — customer notified', 'success');
    } catch { toast('Failed to add comment', 'error'); }
  };

  const submit = async () => {
    setSaving(true);
    try {
      const updated = await apiPut(`/orders/${order.id}/status`, { status, note, tracking_number: tracking, payment_status: pay });
      toast('Order updated', 'success');
      onUpdated(updated);
    } catch { toast('Update failed', 'error'); }
    finally { setSaving(false); }
  };

  const addr = order.shipping_address || {};
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-xl h-full bg-white overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">{order.order_number}</h2>
            <p className="text-[11px] text-moss">{formatDate(order.created_at)} · {order.payment_method}</p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="field-heading">Customer</h3>
            <div className="bg-subcard rounded-lg p-4 space-y-1 text-sm">
              <p className="font-bold text-pine">{order.customer_name}</p>
              <p className="text-moss">{order.customer_email}</p>
              {order.customer_phone && <p className="text-moss">{order.customer_phone}</p>}
              <p className="text-moss text-xs pt-1">{addr.address}, {addr.city} {addr.postal_code}, {addr.country}</p>
            </div>
          </section>

          <section>
            <h3 className="field-heading">Items</h3>
            <div className="space-y-2">
              {(order.items || []).map((it, i) => (
                <div key={i} className="flex justify-between items-center bg-subcard rounded-lg px-4 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-pine">{it.name}</p>
                    <p className="text-[11px] text-moss uppercase">{it.tier || 'Standard'} × {it.quantity}</p>
                  </div>
                  <span className="font-bold">{formatCurrency(it.total, settings)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-moss"><span>Subtotal</span><span>{formatCurrency(order.subtotal, settings)}</span></div>
              {order.discount_amount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount {order.discount_code}</span><span>-{formatCurrency(order.discount_amount, settings)}</span></div>}
              <div className="flex justify-between text-moss"><span>Shipping</span><span>{formatCurrency(order.shipping_fee, settings)}</span></div>
              <div className="flex justify-between text-moss"><span>Tax</span><span>{formatCurrency(order.tax_amount, settings)}</span></div>
              <div className="flex justify-between font-bold text-pine text-lg pt-1 border-t border-stone"><span>Total</span><span>{formatCurrency(order.total_amount, settings)}</span></div>
            </div>
          </section>

          <section>
            <h3 className="field-heading">Milestone Status</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatus(s)} className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-colors ${status === s ? 'bg-pine text-canvas border-pine' : 'border-stone text-moss hover:text-pine'}`}>{s}</button>
                ))}
              </div>
              <div><label className="label">Admin Status Note (appends to tracking)</label><textarea rows={2} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Stealth packed and labeled…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Tracking Number</label><input className="input font-mono" value={tracking} onChange={(e) => setTracking(e.target.value)} /></div>
                <div><label className="label">Payment Status</label>
                  <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>
                    {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="field-heading">Tracking History</h3>
            <div className="space-y-3">
              {[...(order.history || [])].reverse().map((h, i) => (
                <div key={i} className="flex gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-crimson mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-pine uppercase tracking-wide">{h.status}</p>
                    <p className="text-xs text-moss">{h.note}</p>
                    <p className="text-[10px] text-moss/50 font-mono">{formatDate(h.at)} · {timeAgo(h.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="field-heading">Customer Updates</h3>
            <div className="space-y-2">
              {comments.length === 0 && <p className="text-xs text-moss">No comments yet. Add a visible update for the customer below.</p>}
              {comments.map((c) => (
                <div key={c.id} className="bg-subcard rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-crimson">{c.author_name || 'Admin'}</span>
                    <span className="text-[10px] text-moss/60 font-mono">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-moss mt-0.5">{c.message}</p>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input className="input flex-1" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Visible to customer — links are clickable…" onKeyDown={(e) => e.key === 'Enter' && addComment()} />
                <button onClick={addComment} disabled={!commentText.trim()} className="btn-primary !py-2 text-[10px] whitespace-nowrap"><MessageSquarePlus size={14} /> ADD</button>
              </div>
            </div>
          </section>

          <div className="flex gap-3 sticky bottom-0 bg-white pt-2">
            <button onClick={onClose} className="btn-outline flex-1">CLOSE</button>
            <button onClick={submit} disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}SAVE UPDATE</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- TAB 4: CATEGORIES ----------------
function CategoriesTab({ settings }) {
  const { toast } = useToast();
  const { setCategories } = useApp();
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await apiGet('/categories');
      setCats(list);
      setCategories(list);
    } catch { toast('Failed to load categories', 'error'); }
  }, [toast, setCategories]);
  useEffect(() => { load(); }, [load]);

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try { await apiDelete(`/categories/${c.id}`); toast('Category deleted', 'info'); load(); } catch { toast('Delete failed', 'error'); }
  };

  const save = async (payload) => {
    try {
      if (editing?.id) await apiPut(`/categories/${editing.id}`, payload);
      else await apiPost('/categories', payload);
      toast('Category saved', 'success');
      setEditing(null); load();
    } catch (e) { toast(e.message || 'Save failed', 'error'); }
  };

  const move = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const next = cats.slice();
    [next[i], next[j]] = [next[j], next[i]];
    try {
      await Promise.all(next.map((c, idx) => apiPut(`/categories/${c.id}`, {
        name: c.name, slug: c.slug, description: c.description, image_url: c.image_url,
        display_order: idx + 1, status: c.status, is_hidden: c.is_hidden, cloudinary_id: c.cloudinary_id,
      })));
      toast('Category order updated', 'success');
      load();
    } catch { toast('Reorder failed', 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-moss">{cats.length} categories — use the arrows to set the display order (top = first)</p>
        <button onClick={() => setEditing({})} className="btn-primary"><Plus size={14} /> ADD CATEGORY</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c, i) => (
          <div key={c.id} className="card p-4 flex items-center gap-3">
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="btn-ghost !py-1 !px-2 disabled:opacity-30 disabled:cursor-not-allowed" title="Move up"><ArrowUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="btn-ghost !py-1 !px-2 disabled:opacity-30 disabled:cursor-not-allowed" title="Move down"><ArrowDown size={14} /></button>
            </div>
            <img src={c.image_url} alt="" className="w-14 h-14 rounded-xl object-cover bg-subcard shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-pine truncate">{c.name}</p>
              <p className="text-[11px] text-moss">{c.product_count} products</p>
              <span className="pill bg-pine/10 text-pine text-[9px] mt-1 inline-block">#{c.display_order} · {c.status}</span>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setEditing(JSON.parse(JSON.stringify(c)))} className="btn-ghost !py-1.5 !px-2"><Pencil size={13} /></button>
              <button onClick={() => remove(c)} className="btn-ghost !py-1.5 !px-2 hover:!text-crimson"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
      {editing && <CategoryModal category={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function CategoryModal({ category, onClose, onSave }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: category.name || '', slug: category.slug || '', description: category.description || '',
    image_url: category.image_url || '', display_order: category.display_order ?? 1, status: category.status || 'ACTIVE', is_hidden: category.is_hidden || false,
  });
  const fileRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const upload = (file) => {
    const fd = new FormData();
    fd.append('file', file);
    apiUpload('/media/upload', fd).then((r) => { setForm((f) => ({ ...f, image_url: r.secure_url })); toast('Image uploaded', 'success'); }).catch(() => toast('Upload failed', 'error'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone">
          <h2 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">{category?.id ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="btn-ghost !p-2"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-4 items-center">
            <img src={form.image_url} alt="" className="w-20 h-20 rounded-xl object-cover bg-subcard shrink-0" />
            <button onClick={() => fileRef.current?.click()} className="btn-outline !py-2"><Upload size={13} /> UPLOAD IMAGE</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </div>
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set('name')} /></div>
          <div><label className="label">Slug</label><input className="input" value={form.slug} onChange={set('slug')} /></div>
          <div><label className="label">Description</label><textarea rows={2} className="input" value={form.description} onChange={set('description')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Display Order</label><input type="number" className="input" value={form.display_order} onChange={set('display_order')} /></div>
            <div><label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>{['ACTIVE', 'ARCHIVED'].map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-moss">
            <input type="checkbox" className="accent-crimson" checked={form.is_hidden} onChange={set('is_hidden')} /> Hidden from storefront
          </label>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-outline flex-1">CANCEL</button>
            <button onClick={() => onSave(form)} className="btn-primary flex-1">SAVE</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- TAB 5: ANALYTICS ----------------
const RANGES = [
  { label: 'Today', days: 1 }, { label: 'Yesterday', days: 2 }, { label: 'Last 7 Days', days: 7 }, { label: 'Last 30 Days', days: 30 }, { label: 'Last 90 Days', days: 90 },
];

function AnalyticsTab({ settings }) {
  const { toast } = useToast();
  const [range, setRange] = useState(RANGES[3]);
  const [data, setData] = useState(null);
  const [live, setLive] = useState([]);
  const [liveOn, setLiveOn] = useState(true);
  const [visitors, setVisitors] = useState([]);
  const [profile, setProfile] = useState(null);

  const loadOverview = useCallback(async (r) => {
    try { setData(await apiGet('/analytics/overview', { days: r.days })); } catch { toast('Failed to load analytics', 'error'); }
  }, [toast]);

  const loadVisitors = useCallback(async () => {
    try { setVisitors(await apiGet('/analytics/visitors')); } catch {}
  }, []);

  useEffect(() => {
    loadOverview(range);
    loadVisitors();
  }, [range, loadOverview, loadVisitors]);

  useEffect(() => {
    if (!liveOn) return;
    const poll = async () => { try { setLive(await apiGet('/analytics/live')); } catch {} };
    poll();
    const id = setInterval(poll, 6000);
    return () => clearInterval(id);
  }, [liveOn]);

  if (!data) return <div className="py-20 text-center"><Loader2 size={26} className="animate-spin text-moss mx-auto" /></div>;

  const deviceColors = ['#8B0000', '#3E4A3E', '#3B82F6', '#F59E0B', '#8B5CF6'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button key={r.label} onClick={() => setRange(r)} className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${range.label === r.label ? 'bg-pine text-canvas' : 'bg-white text-moss border border-stone/60 hover:text-pine'}`}>{r.label}</button>
        ))}
        <button onClick={() => setLiveOn(!liveOn)} className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider ${liveOn ? 'bg-emerald-500/10 text-emerald-600' : 'bg-white text-moss border border-stone/60'}`}>
          {liveOn ? <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span> : <Circle size={12} />}
          LIVE FEED
        </button>
      </div>

      <div className="card p-5">
        <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-4">Live Activity Stream</h3>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {live.map((e, i) => (
            <div key={e.id || i} className="flex items-center gap-3 text-sm bg-subcard/60 rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-crimson shrink-0" />
              <span className="pill text-[9px] shrink-0" style={{ background: (e.event_type === 'pageview' ? '#3B82F6' : e.event_type === 'cart_add' ? '#F59E0B' : e.event_type === 'checkout_step' ? '#10B981' : '#8B5CF6') + '1a', color: e.event_type === 'pageview' ? '#3B82F6' : e.event_type === 'cart_add' ? '#F59E0B' : e.event_type === 'checkout_step' ? '#10B981' : '#8B5CF6' }}>{e.event_type}</span>
              <span className="font-mono text-xs text-pine flex-1 truncate">{e.path}</span>
              <span className="text-[11px] text-moss shrink-0">{flagEmoji(e.country_code)} {e.country}</span>
              <span className="text-[10px] text-moss/50 shrink-0">{timeAgo(e.created_at)}</span>
            </div>
          ))}
          {live.length === 0 && <p className="text-sm text-moss/60 text-center py-4">No live events yet.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-4">Traffic & Pageviews</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.timeline}>
              <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B0000" stopOpacity={0.35} /><stop offset="100%" stopColor="#8B0000" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#687268" />
              <YAxis tick={{ fontSize: 10 }} stroke="#687268" />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="events" name="Events" stroke="#8B0000" fill="url(#gA)" strokeWidth={2} />
              <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke="#3E4A3E" fill="#3E4A3E22" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-4">Orders & Revenue</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} stroke="#687268" />
              <YAxis tick={{ fontSize: 10 }} stroke="#687268" />
              <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="orders" name="Orders" fill="#8B0000" radius={[3, 3, 0, 0]} />
              <Bar dataKey="revenue" name="Revenue" fill="#3E4A3E" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-4">Device Breakdown</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie data={data.devices} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {(data.devices || []).map((_, i) => <Cell key={i} fill={deviceColors[i % deviceColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {(data.devices || []).map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-moss"><span className="w-2.5 h-2.5 rounded-full" style={{ background: deviceColors[i % deviceColors.length] }} />{d.name}</span>
                  <span className="font-bold text-pine">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-4">Geo Distribution</h3>
          <div className="space-y-2">
            {(data.countries || []).map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{flagEmoji(c.country_code)}</span>
                <span className="text-sm text-pine flex-1">{c.country}</span>
                <div className="w-32 bg-subcard rounded-full h-2"><div className="h-full bg-crimson rounded-full" style={{ width: Math.max(4, (c.visitors / (data.countries[0]?.visitors || 1)) * 100) + '%' }} /></div>
                <span className="text-xs font-bold text-pine w-12 text-right">{c.visitors}</span>
              </div>
            ))}
            {(data.countries || []).length === 0 && <p className="text-sm text-moss/60">No visitor data yet.</p>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Visitor Sessions</h3>
          <button onClick={loadVisitors} className="btn-ghost !py-2 text-[10px]"><RefreshCw size={12} /> REFRESH</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-moss border-b border-stone">
                <th className="py-2 pr-3">Visitor</th><th className="py-2 pr-3">Country</th><th className="py-2 pr-3">Device</th><th className="py-2 pr-3">Browser</th><th className="py-2 pr-3">Pages</th><th className="py-2 pr-3">Duration</th><th className="py-2">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id} onClick={() => setProfile(v)} className="border-b border-stone/40 last:border-0 cursor-pointer hover:bg-subcard/50">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-pine text-canvas text-[10px] font-bold flex items-center justify-center">{v.user_name?.[0] || 'A'}</span>
                      <span className="font-mono text-xs text-pine">{v.session_id}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-moss">{flagEmoji(v.country_code)} {v.country}</td>
                  <td className="py-2.5 pr-3 text-moss">{v.device_type}</td>
                  <td className="py-2.5 pr-3 text-moss">{v.browser}</td>
                  <td className="py-2.5 pr-3 font-bold text-pine">{v.page_views}</td>
                  <td className="py-2.5 pr-3 text-moss">{v.duration_seconds}s</td>
                  <td className="py-2.5 text-xs text-moss">{timeAgo(v.last_activity_at)}</td>
                </tr>
              ))}
              {visitors.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-moss text-sm">No visitor sessions recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {profile && <VisitorProfileDrawer session={profile} onClose={() => setProfile(null)} settings={settings} />}
    </div>
  );
}

function VisitorProfileDrawer({ session, onClose, settings }) {
  const [events, setEvents] = useState([]);
  useEffect(() => { apiGet(`/analytics/visitor-profile/${session.id}`).then((d) => setEvents(d.events)).catch(() => {}); }, [session.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-white overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone sticky top-0 bg-white z-10">
          <h2 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Visitor Profile</h2>
          <button onClick={onClose} className="btn-ghost !p-2"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-subcard rounded-xl p-4 text-center">
            <span className="w-14 h-14 rounded-full bg-pine text-canvas text-xl font-bold flex items-center justify-center mx-auto">{session.user_name?.[0] || 'V'}</span>
            <p className="font-bold text-pine mt-2">{session.user_name || 'Anonymous Visitor'}</p>
            {session.user_email && <p className="text-xs text-moss">{session.user_email}</p>}
            <p className="text-xs text-moss mt-1">{flagEmoji(session.country_code)} {session.country} · {session.device_type} · {session.browser}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="card p-3"><p className="text-lg font-bold text-pine">{session.page_views}</p><p className="text-[10px] uppercase tracking-widest text-moss">Pages</p></div>
            <div className="card p-3"><p className="text-lg font-bold text-pine">{session.duration_seconds}s</p><p className="text-[10px] uppercase tracking-widest text-moss">Duration</p></div>
            <div className="card p-3"><p className="text-lg font-bold text-pine">{session.language}</p><p className="text-[10px] uppercase tracking-widest text-moss">Lang</p></div>
          </div>
          <div>
            <h3 className="field-heading">Journey Timeline</h3>
            <div className="space-y-0">
              {events.map((e, i) => (
                <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                  <div className="flex flex-col items-center">
                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${e.event_type === 'pageview' ? 'bg-sky-500' : e.event_type === 'cart_add' ? 'bg-amber-500' : e.event_type === 'checkout_step' ? 'bg-emerald-500' : 'bg-crimson'}`} />
                    {i < events.length - 1 && <span className="w-px flex-1 bg-stone mt-1" />}
                  </div>
                  <div>
                    <span className="pill text-[9px]" style={{ background: (STATUS_COLORS[e.event_type] || '#8B5CF6') + '1a', color: STATUS_COLORS[e.event_type] || '#8B5CF6' }}>{e.event_type}</span>
                    <p className="font-mono text-xs text-pine mt-1">{e.path}</p>
                    {e.entity_name && <p className="text-[11px] text-moss">{e.entity_name}</p>}
                    <p className="text-[10px] text-moss/50 font-mono">{timeAgo(e.created_at)}</p>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="text-sm text-moss/60">No events recorded for this session.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- TAB 6: GEO-BLOCK ----------------
const COUNTRIES = [
  ['DE', 'Germany'], ['NL', 'Netherlands'], ['GB', 'United Kingdom'], ['US', 'United States'], ['FR', 'France'], ['ES', 'Spain'],
  ['IT', 'Italy'], ['PT', 'Portugal'], ['IE', 'Ireland'], ['BE', 'Belgium'], ['AT', 'Austria'], ['CH', 'Switzerland'],
  ['CA', 'Canada'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['JP', 'Japan'], ['KR', 'South Korea'], ['SG', 'Singapore'],
  ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'], ['QA', 'Qatar'], ['IL', 'Israel'], ['TR', 'Turkey'], ['IN', 'India'],
  ['BR', 'Brazil'], ['MX', 'Mexico'], ['AR', 'Argentina'], ['CL', 'Chile'], ['CO', 'Colombia'], ['PE', 'Peru'],
  ['NO', 'Norway'], ['SE', 'Sweden'], ['DK', 'Denmark'], ['FI', 'Finland'], ['IS', 'Iceland'], ['PL', 'Poland'],
  ['CZ', 'Czechia'], ['SK', 'Slovakia'], ['HU', 'Hungary'], ['RO', 'Romania'], ['BG', 'Bulgaria'], ['GR', 'Greece'],
  ['HR', 'Croatia'], ['SI', 'Slovenia'], ['RS', 'Serbia'], ['UA', 'Ukraine'], ['LT', 'Lithuania'], ['LV', 'Latvia'],
  ['EE', 'Estonia'], ['RU', 'Russia'], ['EG', 'Egypt'], ['MA', 'Morocco'], ['ZA', 'South Africa'], ['NG', 'Nigeria'],
  ['KE', 'Kenya'], ['TH', 'Thailand'], ['VN', 'Vietnam'], ['MY', 'Malaysia'], ['ID', 'Indonesia'], ['PH', 'Philippines'],
  ['PK', 'Pakistan'], ['BD', 'Bangladesh'], ['LK', 'Sri Lanka'], ['HK', 'Hong Kong'], ['TW', 'Taiwan'], ['CN', 'China'],
  ['RU', 'Russia'], ['CY', 'Cyprus'], ['MT', 'Malta'], ['LU', 'Luxembourg'], ['MC', 'Monaco'], ['AD', 'Andorra'],
  ['LI', 'Liechtenstein'], ['SM', 'San Marino'], ['VA', 'Vatican City'], ['AL', 'Albania'], ['BA', 'Bosnia and Herzegovina'],
  ['MK', 'North Macedonia'], ['ME', 'Montenegro'], ['MD', 'Moldova'], ['GE', 'Georgia'], ['AM', 'Armenia'], ['AZ', 'Azerbaijan'],
  ['KZ', 'Kazakhstan'], ['UZ', 'Uzbekistan'], ['MN', 'Mongolia'], ['NP', 'Nepal'], ['BT', 'Bhutan'], ['MV', 'Maldives'],
  ['BN', 'Brunei'], ['KH', 'Cambodia'], ['LA', 'Laos'], ['MM', 'Myanmar'], ['FJ', 'Fiji'], ['PG', 'Papua New Guinea'],
  ['JM', 'Jamaica'], ['TT', 'Trinidad and Tobago'], ['BS', 'Bahamas'], ['BB', 'Barbados'], ['CU', 'Cuba'], ['DO', 'Dominican Republic'],
  ['CR', 'Costa Rica'], ['PA', 'Panama'], ['GT', 'Guatemala'], ['HN', 'Honduras'], ['NI', 'Nicaragua'], ['SV', 'El Salvador'],
  ['BO', 'Bolivia'], ['EC', 'Ecuador'], ['UY', 'Uruguay'], ['PY', 'Paraguay'], ['VE', 'Venezuela'], ['GY', 'Guyana'],
  ['GH', 'Ghana'], ['SN', 'Senegal'], ['CI', 'Ivory Coast'], ['CM', 'Cameroon'], ['ET', 'Ethiopia'], ['TZ', 'Tanzania'],
  ['UG', 'Uganda'], ['ZW', 'Zimbabwe'], ['ZM', 'Zambia'], ['MW', 'Malawi'], ['MZ', 'Mozambique'], ['AO', 'Angola'],
  ['TN', 'Tunisia'], ['LY', 'Libya'], ['DZ', 'Algeria'], ['JO', 'Jordan'], ['LB', 'Lebanon'], ['KW', 'Kuwait'],
  ['BH', 'Bahrain'], ['OM', 'Oman'], ['YE', 'Yemen'], ['IR', 'Iran'], ['IQ', 'Iraq'], ['AF', 'Afghanistan'],
  ['BY', 'Belarus'], ['SC', 'Seychelles'], ['MU', 'Mauritius'], ['HT', 'Haiti'], ['PY', 'Paraguay'], ['SR', 'Suriname'],
  ['BZ', 'Belize'], ['GD', 'Grenada'], ['LC', 'Saint Lucia'], ['VC', 'Saint Vincent'], ['AG', 'Antigua and Barbuda'],
  ['GM', 'Gambia'], ['BF', 'Burkina Faso'], ['ML', 'Mali'], ['NE', 'Niger'], ['TD', 'Chad'], ['SD', 'Sudan'],
  ['SO', 'Somalia'], ['DJ', 'Djibouti'], ['ER', 'Eritrea'], ['GN', 'Guinea'], ['GW', 'Guinea-Bissau'], ['LR', 'Liberia'],
  ['SL', 'Sierra Leone'], ['TG', 'Togo'], ['BJ', 'Benin'], ['GA', 'Gabon'], ['CG', 'Republic of the Congo'],
  ['CD', 'DR Congo'], ['SS', 'South Sudan'], ['RW', 'Rwanda'], ['BI', 'Burundi'], ['MG', 'Madagascar'],
  ['CV', 'Cape Verde'], ['KM', 'Comoros'], ['ST', 'Sao Tome'], ['GL', 'Greenland'], ['FO', 'Faroe Islands'],
].filter((c, i, arr) => arr.findIndex((x) => x[0] === c[0]) === i);

function GeoBlockTab({ settings }) {
  const { toast } = useToast();
  const [rules, setRules] = useState(null);
  const [logs, setLogs] = useState([]);
  const [picker, setPicker] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r, l] = await Promise.all([apiGet('/availability/rules'), apiGet('/availability/logs')]);
      setRules(r); setLogs(l);
    } catch { toast('Failed to load geo-block config', 'error'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const save = async (patch) => {
    try {
      const updated = await apiPut('/availability/rules', patch);
      setRules(updated);
      toast('Geo-blocking engine updated', 'success');
    } catch (e) { toast(e.message || 'Update failed', 'error'); }
  };

  if (!rules) return <div className="py-20 text-center"><Loader2 size={26} className="animate-spin text-moss mx-auto" /></div>;

  const set = (k) => (e) => save({ ...rules, [k]: e.target.value });

  const addCountry = (cc) => save({ ...rules, blocked_countries: [...(rules.blocked_countries || []).filter((x) => x !== cc), cc] });
  const removeCountry = (cc) => save({ ...rules, blocked_countries: (rules.blocked_countries || []).filter((x) => x !== cc) });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Engine Master Toggle</h3>
            <button onClick={() => save({ ...rules, is_enabled: !rules.is_enabled })} className={rules.is_enabled ? 'text-emerald-500' : 'text-moss'}>
              {rules.is_enabled ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
            </button>
          </div>
          <p className="text-xs text-moss leading-relaxed">{rules.is_enabled ? 'Restriction checking is ENABLED. Visitors from restricted regions will see the geo-block page.' : 'Restriction checking is DISABLED. All visitors are allowed.'}</p>
          <div className={`mt-3 pill ${rules.is_enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-subcard text-moss'}`}>{rules.is_enabled ? 'ACTIVE' : 'DISABLED'}</div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-3">Operating Mode</h3>
          <div className="grid grid-cols-2 gap-3">
            {[['ALLOW_ALL_EXCEPT_BLOCKED', 'Allow All Except Blocked', 'Blocks only the selected countries', ShieldAlert],
              ['BLOCK_ALL_EXCEPT_ALLOWED', 'Block All Except Allowed', 'Only selected countries may enter', ShieldCheck]].map(([val, label, desc, Icon]) => (
              <button key={val} onClick={() => save({ ...rules, mode: val })} className={`text-left border rounded-xl p-4 transition-all ${rules.mode === val ? 'border-crimson bg-crimson/5' : 'border-stone hover:border-crimson/40'}`}>
                <Icon size={18} className={rules.mode === val ? 'text-crimson' : 'text-moss'} />
                <p className="font-bold text-sm text-pine mt-2">{label}</p>
                <p className="text-[11px] text-moss mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Blocked Countries</h3>
          <button onClick={() => setPicker(true)} className="btn-primary !py-2"><Plus size={12} /> ADD COUNTRY</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(rules.blocked_countries || []).map((cc) => {
            const name = COUNTRIES.find((c) => c[0] === cc)?.[1] || cc;
            return (
              <span key={cc} className="pill bg-crimson/10 text-crimson flex items-center gap-1.5">
                {flagEmoji(cc)} {name} <span className="font-mono text-[9px] opacity-70">{cc}</span>
                <button onClick={() => removeCountry(cc)}><X size={11} /></button>
              </span>
            );
          })}
          {(rules.blocked_countries || []).length === 0 && <p className="text-xs text-moss/60">No countries blocked. Click "Add Country" to restrict regions.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-3">Region / IP Rules</h3>
          <p className="text-[11px] text-moss mb-2">Add custom regional keywords (e.g. "Kansas") or IP blocks (CIDR).</p>
          <div className="flex gap-2">
            <input className="input !py-2" placeholder="e.g. Kansas or 203.0.113.0/24"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  await save({ ...rules, blocked_regions: [...(rules.blocked_regions || []), e.target.value.trim()] });
                  e.target.value = '';
                }
              }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {(rules.blocked_regions || []).map((r, i) => (
              <span key={i} className="pill bg-subcard text-pine flex items-center gap-1.5">{r}<button onClick={() => save({ ...rules, blocked_regions: (rules.blocked_regions || []).filter((_, idx) => idx !== i) })}><X size={11} /></button></span>
            ))}
            {(rules.blocked_regions || []).length === 0 && <p className="text-xs text-moss/60">No region rules added.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-3">Restriction Page CMS</h3>
          <div className="space-y-3">
            <div><label className="label">Restriction Title</label><input className="input" value={rules.restriction_title} onChange={set('restriction_title')} onBlur={() => save({ ...rules })} /></div>
            <div><label className="label">Explanation Message</label><textarea rows={2} className="input" value={rules.restriction_message} onChange={set('restriction_message')} onBlur={() => save({ ...rules })} /></div>
            <div className="flex items-center justify-between border border-stone rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-moss"><LifeBuoyIcon size={14} /> Support Button</div>
              <button onClick={() => save({ ...rules, support_button_enabled: !rules.support_button_enabled })} className={rules.support_button_enabled ? 'text-emerald-500' : 'text-moss'}>{rules.support_button_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button>
            </div>
            {rules.support_button_enabled !== 0 && <div><label className="label">Support URL</label><input className="input" value={rules.support_button_url} onChange={set('support_button_url')} onBlur={() => save({ ...rules })} /></div>}
            <div className="flex items-center justify-between border border-stone rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-moss"><SendIcon size={14} /> Telegram Button</div>
              <button onClick={() => save({ ...rules, telegram_button_enabled: !rules.telegram_button_enabled })} className={rules.telegram_button_enabled ? 'text-emerald-500' : 'text-moss'}>{rules.telegram_button_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}</button>
            </div>
            {rules.telegram_button_enabled === 1 && <div><label className="label">Telegram URL</label><input className="input" value={rules.telegram_button_url} onChange={set('telegram_button_url')} onBlur={() => save({ ...rules })} /></div>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Live Access Audit Log</h3>
          <button onClick={load} className="btn-ghost !py-2 text-[10px]"><RefreshCw size={12} /> REFRESH</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-moss border-b border-stone">
                <th className="py-2 pr-3">Action</th><th className="py-2 pr-3">IP</th><th className="py-2 pr-3">Country</th><th className="py-2 pr-3">Path</th><th className="py-2 pr-3">Reason</th><th className="py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-stone/40 last:border-0">
                  <td className="py-2.5 pr-3">
                    <span className="pill" style={{ background: (l.action === 'ALLOWED' ? '#10B981' : '#EF4444') + '1a', color: l.action === 'ALLOWED' ? '#10B981' : '#EF4444' }}>{l.action}</span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-pine">{l.ip_address}</td>
                  <td className="py-2.5 pr-3 text-moss">{flagEmoji(l.country_code)} {l.country} <span className="text-[10px] font-mono">({l.country_code})</span></td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-moss">{l.path}</td>
                  <td className="py-2.5 pr-3 text-moss text-xs">{l.reason}</td>
                  <td className="py-2.5 text-xs text-moss">{timeAgo(l.created_at)}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-moss text-sm">No access attempts logged yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {picker && (
        <CountrySelectModal onClose={() => setPicker(false)} selected={rules.blocked_countries || []} onToggle={addCountry} />
      )}
    </div>
  );
}

function LifeBuoyIcon({ size = 14 }) { return <FileText size={size} />; }
function SendIcon({ size = 14 }) { return <Send size={size} />; }

function CountrySelectModal({ onClose, selected, onToggle }) {
  const [q, setQ] = useState('');
  const filtered = COUNTRIES.filter(([cc, name]) => !q || name.toLowerCase().includes(q.toLowerCase()) || cc.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone">
          <h2 className="font-serif font-bold uppercase tracking-[0.12em] text-pine">Select Countries</h2>
          <button onClick={onClose} className="btn-ghost !p-2"><X size={18} /></button>
        </div>
        <div className="px-6 py-3 border-b border-stone/60">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss" />
            <input autoFocus className="input !py-2 pl-9" placeholder="Search 200+ countries…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="px-6 py-2 text-[11px] text-moss font-bold uppercase tracking-widest">{filtered.length} countries · {selected.length} selected</div>
        <div className="overflow-y-auto px-3 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-1">
          {filtered.map(([cc, name]) => {
            const isSel = selected.includes(cc);
            return (
              <button key={cc} onClick={() => onToggle(cc)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isSel ? 'bg-crimson/10 text-crimson' : 'text-moss hover:bg-subcard hover:text-pine'}`}>
                <span className="text-base">{flagEmoji(cc)}</span>
                <span className="flex-1 truncate text-left">{name}</span>
                {isSel && <CheckCircle2 size={13} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------- TAB 7: MESSAGES ----------------
function MessagesTab() {
  const { toast } = useToast();
  const [msgs, setMsgs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try { setMsgs(await apiGet('/messages')); } catch { toast('Failed to load messages', 'error'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const filtered = msgs.filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()) || m.subject.toLowerCase().includes(search.toLowerCase()));

  const sendReply = async (m) => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const updated = await apiPost(`/messages/${m.id}/reply`, { message: reply });
      setMsgs((list) => list.map((x) => (x.id === m.id ? updated : x)));
      setReply('');
      toast('Reply sent', 'success');
    } catch { toast('Send failed', 'error'); }
    finally { setSending(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
      <div className="card p-4">
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss" />
          <input className="input !py-2 pl-9" placeholder="Search tickets…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
          {filtered.map((m) => (
            <button key={m.id} onClick={() => setSelected(m)} className={`w-full text-left rounded-xl p-3 border transition-all ${selected?.id === m.id ? 'border-crimson bg-crimson/5' : 'border-stone hover:border-crimson/40'}`}>
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-pine flex items-center gap-2">{m.name}{m.status === 'UNREAD' && <span className="w-2 h-2 rounded-full bg-crimson" />}</p>
                <span className="pill text-[9px]" style={{ background: (STATUS_COLORS[m.status] || '#888') + '1a', color: STATUS_COLORS[m.status] || '#888' }}>{m.status}</span>
              </div>
              <p className="text-sm text-moss truncate mt-0.5">{m.subject}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="pill bg-subcard text-moss text-[9px]">{m.category}</span>
                <span className="text-[10px] text-moss/50">{timeAgo(m.created_at)}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-center text-moss text-sm py-8">No messages found.</p>}
        </div>
      </div>

      <div className="card p-5">
        {!selected ? (
          <div className="py-24 text-center text-moss">
            <MessagesSquare size={36} className="mx-auto mb-3 text-stone" />
            <p className="font-semibold">Select a message to view the thread</p>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between border-b border-stone pb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-pine">{selected.subject}</h2>
                <p className="text-sm text-moss mt-1">{selected.name} · {selected.email} {selected.order_number && <span className="font-mono">· {selected.order_number}</span>}</p>
              </div>
              <span className="pill" style={{ background: (STATUS_COLORS[selected.status] || '#888') + '1a', color: STATUS_COLORS[selected.status] || '#888' }}>{selected.status}</span>
            </div>

            <div className="py-5 space-y-4">
              <div className="flex gap-3">
                <span className="w-9 h-9 rounded-full bg-pine text-canvas text-sm font-bold flex items-center justify-center shrink-0">{selected.name[0]}</span>
                <div className="bg-subcard rounded-xl rounded-tl-none px-4 py-3 max-w-[80%]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-moss mb-1">{selected.name} · {formatDate(selected.created_at)}</p>
                  <p className="text-sm text-pine leading-relaxed">{selected.message}</p>
                </div>
              </div>

              {(selected.replies || []).map((r, i) => (
                <div key={i} className="flex gap-3 justify-end">
                  <div className="bg-crimson/10 border border-crimson/20 rounded-xl rounded-tr-none px-4 py-3 max-w-[80%]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-crimson mb-1">Admin · {formatDate(r.at)}</p>
                    <p className="text-sm text-pine leading-relaxed">{r.body}</p>
                  </div>
                  <span className="w-9 h-9 rounded-full bg-crimson text-canvas text-sm font-bold flex items-center justify-center shrink-0">A</span>
                </div>
              ))}
            </div>

            <div className="border-t border-stone pt-4">
              <div className="flex gap-3">
                <textarea rows={3} className="input flex-1" placeholder="Write an admin reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <button onClick={() => sendReply(selected)} disabled={sending || !reply.trim()} className="btn-primary self-end !py-3">
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} SEND
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- TAB 8: SETTINGS & CMS ----------------
function SettingsTab({ settings }) {
  const { toast } = useToast();
  const [s, setS] = useState(settings);
  const [c, setC] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiGet('/cms').then(setC).catch(() => {}); }, []);

  const set = (k) => (e) => setS((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setCms = (k) => (e) => setC((f) => ({ ...f, [k]: e.target.value }));

  const saveAll = async () => {
    setSaving(true);
    try {
      await apiPut('/settings', s);
      if (c) await apiPut('/cms', c);
      toast('Settings saved — refresh to apply', 'success');
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  if (!c) return <div className="py-20 text-center"><Loader2 size={26} className="animate-spin text-moss mx-auto" /></div>;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="field-heading">Branding & Social</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Store Name</label><input className="input" value={s.store_name} onChange={set('store_name')} /></div>
          <div><label className="label">Tagline</label><input className="input" value={s.tagline} onChange={set('tagline')} /></div>
          <div><label className="label">Support Email</label><input className="input" value={s.support_email} onChange={set('support_email')} /></div>
          <div><label className="label">Announcement Bar Text</label><input className="input" value={s.announcement_text} onChange={set('announcement_text')} /></div>
          <div><label className="label">Telegram Channel URL</label><input className="input" value={s.telegram_channel_url} onChange={set('telegram_channel_url')} /></div>
          <div><label className="label">Telegram Display Name</label><input className="input" value={s.telegram_display_name} onChange={set('telegram_display_name')} /></div>
          <div><label className="label">Telegram CTA Copy</label><input className="input" value={s.telegram_cta} onChange={set('telegram_cta')} /></div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="field-heading">Currency Settings</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><label className="label">Currency Code</label><input className="input" value={s.currency_code} onChange={set('currency_code')} /></div>
          <div><label className="label">Currency Symbol</label><input className="input" value={s.currency_symbol} onChange={set('currency_symbol')} /></div>
          <div><label className="label">Symbol Position</label>
            <select className="input" value={s.symbol_position} onChange={set('symbol_position')}>{['before', 'after'].map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <div><label className="label">Decimal Places</label><input type="number" className="input" value={s.decimal_places} onChange={set('decimal_places')} /></div>
          <div><label className="label">Thousand Separator</label><input className="input" value={s.thousand_separator} onChange={set('thousand_separator')} /></div>
          <div><label className="label">Decimal Separator</label><input className="input" value={s.decimal_separator} onChange={set('decimal_separator')} /></div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="field-heading">Shipping & Tax</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="label">Free Shipping Minimum</label><input type="number" className="input" value={s.free_shipping_min} onChange={set('free_shipping_min')} /></div>
          <div><label className="label">Flat Delivery Fee</label><input type="number" className="input" value={s.flat_delivery_fee} onChange={set('flat_delivery_fee')} /></div>
          <div><label className="label">Tax Percentage</label><input type="number" className="input" value={s.tax_percent} onChange={set('tax_percent')} /></div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="field-heading">Homepage CMS Editor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Hero Headline</label><input className="input" value={c.hero_headline} onChange={setCms('hero_headline')} /></div>
          <div><label className="label">Hero Subtitle</label><input className="input" value={c.hero_subtitle} onChange={setCms('hero_subtitle')} /></div>
          <div><label className="label">Primary CTA Label</label><input className="input" value={c.primary_cta_label} onChange={setCms('primary_cta_label')} /></div>
          <div><label className="label">Primary CTA URL</label><input className="input" value={c.primary_cta_url} onChange={setCms('primary_cta_url')} /></div>
          <div><label className="label">Secondary CTA Label</label><input className="input" value={c.secondary_cta_label} onChange={setCms('secondary_cta_label')} /></div>
          <div><label className="label">Secondary CTA URL</label><input className="input" value={c.secondary_cta_url} onChange={setCms('secondary_cta_url')} /></div>
          <div className="sm:col-span-2"><label className="label">Announcement Text</label><input className="input" value={c.announcement_text} onChange={setCms('announcement_text')} /></div>
        </div>
        <div className="mt-4">
          <p className="label">Trust Badges ({c.trust_badges?.length || 0})</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(c.trust_badges || []).map((b, i) => (
              <div key={i} className="bg-subcard rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-moss">Badge {i + 1}</p>
                <input className="input !py-1.5 text-xs font-bold" value={b.title} onChange={(e) => setC((f) => ({ ...f, trust_badges: f.trust_badges.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)) }))} />
                <input className="input !py-1.5 text-xs" value={b.desc} onChange={(e) => setC((f) => ({ ...f, trust_badges: f.trust_badges.map((x, idx) => (idx === i ? { ...x, desc: e.target.value } : x)) }))} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={saveAll} disabled={saving} className="btn-primary !py-3.5 px-10">
        {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {saving ? 'SAVING…' : 'SAVE ALL SETTINGS'}
      </button>
    </div>
  );
}

// ---------------- TAB: STORIES ----------------
function StoriesTab() {
  const { toast } = useToast();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', media_url: '', caption: '', link_url: '', expires_at: '', active: true });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try { setStories(await apiGet('/stories')); } catch { toast('Failed to load stories', 'error'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm({ title: '', media_url: '', caption: '', link_url: '', expires_at: '', active: true });
  };

  const upload = (file) => {
    const fd = new FormData();
    fd.append('file', file);
    apiUpload('/media/upload', fd).then((r) => {
      setForm((f) => ({ ...f, media_url: r.secure_url }));
      toast('Media uploaded — attach link below', 'success');
    }).catch(() => toast('Upload failed', 'error'));
  };

  const save = async () => {
    if (!form.title.trim() || !form.media_url.trim()) { toast('Title and media are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        active: form.active ? 1 : 0,
      };
      if (editing) { await apiPut(`/stories/${editing.id}`, payload); toast('Story updated', 'success'); }
      else { await apiPost('/stories', payload); toast('Story created', 'success'); }
      resetForm();
      load();
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s) => {
    try { await apiPut(`/stories/${s.id}`, { active: s.active ? 0 : 1 }); load(); } catch { toast('Update failed', 'error'); }
  };

  const remove = async (s) => {
    try { await apiDelete(`/stories/${s.id}`); toast('Story deleted', 'success'); if (editing?.id === s.id) resetForm(); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  const edit = (s) => {
    setEditing(s);
    setForm({
      title: s.title, media_url: s.media_url, caption: s.caption || '', link_url: s.link_url || '',
      expires_at: s.expires_at ? s.expires_at.slice(0, 16) : '', active: Boolean(s.active),
    });
  };

  if (loading) return <div className="py-20 text-center"><Loader2 size={26} className="animate-spin text-moss mx-auto" /></div>;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="field-heading">{editing ? `Edit Story — ${editing.title}` : 'Create Story'}</h3>
          {editing && <button onClick={resetForm} className="btn-outline !py-1.5 text-[10px]"><X size={12} /> Cancel</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="label">Caption</label><input className="input" value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} /></div>
          <div><label className="label">Media URL (image or video)</label>
            <div className="flex gap-2">
              <input className="input font-mono !text-xs" value={form.media_url} onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))} placeholder="https://… or upload" />
              <input ref={fileRef} type="file" accept="image/*,video/mp4" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()} className="btn-outline !px-3 !py-2"><Upload size={14} /></button>
            </div>
            {form.media_url && (
              <div className="mt-2 w-24 h-24 rounded-lg overflow-hidden bg-subcard">
                {form.media_url.includes('.mp4') || form.media_url.includes('video') ? <video src={form.media_url} className="w-full h-full object-cover" muted /> : <img src={form.media_url} alt="preview" className="w-full h-full object-cover" />}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Link URL</label><input className="input" value={form.link_url} onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))} placeholder="/product/…" /></div>
            <div><label className="label">Expires At</label><input type="datetime-local" className="input" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setForm((f) => ({ ...f, active: !f.active }))} className="flex items-center gap-2 text-xs font-bold uppercase text-pine">
              {form.active ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} className="text-moss" />} Active
            </button>
            <button onClick={save} disabled={saving} className="btn-primary !py-2 ml-auto">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {editing ? 'UPDATE' : 'CREATE'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stories.map((s) => {
          const expired = s.expires_at && new Date(s.expires_at) < new Date();
          return (
            <div key={s.id} className={`card p-4 ${expired ? 'opacity-60' : ''}`}>
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-subcard">
                  {s.media_type === 'video' ? <video src={s.media_url} className="w-full h-full object-cover" muted /> : <img src={s.media_url} alt={s.title} className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-pine truncate">{s.title}</p>
                  <p className="text-[11px] text-moss line-clamp-2 mt-0.5">{s.caption || '—'}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-moss mt-1">
                    {expired ? 'EXPIRED' : s.expires_at ? `Until ${s.expires_at.slice(0, 10)}` : 'No expiry'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone/60">
                <button onClick={() => toggleActive(s)} className="flex items-center gap-1 text-[10px] font-bold uppercase text-moss hover:text-pine">
                  {s.active ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} className="text-moss" />} {s.active ? 'Live' : 'Paused'}
                </button>
                <button onClick={() => edit(s)} className="ml-auto p-1.5 rounded-lg bg-subcard text-moss hover:text-pine"><Pencil size={13} /></button>
                <button onClick={() => remove(s)} className="p-1.5 rounded-lg bg-crimson/10 text-crimson"><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>
      {stories.length === 0 && <div className="card p-10 text-center text-sm text-moss">No stories yet — create your first one above.</div>}
    </div>
  );
}

// ---------------- TAB: PAYMENTS ----------------
const PAYMENT_GROUPS = [
  { method: 'CRYPTO', label: 'Crypto Wallets', hint: 'Add one entry per coin: label (e.g. Bitcoin (BTC)) + wallet address.' },
  { method: 'WIRE', label: 'Bank Transfer', hint: 'Paste full bank details including IBAN in the value field. Free text allowed.' },
  { method: 'PAYPAL', label: 'PayPal', hint: 'Value can be a payment link or PayPal email plus custom text.' },
  { method: 'GIFT', label: 'Gift Cards', hint: 'One entry per gift-card type (Apple, Amazon, Google, Steam, Razer…). These appear as selectable brands at checkout.' },
];

function PaymentsTab() {
  const { toast } = useToast();
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeMethod, setActiveMethod] = useState('CRYPTO');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ method: 'CRYPTO', label: '', value: '', hint: '', active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setGroups(await apiGet('/payment-methods/admin')); } catch { toast('Failed to load payment methods', 'error'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ method: activeMethod, label: '', value: '', hint: '', active: true });

  const save = async () => {
    if (!form.label.trim() || !form.value.trim()) { toast('Label and value are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, method: form.method || activeMethod, active: form.active ? 1 : 0 };
      if (editing) { await apiPut(`/payment-methods/${editing.id}`, payload); toast('Entry updated', 'success'); }
      else { await apiPost('/payment-methods', payload); toast('Entry added', 'success'); }
      setEditing(null);
      resetForm();
      load();
    } catch { toast('Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await apiDelete(`/payment-methods/${id}`); toast('Entry deleted', 'success'); load(); }
    catch { toast('Delete failed', 'error'); }
  };

  const toggleActive = async (e) => {
    try { await apiPut(`/payment-methods/${e.id}`, { active: e.active ? 0 : 1 }); load(); } catch { toast('Update failed', 'error'); }
  };

  const edit = (e) => {
    setActiveMethod(e.method);
    setEditing(e);
    setForm({ method: e.method, label: e.label, value: e.value, hint: e.hint || '', active: Boolean(e.active) });
  };

  if (loading) return <div className="py-20 text-center"><Loader2 size={26} className="animate-spin text-moss mx-auto" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {PAYMENT_GROUPS.map((g) => (
          <button key={g.method} onClick={() => { setActiveMethod(g.method); setEditing(null); resetForm(); }}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider ${activeMethod === g.method ? 'bg-pine text-canvas' : 'bg-white text-moss hover:text-pine border border-stone/60'}`}>
            {g.label}
          </button>
        ))}
      </div>

      {PAYMENT_GROUPS.filter((g) => g.method === activeMethod).map((g) => (
        <div key={g.method} className="card p-5">
          <h3 className="field-heading">{g.label}</h3>
          <p className="text-[11px] text-moss mb-4">{g.hint}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div><label className="label">Label</label><input className="input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder={g.method === 'CRYPTO' ? 'Bitcoin (BTC)' : g.method === 'GIFT' ? 'Apple Gift Card' : 'Label'} /></div>
            <div><label className="label">{g.method === 'CRYPTO' ? 'Wallet Address / Value' : g.method === 'GIFT' ? 'Brand Key' : 'Value (link / text)'}</label>
              {g.method === 'WIRE'
                ? <textarea rows={3} className="input font-mono !text-xs" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={'Beneficiary: …\nIBAN: …\nBIC: …'} />
                : <input className="input font-mono !text-xs" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />}
            </div>
            <div className="sm:col-span-2"><label className="label">Hint / Custom Text (optional)</label><input className="input" value={form.hint} onChange={(e) => setForm((f) => ({ ...f, hint: e.target.value }))} /></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setForm((f) => ({ ...f, active: !f.active }))} className="flex items-center gap-2 text-xs font-bold uppercase text-pine">
              {form.active ? <ToggleRight size={20} className="text-emerald-600" /> : <ToggleLeft size={20} className="text-moss" />} {form.active ? 'Active' : 'Hidden'}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary !py-2 ml-auto">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {editing ? 'UPDATE ENTRY' : 'ADD ENTRY'}
            </button>
            {editing && <button onClick={() => { setEditing(null); resetForm(); }} className="btn-outline !py-2 text-[10px]">CANCEL</button>}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(groups[activeMethod] || []).map((e) => (
          <div key={e.id} className={`card p-4 ${e.active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-pine">{e.label}</p>
                <p className="font-mono text-[11px] text-moss break-all mt-1 whitespace-pre-line">{e.value}</p>
                {e.hint && <p className="text-[11px] text-moss/80 mt-1">{e.hint}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleActive(e)} className="p-1.5 rounded-lg bg-subcard text-moss hover:text-pine">{e.active ? <ToggleRight size={14} className="text-emerald-600" /> : <ToggleLeft size={14} />}</button>
                <button onClick={() => edit(e)} className="p-1.5 rounded-lg bg-subcard text-moss hover:text-pine"><Pencil size={13} /></button>
                <button onClick={() => remove(e.id)} className="p-1.5 rounded-lg bg-crimson/10 text-crimson"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
