import { useEffect, useState } from 'react';
import { ShieldAlert, MessageCircle, LifeBuoy, Loader2 } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { apiGet } from '../lib/api';
import { t } from '../lib/i18n';

export default function RestrictedPage() {
  const { availability } = useApp();
  const [rules, setRules] = useState(null);

  useEffect(() => {
    apiGet('/availability/rules').then(setRules).catch(() => {});
  }, []);

  const title = rules?.restriction_title || t('access_restricted');
  const message = rules?.restriction_message || t('region_blocked');
  const supportEnabled = rules?.support_button_enabled !== 0;
  const telegramEnabled = rules?.telegram_button_enabled === 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-canvas">
      <div className="max-w-lg w-full">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-crimson/10 flex items-center justify-center">
          <ShieldAlert size={40} className="text-crimson" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-crimson mt-6">{t('geo_restriction')}</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-pine mt-3">{title}</h1>
        <p className="text-moss leading-relaxed mt-4">{message}</p>

        {availability.countryCode && (
          <div className="mt-5 inline-flex items-center gap-2 bg-subcard rounded-lg px-4 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-moss">{t('detected_region')}</span>
            <span className="text-sm font-bold text-pine">{availability.country} ({availability.countryCode})</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          {supportEnabled && (
            <a href={rules?.support_button_url || '/contact'} className="btn-primary">
              <LifeBuoy size={15} /> {t('contact_support')}
            </a>
          )}
          {telegramEnabled && (
            <a href={rules?.telegram_button_url || 'https://t.me/narcosbay_official'} target="_blank" rel="noreferrer" className="btn-outline">
              <MessageCircle size={15} /> {t('join_telegram')}
            </a>
          )}
        </div>

        <p className="text-[11px] text-moss/60 mt-8 font-mono">{t('access_logged')}</p>
      </div>
    </div>
  );
}
