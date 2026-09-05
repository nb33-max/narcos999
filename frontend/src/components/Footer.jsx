import { Link } from 'react-router-dom';
import { Send, Bot } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { t } from '../lib/i18n';
import { telegramBotUrl } from '../lib/telegram';

const PAYMENTS = [
  { name: 'CRYPTO', labelKey: 'pay_footer_crypto' },
  { name: 'PAYPAL', labelKey: 'pay_footer_paypal' },
  { name: 'WIRE', labelKey: 'pay_footer_wire' },
  { name: 'GIFT', labelKey: 'pay_footer_gift' },
];

export default function Footer() {
  const { settings } = useApp();
  return (
    <footer className="bg-pine text-canvas/90 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 bg-canvas/10 border border-canvas/20 flex items-center justify-center font-serif font-bold text-sm">NB</span>
            <span className="font-serif text-xl font-bold tracking-[0.12em]">{settings?.store_name || 'NARCOS BAY'}</span>
          </div>
          <p className="mt-4 text-sm text-canvas/70 leading-relaxed">
            {settings?.tagline || t('hero_subtitle')}
          </p>
          <a href={settings?.telegram_channel_url || 'https://t.me/narcosbay'} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 border border-canvas/25 text-xs font-semibold uppercase tracking-[0.12em] px-4 py-2 rounded-full hover:bg-canvas hover:text-pine transition-colors">
            <Send size={13} /> {t('join_telegram')}
          </a>
          <a href={telegramBotUrl(settings)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-canvas/60 hover:text-canvas transition-colors">
            <Bot size={13} /> {t('telegram_bot_chat')}
          </a>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-canvas mb-4">{t('footer_nav')}</h4>
          <ul className="space-y-2.5 text-sm text-canvas/70">
            <li><Link to="/shop" className="hover:text-canvas transition-colors">{t('shop')}</Link></li>
            <li><Link to="/#category-space" className="hover:text-canvas transition-colors">{t('categories')}</Link></li>
            <li><Link to="/shop?featured=true" className="hover:text-canvas transition-colors">{t('featured')}</Link></li>
            <li><Link to="/shop?new_arrival=true" className="hover:text-canvas transition-colors">{t('new_arrivals')}</Link></li>
            <li><Link to="/saved" className="hover:text-canvas transition-colors">{t('saved')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-canvas mb-4">{t('footer_care')}</h4>
          <ul className="space-y-2.5 text-sm text-canvas/70">
            <li><Link to="/contact" className="hover:text-canvas transition-colors">{t('contact_support')}</Link></li>
            <li><Link to="/faq" className="hover:text-canvas transition-colors">{t('faq')}</Link></li>
            <li><Link to="/payments" className="hover:text-canvas transition-colors">{t('payment_options')}</Link></li>
            <li><Link to="/terms" className="hover:text-canvas transition-colors">{t('terms')}</Link></li>
            <li><Link to="/privacy" className="hover:text-canvas transition-colors">{t('privacy')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-canvas/15">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col items-center text-center gap-5">
          <p className="text-xs text-canvas/50">{t('rights_reserved').replace('{year}', '2026').replace('{store}', settings?.store_name || 'NARCOS BAY')}</p>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-canvas/70 mb-3">{t('footer_payments')}</h4>
            <div className="flex flex-wrap justify-center gap-2">
              {PAYMENTS.map((p) => (
                <span key={p.name} title={t(p.labelKey)} className="border border-canvas/20 rounded-lg px-3 py-2 text-[11px] font-bold tracking-wider text-canvas/80 text-center">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
