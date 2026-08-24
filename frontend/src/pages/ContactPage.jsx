import { useState } from 'react';
import { Send, Mail, MessageCircle, Bot, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { apiPost } from '../lib/api';
import { useToast } from '../store/ToastContext.jsx';
import { useApp } from '../store/AppContext.jsx';
import AuthModal from '../components/AuthModal.jsx';
import { t } from '../lib/i18n';
import { TELEGRAM_BOT_HANDLE, telegramBotUrl } from '../lib/telegram';

const CATEGORIES = [
  { value: 'Product Inquiry', key: 'subj_product' },
  { value: 'Order Support', key: 'subj_order' },
  { value: 'Bulk / Wholesale', key: 'subj_bulk' },
  { value: 'Press', key: 'subj_press' },
  { value: 'Other', key: 'subj_other' },
];

export default function ContactPage() {
  const { toast } = useToast();
  const { user, settings } = useApp();
  const [authOpen, setAuthOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', order_number: '', category: 'Product Inquiry', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) { toast(t('msg_required'), 'error'); return; }
    setSending(true);
    try {
      await apiPost('/messages', { ...form, user_id: user?.id || null });
      setSent(true);
      toast(t('msg_sent'), 'success');
    } catch {
      toast(t('msg_failed'), 'error');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <ShieldAlert size={52} className="mx-auto text-emerald-500" />
        <h1 className="font-serif text-2xl font-bold text-pine mt-4">{t('msg_received_title')}</h1>
        <p className="text-moss text-sm mt-3">{t('msg_received_body')}</p>
        <button onClick={() => setSent(false)} className="btn-outline mt-6">{t('msg_another')}</button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <ShieldAlert size={52} className="mx-auto text-crimson" />
        <h1 className="font-serif text-2xl font-bold text-pine mt-4">{t('msg_gate_title')}</h1>
        <p className="text-moss text-sm mt-3">{t('msg_gate_body')}</p>
        <div className="flex flex-col gap-3 mt-6">
          <button onClick={() => setAuthOpen(true)} className="btn-primary">{t('sign_in')}</button>
          <button onClick={() => setAuthOpen(true)} className="btn-outline">{t('create_account')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('discreet_support')}</p>
      <h1 className="section-title mb-8">{t('contact_admin')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <form onSubmit={submit} className="card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">{t('full_name')} *</label><input className="input" value={form.name} onChange={set('name')} placeholder={t('ph_name')} /></div>
            <div><label className="label">{t('email')} *</label><input className="input" type="email" value={form.email} onChange={set('email')} placeholder={t('ph_email')} /></div>
            <div><label className="label">{t('order_number_opt')}</label><input className="input font-mono uppercase" value={form.order_number} onChange={set('order_number')} placeholder={t('ph_order')} /></div>
            <div><label className="label">{t('category')}</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{t(c.key)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label">{t('subject')} *</label><input className="input" value={form.subject} onChange={set('subject')} placeholder={t('subject_placeholder')} /></div>
            <div className="sm:col-span-2"><label className="label">{t('message')} *</label><textarea rows={5} className="input" value={form.message} onChange={set('message')} placeholder={t('message_placeholder')} /></div>
          </div>
          <button type="submit" disabled={sending} className="btn-primary mt-5 w-full sm:w-auto">
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? t('sending') : t('send_message')}
          </button>
        </form>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-serif font-semibold uppercase tracking-[0.12em] mb-3">{t('direct_channels')}</h3>
            <a href="mailto:admin@narcosbay.com" className="flex items-center gap-3 py-2.5 border-b border-stone/50 text-sm font-semibold text-pine hover:text-crimson">
              <Mail size={16} className="text-crimson" /> admin@narcosbay.com
            </a>
            <a href="https://t.me/narcosbay_official" target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5 border-b border-stone/50 text-sm font-semibold text-pine hover:text-crimson">
              <MessageCircle size={16} className="text-crimson" /> @narcosbay_official
            </a>
            <a href={telegramBotUrl(settings)} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5 border-b border-stone/50 text-sm font-semibold text-pine hover:text-crimson">
              <Bot size={16} className="text-crimson" /> @{TELEGRAM_BOT_HANDLE}
            </a>
            <p className="flex items-center gap-3 py-2.5 text-sm font-semibold text-pine"><Clock size={16} className="text-crimson" /> {t('replies_within')}</p>
          </div>

          <div className="card p-5">
            <h3 className="font-serif font-semibold uppercase tracking-[0.12em] mb-3">{t('discretion_card_title')}</h3>
            <p className="text-sm text-moss leading-relaxed">{t('discretion_card_body')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
