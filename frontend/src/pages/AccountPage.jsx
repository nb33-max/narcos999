import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, Heart, MessageSquare, User, LogOut, ShieldAlert, Bell, Send, CheckCircle2 } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { useWishlist } from '../store/WishlistContext.jsx';
import { useToast } from '../store/ToastContext.jsx';
import { apiGet, apiPost } from '../lib/api';
import { formatCurrency, STATUS_COLORS, formatDate } from '../lib/format';
import { t } from '../lib/i18n';

const TABS = [
  { key: 'orders', labelKey: 'orders', icon: Package },
  { key: 'notifications', labelKey: 'notifications', icon: Bell },
  { key: 'saved', labelKey: 'saved_items', icon: Heart },
  { key: 'messages', labelKey: 'messages', icon: MessageSquare },
  { key: 'profile', labelKey: 'profile', icon: User },
];

const URL_RE = /https?:\/\/[^\s<]+/;
function linkify(text) {
  return String(text).split(/(https?:\/\/[^\s<]+)/g).map((part, i) =>
    URL_RE.test(part)
      ? <a key={i} href={part} target="_blank" rel="noreferrer" className="text-crimson underline break-all">{part}</a>
      : part
  );
}

function OrderComments({ orderId }) {
  const [comments, setComments] = useState(null);
  useEffect(() => {
    apiGet(`/orders/${orderId}/comments`).then(setComments).catch(() => setComments([]));
  }, [orderId]);
  if (!comments) return null;
  if (comments.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-moss">{t('order_updates')}</p>
      {comments.map((c) => (
        <div key={c.id} className="bg-subcard rounded-lg px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-crimson">{c.author_name || t('contact_admin')}</span>
            <span className="text-[10px] text-moss">{formatDate(c.created_at)}</span>
          </div>
          <p className="text-moss mt-1 leading-relaxed">{linkify(c.message)}</p>
        </div>
      ))}
    </div>
  );
}

export default function AccountPage() {
  const { user, logout, settings, notifications, unreadCount, markNotificationsRead, loadNotifications } = useApp();
  const { items: savedItems } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [profile, setProfile] = useState({ phone: '', shipping_address: '' });
  const [tgState, setTgState] = useState(null);

  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('tab');
    if (q && TABS.some((tb) => tb.key === q)) setTab(q);
  }, [location.search]);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    setProfile({ phone: user.phone || '', shipping_address: user.shipping_address || '' });
    apiGet('/orders', { email: user.email }).then(setOrders).catch(() => {});
    apiGet('/messages').then((msgs) => setMessages(msgs.filter((m) => m.email === user.email))).catch(() => {});
    apiPost('/account/telegram-link').then(setTgState).catch(() => setTgState({ linked: false }));
    loadNotifications();
  }, [user, navigate, loadNotifications]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast(t('logged_out'), 'info');
    navigate('/');
  };

  const handleLinkTelegram = async () => {
    const res = await apiPost('/account/telegram-link').catch(() => null);
    if (res && res.url) {
      setTgState(res);
      window.open(res.url, '_blank', 'noopener');
      toast(t('telegram_link_hint'), 'info');
    } else if (res && res.linked) {
      setTgState(res);
      toast(t('telegram_already_linked'), 'success');
    } else {
      toast(t('something_went_wrong'), 'error');
    }
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
                {tb.key === 'notifications' && unreadCount > 0 && <span className="ml-auto min-w-4 h-4 px-1 bg-crimson text-canvas text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
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
                  {o.tracking_number && (
                    <p className="mt-3 text-xs text-moss">
                      <span className="font-bold uppercase tracking-wider">{t('tracking_number')}:</span>{' '}
                      <span className="font-mono text-pine">{linkify(o.tracking_number)}</span>
                    </p>
                  )}
                  <OrderComments orderId={o.id} />
                </div>
              ))}
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-3">
              {notifications.length === 0 && (
                <div className="card p-10 text-center">
                  <Bell size={36} className="mx-auto text-stone" />
                  <p className="mt-3 text-moss text-sm font-semibold uppercase tracking-widest">{t('no_notifications')}</p>
                </div>
              )}
              {notifications.map((n) => (
                <div key={n.id} className={`card p-4 ${n.read ? 'opacity-70' : 'border-crimson/30'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-pine text-sm">{n.title}</p>
                      {n.body && <p className="text-sm text-moss mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-moss mt-1">{formatDate(n.created_at)}</p>
                    </div>
                    {n.link && (
                      <Link to={n.link} onClick={() => markNotificationsRead([n.id])} className="btn-outline !py-1.5 text-[9px] shrink-0">{t('view_order')}</Link>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length > 0 && unreadCount > 0 && (
                <button onClick={() => markNotificationsRead()} className="btn-outline !py-2 text-[10px] w-full">{t('mark_all_read')}</button>
              )}
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
                      <img src={p.media?.[0]?.media_type === 'video' ? p.media?.[0]?.poster_url : p.media?.[0]?.secure_url} alt={p.name} className="w-full aspect-square object-cover rounded-xl bg-subcard" />
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
            <div className="space-y-6 max-w-lg">
              <div className="card p-6">
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

              <div className="card p-6">
                <p className="font-semibold text-pine">{t('telegram_notifications')}</p>
                <p className="text-sm text-moss mt-1">{t('telegram_notifications_hint')}</p>
                {tgState && tgState.linked ? (
                  <p className="mt-3 inline-flex items-center gap-2 pill bg-emerald-500/10 text-emerald-600">
                    <CheckCircle2 size={14} /> {t('telegram_already_linked')}
                  </p>
                ) : (
                  <button onClick={handleLinkTelegram} className="btn-primary mt-3 !py-2.5 text-[10px]"><Send size={14} /> {t('telegram_link_account')}</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
