import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useToast } from '../store/ToastContext';
import { apiPost } from '../lib/api';
import { t } from '../lib/i18n';

export default function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState('signin');
  const { login, register, trackEvent } = useApp();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await login(form.email, form.password);
        trackEvent('auth_login');
        toast(t('welcome_back'), 'success');
      } else {
        if (form.password !== form.confirm) { setError(t('passwords_match')); setBusy(false); return; }
        await register({ email: form.email, password: form.password, full_name: form.full_name });
        await login(form.email, form.password);
        trackEvent('auth_register');
        toast(t('account_created'), 'success');
      }
      onClose();
    } catch (err) {
      setError(err.message || t('something_went_wrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm anim-fade flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-canvas rounded-2xl shadow-lift anim-slide-right overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone">
          <h3 className="font-serif font-semibold uppercase tracking-[0.12em]">{t('nb_account')}</h3>
          <button onClick={onClose} className="p-1.5 text-moss hover:text-crimson"><X size={18} /></button>
        </div>

        <div className="flex border-b border-stone">
          {[['signin', t('sign_in')], ['register', t('create_account')]].map(([k, label]) => (
            <button key={k} onClick={() => { setMode(k); setError(''); }} className={`flex-1 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${mode === k ? 'text-crimson border-b-2 border-crimson' : 'text-moss hover:text-pine'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="px-6 py-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="label">{t('full_name')}</label>
              <input className="input" value={form.full_name} onChange={set('full_name')} required placeholder={t('ph_name')} />
            </div>
          )}
          <div>
            <label className="label">{t('email')}</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} required placeholder={t('ph_email')} />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <input className="input" type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" />
          </div>
          {mode === 'register' && (
            <div>
              <label className="label">{t('confirm_password')}</label>
              <input className="input" type="password" value={form.confirm} onChange={set('confirm')} required placeholder="••••••••" />
            </div>
          )}
          {mode === 'signin' && (
            <button type="button" className="text-[11px] font-semibold text-moss hover:text-crimson uppercase tracking-wider">{t('forgot_password')}</button>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            {mode === 'signin' ? t('sign_in') : t('create_account')}
          </button>
        </form>
      </div>
    </div>
  );
}
