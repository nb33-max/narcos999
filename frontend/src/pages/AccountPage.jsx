import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Heart, MessageSquare, User, LogOut, ShieldAlert } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { useWishlist } from '../store/WishlistContext.jsx';
import { useToast } from '../store/ToastContext.jsx';
import { apiGet } from '../lib/api';
import { formatCurrency, STATUS_COLORS, formatDate } from '../lib/format';
import { t } from '../lib/i18n';

const TABS = [
  { key: 'orders', labelKey: 'orders', icon: Package },
  { key: 'saved', labelKey: 'saved_items', icon: Heart },
  { key: 'messages', labelKey: 'messages', icon: MessageSquare },
  { key: 'profile', labelKey: 'profile', icon: User },
];

export default function AccountPage() {
  const { user, logout, settings } = useApp();
  const { items: savedItems } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState({ phone: '', shipping_address: '' });

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    setProfile({ phone: user.phone || '', shipping_address: user.shipping_address || '' });
    apiGet('/orders', { email: user.email }).then(setOrders).catch(() => {});
    apiGet('/messages').then((msgs) => setMessages(msgs.filter((m) => m.email === user.email))).catch(() => {});
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast(t('logged_out'), 'info');
    navigate('/');
  };

  const initials = (user.full_name || 'NB').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Banner */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <span className="w-16 h-16 bg-pine text-canvas rounded-2xl flex items-center justify-center font-serif text-xl font-bold">{initials}</span>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-pine">{user.full_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`pill ${isAdmin ? 'bg-crimson/10 text-crimson' : 'bg-emerald-500/10 text-emerald-600'}`}>{isAdmin ? t('administrator') : t('customer_role')}</span>
            <span className="text-sm text-moss">{user.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="btn-primary !py-2.5 text-[10px]"><ShieldAlert size={14} /> {t('admin_portal')}</Link>
          )}
          <button onClick={handleLogout} className="btn-outline !py-2.5 text-[10px]"><LogOut size={14} /> {t('logout')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 mt-8">
        {/* Sidebar */}
        <aside className="card h-fit p-2">
          {TABS.map((tb) => {
            const Icon = tb.icon;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${tab === tb.key ? 'bg-pine text-canvas' : 'text-moss hover:bg-subcard'}`}>
                <Icon size={16} /> {t(tb.labelKey)}
                {tb.key === 'messages' && messages.some((m) => m.status === 'UNREAD') && <span className="ml-auto w-2 h-2 bg-crimson rounded-full pulse-dot" />}
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <div>
          {tab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 && (
                <div className="card p-10 text-center">
                  <Package size={36} className="mx-auto text-stone" />
                  <p className="mt-3 text-moss text-sm font-semibold uppercase tracking-widest">{t('no_orders')}</p>
                </div>
              )}
              {orders.map((o) => (
                <div key={o.id} className="card p-5">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <p className="font-mono font-bold text-pine">{o.order_number}</p>
                      <p className="text-[11px] text-moss mt-0.5">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="pill" style={{ background: (STATUS_COLORS[o.status] || '#888') + '1a', color: STATUS_COLORS[o.status] || '#888' }}>{o.status}</span>
                      <span className="font-bold text-crimson">{formatCurrency(o.total_amount, settings)}</span>
                    </div>
                  </div>
                  {(o.items || []).map((it, i) => (
                    <div key={i} className="flex items-center gap-3 mt-4 bg-subcard rounded-lg px-3 py-2">
                      <span className="text-sm font-semibold text-pine">{it.name}</span>
                      {it.tier && <span className="pill bg-white text-moss">{it.tier}</span>}
                      <span className="ml-auto text-xs text-moss">×{it.quantity}</span>
                      <span className="text-xs font-bold">{formatCurrency(it.total, settings)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === 'saved' && (
            <div className="card p-6">
              {savedItems.length === 0 ? (
                <p className="text-center text-moss py-8 text-sm font-semibold uppercase tracking-widest">{t('nothing_saved')}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {savedItems.map((p) => (
                    <Link key={p.id} to={`/product/${p.slug}`} className="group">
                      <img src={p.media?.[0]?.secure_url} alt={p.name} className="w-full aspect-square object-cover rounded-xl bg-subcard" />
                      <p className="text-sm font-semibold text-pine mt-2 group-hover:text-crimson transition-colors">{p.name}</p>
                      <p className="text-xs font-bold text-crimson">{formatCurrency(p.price, settings)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'messages' && (
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="card p-10 text-center">
                  <MessageSquare size={36} className="mx-auto text-stone" />
                  <p className="mt-3 text-moss text-sm font-semibold uppercase tracking-widest">{t('no_support_messages')}</p>
                  <Link to="/contact" className="btn-primary mt-5 !py-2 text-[10px]">{t('contact_admin')}</Link>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="pill" style={{ background: (STATUS_COLORS[m.status] || '#888') + '1a', color: STATUS_COLORS[m.status] || '#888' }}>{m.status}</span>
                    <span className="text-[11px] text-moss">{formatDate(m.created_at)}</span>
                  </div>
                  <h4 className="font-semibold text-pine mt-3">{m.subject}</h4>
                  <p className="text-sm text-moss mt-1">{m.message}</p>
                  <div className="mt-3 pl-4 border-l-2 border-crimson/30 space-y-2">
                    {(m.replies || []).map((r, i) => (
                      <div key={i} className="bg-subcard rounded-lg px-3 py-2 text-sm">
                        <span className="text-[10px] font-bold uppercase text-crimson">{t('contact_admin')}</span>
                        <p className="text-moss">{r.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'profile' && (
            <div className="card p-6 max-w-lg">
              <p className="label">{t('full_name')}</p>
              <input className="input mb-4" defaultValue={user.full_name} />
              <p className="label">{t('email')}</p>
              <input className="input mb-4" defaultValue={user.email} disabled />
              <p className="label">{t('phone_number')}</p>
              <input className="input mb-4" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder={t('ph_phone')} />
              <p className="label">{t('shipping_address')}</p>
              <textarea className="input mb-5" rows={3} value={profile.shipping_address} onChange={(e) => setProfile((p) => ({ ...p, shipping_address: e.target.value }))} placeholder={t('address_ph')} />
              <div className="flex gap-3">
                <button onClick={() => toast(t('profile_updated'), 'success')} className="btn-primary !py-2.5 text-[10px]">{t('save_changes')}</button>
                <button onClick={() => toast(t('reset_link_sent'), 'info')} className="btn-outline !py-2.5 text-[10px]">{t('reset_password')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
