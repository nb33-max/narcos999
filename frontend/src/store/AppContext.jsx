import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiGet, apiPut, apiPost, getToken, setToken } from '../lib/api';
import { setFormatSettings } from '../lib/format';
import { setLang, getLang, LANGS } from '../lib/i18n';

const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

let sessionId = localStorage.getItem('nb_session') || null;
export function getSessionId() {
  if (!sessionId) {
    sessionId = 's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('nb_session', sessionId);
  }
  return sessionId;
}

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [cms, setCms] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stories, setStories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [availability, setAvailability] = useState({ allowed: true });
  const [lang, setLangState] = useState(getLang());
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([apiGet('/settings'), apiGet('/cms')]);
      setSettings(s);
      setCms(c);
      setFormatSettings(s);
    } catch (e) {
      console.error('Failed loading settings', e);
    }
  }, []);

  const loadStories = useCallback(async () => {
    try { setStories(await apiGet('/stories/active', { viewer: getSessionId() })); } catch {}
  }, []);

  const loadPaymentMethods = useCallback(async () => {
    try { setPaymentMethods(await apiGet('/payment-methods')); } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSettings();
        const [cats, avail, sts, pms] = await Promise.all([apiGet('/categories'), apiGet('/availability/check'), apiGet('/stories/active', { viewer: getSessionId() }), apiGet('/payment-methods')]);
        if (!cancelled) { setCategories(cats); setAvailability(avail); setStories(sts); setPaymentMethods(pms); }
      } catch (e) {
        console.error('App init error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const tok = getToken();
    if (tok) {
      apiGet('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null));
    }
    const onLang = (e) => setLangState(e.detail);
    window.addEventListener('nb-lang-change', onLang);
    const pollTimer = setInterval(() => {
      if (getToken()) loadNotifications();
    }, 20000);
    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      window.removeEventListener('nb-lang-change', onLang);
    };
  }, [loadSettings, loadNotifications]);

  const loadNotifications = useCallback(async () => {
    if (!getToken()) return;
    try {
      const r = await apiGet('/notifications');
      setNotifications(r.items || []);
      setUnreadCount(r.unread || 0);
    } catch {}
  }, []);

  const markNotificationsRead = useCallback(async (ids) => {
    try { await apiPost('/notifications/read', { ids }); } catch {}
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const trackEvent = useCallback(async (event_type, extra = {}) => {    try {
      const sid = getSessionId();
      await apiPost('/analytics/event', {
        session_id: sid,
        visitor_id: localStorage.getItem('nb_visitor') || (() => { const v = 'v-' + Math.random().toString(36).slice(2); localStorage.setItem('nb_visitor', v); return v; })(),
        user_id: user?.id || null,
        user_name: user?.full_name || null,
        user_email: user?.email || null,
        event_type,
        path: window.location.pathname,
        device_type: window.innerWidth < 768 ? 'Mobile' : window.innerWidth < 1024 ? 'Tablet' : 'Desktop',
        browser: navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Edge') ? 'Edge' : 'Other',
        os: navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : navigator.userAgent.includes('Linux') ? 'Linux' : 'Other',
        referrer: document.referrer,
        language: lang,
        ...extra,
      });
    } catch (e) {
      // analytics must never break the app
    }
  }, [user, lang]);

  const login = useCallback(async (email, password) => {
    const res = await apiPost('/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
    loadNotifications();
    return res.user;
  }, [loadNotifications]);

  const register = useCallback(async (payload) => {
    const res = await apiPost('/auth/register', payload);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try { await apiPost('/auth/logout'); } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const changeLanguage = useCallback((code) => {
    setLang(code);
    setLangState(code);
  }, []);

  const value = useMemo(() => ({
    settings, cms, categories, stories, paymentMethods, user, availability, lang, loading,
    notifications, unreadCount,
    setAvailability, setUser, setCategories, setStories, setPaymentMethods,
    loadStories, loadPaymentMethods, loadNotifications, markNotificationsRead,
    login, register, logout, trackEvent, changeLanguage, loadSettings,
    setSettings, setCms,
  }), [settings, cms, categories, stories, paymentMethods, user, availability, lang, loading,
      notifications, unreadCount, login, register, logout, trackEvent, changeLanguage, loadSettings,
      loadStories, loadPaymentMethods, loadNotifications, markNotificationsRead]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const LANGUAGE_OPTIONS = LANGS;
