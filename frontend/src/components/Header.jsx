import { Link, useNavigate } from 'react-router-dom';
import { Send, MessageSquare, ShieldAlert, Search, ShoppingBag, User, Globe, Menu, X, Bell } from 'lucide-react';
import { useApp, LANGUAGE_OPTIONS } from '../store/AppContext';
import { useCart } from '../store/CartContext';
import { t, getLang } from '../lib/i18n';
import { useState } from 'react';

const NAV = [
  { key: 'shop', href: '/shop' },
  { key: 'categories', href: '/#category-space' },
  { key: 'featured', href: '/shop?featured=true' },
  { key: 'new_arrivals', href: '/shop?new_arrival=true' },
];

export default function Header({ onOpenSearch }) {
  const { settings, cms, user, lang, changeLanguage, unreadCount } = useApp();
  const { count } = useCart();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const announcement = cms?.announcement_text || settings?.announcement_text || t('announcement');
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
  const isRTL = lang === 'AR';

  return (
    <>
      <div className="bg-pine text-canvas text-[11px] text-center py-2 px-4">
        <a
          href={settings?.telegram_channel_url || 'https://t.me/narcosbay'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 uppercase tracking-[0.14em] hover:text-stone transition-colors"
        >
          <Send size={12} className="shrink-0" />
          <span>{announcement}</span>
        </a>
      </div>

      <header className="sticky top-0 z-40 bg-canvas/95 backdrop-blur-md border-b border-stone">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <span className="w-8 h-8 bg-pine text-canvas flex items-center justify-center font-serif font-bold text-xs tracking-wide transition-colors duration-300 group-hover:bg-crimson">
              NB
            </span>
            <span className="flex flex-col leading-none min-w-0">
              <span className="font-serif text-sm font-bold tracking-[0.1em] uppercase whitespace-nowrap">{settings?.store_name || 'NARCOS BAY'}</span>
              <span className="text-[9px] tracking-[0.16em] text-moss mt-0.5 whitespace-nowrap">{settings?.tagline || t('shop_the_collection')}</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {NAV.map((n) => (
              <a key={n.key} href={n.href} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pine hover:text-crimson transition-colors whitespace-nowrap">
                {t(n.key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <a href={settings?.telegram_channel_url || 'https://t.me/narcosbay'} target="_blank" rel="noreferrer" className="hidden 2xl:inline-flex items-center gap-1.5 bg-pine text-canvas text-[10px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full hover:bg-crimson transition-colors whitespace-nowrap">
              <Send size={11} /> {t('join_telegram')}
            </a>
            <Link to="/contact" className="hidden 2xl:inline-flex items-center gap-1.5 border border-pine/20 text-pine text-[10px] font-semibold uppercase tracking-[0.12em] px-3 py-1.5 rounded-full hover:border-crimson hover:text-crimson transition-colors whitespace-nowrap">
              <MessageSquare size={11} /> {t('contact_admin')}
            </Link>

            {isAdmin && (
              <Link to="/admin" className="inline-flex items-center gap-1.5 bg-crimson/10 text-crimson text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-full hover:bg-crimson hover:text-canvas transition-colors whitespace-nowrap">
                <ShieldAlert size={11} /> {t('admin')}
              </Link>
            )}

            <button onClick={onOpenSearch} className="p-2 text-pine hover:text-crimson transition-colors" aria-label={t('aria_search')}>
              <Search size={18} />
            </button>

            <Link to="/cart" className="relative p-2 text-pine hover:text-crimson transition-colors" aria-label={t('aria_cart')}>
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-crimson text-canvas text-[9px] font-bold rounded-full flex items-center justify-center">{count}</span>
              )}
            </Link>

            {user && (
              <Link
                to="/account?tab=notifications"
                className="relative p-2 text-pine hover:text-crimson transition-colors"
                aria-label={t('aria_notifications')}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-crimson text-canvas text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </Link>
            )}

            <button
              onClick={() => (user ? navigate('/account') : navigate('/auth'))}
              className="p-2 text-pine hover:text-crimson transition-colors"
              aria-label={t('aria_account')}
            >
              <User size={18} />
            </button>

            <div className="relative">
              <button onClick={() => setLangOpen((v) => !v)} className="flex items-center gap-1 p-2 text-pine hover:text-crimson transition-colors" aria-label={t('aria_language')}>
                <Globe size={16} />
                <span className="text-[10px] font-bold tracking-wider">{lang}</span>
              </button>
              {langOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                  <div className="absolute right-0 mt-2 z-20 bg-white border border-stone rounded-xl shadow-lift py-1.5 min-w-[180px]" style={isRTL ? { left: 0, right: 'auto' } : {}}>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { changeLanguage(l.code); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-subcard transition-colors ${lang === l.code ? 'text-crimson font-semibold' : 'text-pine'}`}
                      >
                        <span>{l.native}</span>
                        <span className="text-[10px] text-moss font-bold tracking-wider">{l.code}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setMobileOpen((v) => !v)} className="lg:hidden p-2 text-pine hover:text-crimson transition-colors" aria-label={t('aria_menu')}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-stone bg-canvas anim-fade">
            <nav className="flex flex-col px-4 py-3">
              {NAV.map((n) => (
                <a key={n.key} href={n.href} onClick={() => setMobileOpen(false)} className="py-3 text-xs font-semibold uppercase tracking-[0.14em] border-b border-stone/50 last:border-0 hover:text-crimson transition-colors">
                  {t(n.key)}
                </a>
              ))}
              <div className="flex flex-wrap gap-2 py-3">
                <a href={settings?.telegram_channel_url} target="_blank" rel="noreferrer" className="btn-primary !py-2 text-[10px]"><Send size={12} /> {t('join_telegram')}</a>
                <Link to="/contact" onClick={() => setMobileOpen(false)} className="btn-outline !py-2 text-[10px]"><MessageSquare size={12} /> {t('contact_admin')}</Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
