import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, User, Activity, RefreshCw, Loader2, ShieldCheck, LogOut, Lock, ArrowLeft } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { useToast } from '../store/ToastContext.jsx';
import { apiGet, apiPost } from '../lib/api';
import { timeAgo } from '../lib/format';
import AdminCodeGate, { clearAdminGate } from '../components/AdminCodeGate.jsx';

export default function BotPanel() {
  const { user } = useApp();
  const navigate = useNavigate();

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    return (
      <div className="max-w-md mx-auto px-4 py-32 text-center">
        <Lock size={44} className="mx-auto text-crimson" />
        <h1 className="font-serif text-2xl font-bold text-pine mt-4">ADMIN ACCESS REQUIRED</h1>
        <p className="text-moss text-sm mt-3">Please sign in with an administrator account to access the bot center.</p>
        <button onClick={() => navigate('/')} className="btn-primary mt-6">BACK TO STORE</button>
      </div>
    );
  }

  return (
    <AdminCodeGate>
      <BotPanelBody />
    </AdminCodeGate>
  );
}

function BotPanelBody() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [webhookBusy, setWebhookBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [st, us] = await Promise.all([apiGet('/telegram/status'), apiGet('/telegram/users')]);
      setStatus(st); setUsers(us);
    } catch { toast('Failed to load Telegram data', 'error'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const registerWebhook = async (clear) => {
    setWebhookBusy(true);
    try {
      const res = await apiPost('/telegram/set-webhook', clear ? { url: '' } : {});
      if (res.ok) { toast(clear ? 'Webhook cleared' : 'Webhook registered — bot is now always-on', 'success'); load(); }
      else toast(res.error || 'Webhook failed', 'error');
    } catch { toast('Webhook request failed', 'error'); }
    finally { setWebhookBusy(false); }
  };

  const send = async () => {
    if (!text.trim()) { toast('Message is empty', 'error'); return; }
    setSending(true);
    try {
      const res = await apiPost('/telegram/broadcast', { message: text.trim() });
      toast(`Broadcast sent: ${res.sent} delivered${res.failed ? `, ${res.failed} failed` : ''}`, 'success');
      setText('');
    } catch { toast('Broadcast failed', 'error'); }
    finally { setSending(false); }
  };

  if (loading) return <div className="py-20 text-center"><Loader2 size={26} className="animate-spin text-moss mx-auto" /></div>;

  const live = status?.status === 'running';
  const wh = status?.webhook || {};
  const whRegistered = !!wh.url;

  return (
    <div className="min-h-screen bg-subcard/40">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pine/10 text-pine flex items-center justify-center"><Bot size={20} /></div>
            <div>
              <h1 className="font-serif text-xl font-bold text-pine leading-tight">BOT CENTER</h1>
              <p className="text-[11px] text-moss uppercase tracking-widest">Telegram bot management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {live && <span className="pill bg-emerald-500/10 text-emerald-600"><ShieldCheck size={11} /> BOT LIVE</span>}
            <button onClick={() => navigate('/admin')} className="btn-outline !py-2 text-[10px]"><ArrowLeft size={12} /> COMMAND CENTER</button>
            <button onClick={() => { clearAdminGate(); localStorage.removeItem('nb_token'); window.location.href = '/'; }} className="btn-outline !py-2 text-[10px]"><LogOut size={12} /> LOGOUT</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="card p-5 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-moss">Bot Status</p>
              <p className="text-2xl font-bold text-pine mt-1.5">{live ? 'ONLINE' : (status?.status || 'OFF')}</p>
              {status?.error && <p className="text-[11px] text-crimson mt-1">{status.error}</p>}
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: (live ? '#10B981' : '#EF4444') + '14', color: live ? '#10B981' : '#EF4444' }}><Activity size={18} /></div>
          </div>
          <div className="card p-5 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-moss">Bot Users</p>
              <p className="text-2xl font-bold text-pine mt-1.5">{status?.user_count ?? users.length}</p>
              <p className="text-[11px] text-moss mt-1">Registered users</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#8B5CF6' + '14', color: '#8B5CF6' }}><User size={18} /></div>
          </div>
          <div className="card p-5 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-moss">Last Start</p>
              <p className="text-2xl font-bold text-pine mt-1.5">{status?.last_start ? status.last_start.slice(11, 19) : '—'}</p>
              <p className="text-[11px] text-moss mt-1">{status?.last_start?.slice(0, 10) || 'never'}</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F59E0B' + '14', color: '#F59E0B' }}><Send size={18} /></div>
          </div>
        </div>

        <div className="card p-5 mt-5">
          <h3 className="field-heading flex items-center gap-2"><ShieldCheck size={15} className="text-crimson" /> Webhook — Always-On Mode</h3>
          <p className="text-[11px] text-moss mb-3">
            In production the bot runs on a Telegram webhook (no process to keep alive). Register it once here and the bot stays online 24/7.
            {!whRegistered && ' It is currently not registered — the bot is offline.'}
          </p>
          <div className="bg-subcard rounded-lg p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-moss">Webhook URL</span>
              {whRegistered
                ? <span className="pill bg-emerald-500/10 text-emerald-600"><ShieldCheck size={11} /> REGISTERED</span>
                : <span className="pill bg-red-500/10 text-red-600">NOT REGISTERED</span>}
            </div>
            <p className="font-mono text-xs text-pine break-all">{wh.url || '—'}</p>
            {wh.pending_update_count !== undefined && (
              <p className="text-[11px] text-moss">Pending updates: <span className="font-bold text-pine">{wh.pending_update_count}</span></p>
            )}
            {wh.last_error_message && (
              <p className="text-[11px] text-crimson">Last error: {wh.last_error_message}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button onClick={() => registerWebhook(false)} disabled={webhookBusy || whRegistered} className="btn-primary !py-2.5">
              {webhookBusy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {whRegistered ? 'WEBHOOK REGISTERED' : 'REGISTER WEBHOOK'}
            </button>
            {whRegistered && (
              <button onClick={() => registerWebhook(true)} disabled={webhookBusy} className="btn-outline !py-2.5">CLEAR WEBHOOK</button>
            )}
          </div>
        </div>

        <div className="card p-5 mt-5">
          <h3 className="field-heading flex items-center gap-2"><Send size={15} className="text-crimson" /> Mass Broadcast</h3>
          <p className="text-[11px] text-moss mb-3">Send a message to every registered bot user.</p>
          <textarea rows={4} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your announcement here…" />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={send} disabled={sending || !live} className="btn-primary !py-2.5">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {sending ? 'SENDING…' : 'BROADCAST TO ALL'}
            </button>
            {!live && <span className="text-[11px] font-bold uppercase text-crimson">Bot offline — broadcast unavailable</span>}
          </div>
        </div>

        <div className="card p-5 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="field-heading">Bot Users</h3>
            <button onClick={load} className="btn-outline !py-1.5 text-[10px]"><RefreshCw size={12} /> REFRESH</button>
          </div>
          {users.length === 0 ? (
            <p className="text-sm text-moss text-center py-8">No users have started the bot yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-moss border-b border-stone">
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Handle</th>
                    <th className="py-2 pr-4">Language</th>
                    <th className="py-2">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className="border-b border-stone/50">
                      <td className="py-2 pr-4 text-moss text-xs">{i + 1}</td>
                      <td className="py-2 pr-4 font-semibold text-pine">{(u.first_name || '') + (u.last_name ? ' ' + u.last_name : '') || '—'}</td>
                      <td className="py-2 pr-4 text-xs">{u.username ? <span className="font-mono text-crimson">@{u.username}</span> : <span className="text-moss">—</span>}</td>
                      <td className="py-2 pr-4 text-xs"><span className="pill bg-pine/10 text-pine">{u.language || 'EN'}</span></td>
                      <td className="py-2 text-xs text-moss">{u.last_active_at ? timeAgo(u.last_active_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
