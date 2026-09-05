import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck, Package, Bell, Heart, Mail } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useToast } from '../store/ToastContext';
import { apiGet } from '../lib/api';
import { t } from '../lib/i18n';

function GoogleButton({ clientId, locale, onToken }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (cancelled || !window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'popup',
        callback: (resp) => { if (resp?.credential) onToken(resp.credential); },
      });
      try {
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          logo_alignment: 'center',
          width: ref.current.offsetWidth || 320,
          text: 'continue_with',
          locale,
        });
      } catch {
        // ignore render errors; the account section simply stays blank
      }
    };
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      try { document.head.removeChild(script); } catch { /* noop */ }
    };
  }, [clientId, locale, onToken]);
  return <div ref={ref} className="w-full min-h-[44px]" />;
}

export default function AuthPage() {
  const { settings, user, lang, login, register, googleLogin, trackEvent } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedMode = params.get('mode') === 'register' ? 'register' : 'signin';
  const redirect = params.get('redirect') || '/account';
  const [mode, setMode] = useState(requestedMode);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [googleCfg, setGoogleCfg] = useState(null);

  useEffect(() => {
    let alive = true;
    apiGet('/auth/config').then((cfg) => { if (alive) setGoogleCfg(cfg || {}); }).catch(() => { if (alive) setGoogleCfg({}); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, redirect, navigate]);

  useEffect(() => { setMode(requestedMode); }, [requestedMode]);

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
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || t('something_went_wrong'));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = useCallback(async (idToken) => {
    setBusy(true);
    setError('');
    try {
      await googleLogin(idToken);
      trackEvent('auth_google_login');
      toast(t('welcome_back'), 'success');
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || t('google_signin_failed'));
    } finally {
      setBusy(false);
    }
  }, [googleLogin, trackEvent, toast, navigate, redirect]);

  const storeName = settings?.store_name || 'NARCOS BAY';
  const brand = (
    <Link to="/" className="flex items-center gap-3 shrink-0">
      <span className="w-10 h-10 bg-canvas text-pine flex items-center justify-center font-serif font-bold text-sm">NB</span>
      <span className="flex flex-col leading-none">
        <span className="font-serif text-base font-bold tracking-[0.1em]">{storeName}</span>
        <span className="text-[9px] tracking-[0.18em] text-canvas/60 mt-0.5 uppercase">{t('shop_the_collection')}</span>
      </span>
    </Link>
  );

  const features = [
    { icon: Package, label: t('orders') },
    { icon: Heart, label: t('saved_items') },
    { icon: Bell, label: t('notifications') },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 lg:py-16">
      <div className="card overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between bg-pine text-canvas p-10">
          {brand}
          <div className="mt-10 space-y-6">
            <h1 className="font-serif text-3xl font-bold uppercase tracking-[0.08em] leading-tight">
              {t('nb_account')}
            </h1>
            <p className="text-sm text-canvas/70 leading-relaxed">{t('auth_page_sub')}</p>
          </div>
          <div className="mt-10 space-y-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-canvas/85">
                <span className="w-8 h-8 bg-canvas/10 border border-canvas/20 rounded-full flex items-center justify-center"><Icon size={15} /></span>
                {label}
              </div>
            ))}
            <div className="flex items-center gap-3 text-sm text-canvas/85">
              <span className="w-8 h-8 bg-canvas/10 border border-canvas/20 rounded-full flex items-center justify-center"><ShieldCheck size={15} /></span>
              {t('age_private')}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 lg:p-10">
          <div className="lg:hidden flex justify-center mb-8">{brand}</div>

          <div className="flex border border-stone rounded-xl overflow-hidden mb-6">
            {[['signin', t('sign_in')], ['register', t('create_account')]].map(([k, label]) => (
              <button key={k} type="button" onClick={() => { setMode(k); setError(''); }} className={`flex-1 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${mode === k ? 'bg-pine text-canvas' : 'text-moss hover:text-pine'}`}>
                {label}
              </button>
            ))}
          </div>

          <p className="text-sm text-moss mb-6">{t('auth_page_sub')}</p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">{t('full_name')}</label>
                <input className="input" value={form.full_name} onChange={set('full_name')} required placeholder={t('ph_name')} />
              </div>
            )}
            <div>
              <label className="label">{t('email')}</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-moss/50 pointer-events-none" />
                <input className="input !pl-9" type="email" value={form.email} onChange={set('email')} required placeholder={t('ph_email')} />
              </div>
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
              <div className="text-right">
                <button type="button" className="text-[11px] font-semibold text-moss hover:text-crimson uppercase tracking-wider">{t('forgot_password')}</button>
              </div>
            )}
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              {mode === 'signin' ? t('sign_in') : t('create_account')}
            </button>
          </form>

          {googleCfg && googleCfg.google_client_id && (
            <>
              <div className="flex items-center gap-3 my-6">
                <span className="h-px flex-1 bg-stone" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-moss">{t('or_continue_with')}</span>
                <span className="h-px flex-1 bg-stone" />
              </div>
              <GoogleButton
                key={lang}
                clientId={googleCfg.google_client_id}
                locale={lang.toLowerCase()}
                onToken={handleGoogle}
              />
            </>
          )}

          <p className="text-[11px] text-moss/80 leading-relaxed mt-6">{t('auth_agree_note')}</p>
          <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-pine hover:text-crimson mt-4">
            {t('back_to_store')}
          </Link>
        </div>
      </div>
    </div>
  );
}
