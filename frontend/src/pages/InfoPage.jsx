import { Link } from 'react-router-dom';
import { Mail, MessageCircle, ShieldCheck, Lock, RefreshCw, PackageCheck, CreditCard, Zap, Receipt, BadgePercent } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { t } from '../lib/i18n';
import { BitcoinIcon, PayPalIcon, BankIcon, GiftCardIcon } from '../components/PaymentIcons.jsx';

const FAQ_ITEMS = [
  { qKey: 'faq1_q', aKey: 'faq1_a' },
  { qKey: 'faq2_q', aKey: 'faq2_a' },
  { qKey: 'faq3_q', aKey: 'faq3_a' },
  { qKey: 'faq4_q', aKey: 'faq4_a' },
  { qKey: 'faq5_q', aKey: 'faq5_a' },
  { qKey: 'faq6_q', aKey: 'faq6_a' },
  { qKey: 'faq7_q', aKey: 'faq7_a' },
  { qKey: 'faq8_q', aKey: 'faq8_a' },
];

const PAYMENT_METHODS = [
  { id: 'CRYPTO', labelKey: 'pay_crypto', icon: BitcoinIcon },
  { id: 'PAYPAL', labelKey: 'pay_paypal', icon: PayPalIcon },
  { id: 'WIRE', labelKey: 'pay_wire', icon: BankIcon },
  { id: 'GIFT', labelKey: 'pay_gift', icon: GiftCardIcon },
];

const PAYMENT_FEATURES = [
  { icon: Zap, titleKey: 'payfeat_dispatch_title', descKey: 'payfeat_dispatch_desc' },
  { icon: Receipt, titleKey: 'payfeat_confirm_title', descKey: 'payfeat_confirm_desc' },
  { icon: BadgePercent, titleKey: 'payfeat_fees_title', descKey: 'payfeat_fees_desc' },
  { icon: ShieldCheck, titleKey: 'payfeat_refund_title', descKey: 'payfeat_refund_desc' },
];

const TERMS_SECTIONS = [
  { titleKey: 'terms1_title', bodyKey: 'terms1_body' },
  { titleKey: 'terms2_title', bodyKey: 'terms2_body' },
  { titleKey: 'terms3_title', bodyKey: 'terms3_body' },
  { titleKey: 'terms4_title', bodyKey: 'terms4_body' },
  { titleKey: 'terms5_title', bodyKey: 'terms5_body' },
  { titleKey: 'terms6_title', bodyKey: 'terms6_body' },
  { titleKey: 'terms7_title', bodyKey: 'terms7_body' },
];

const PRIVACY_SECTIONS = [
  { titleKey: 'priv1_title', bodyKey: 'priv1_body' },
  { titleKey: 'priv2_title', bodyKey: 'priv2_body' },
  { titleKey: 'priv3_title', bodyKey: 'priv3_body' },
  { titleKey: 'priv4_title', bodyKey: 'priv4_body' },
  { titleKey: 'priv5_title', bodyKey: 'priv5_body' },
  { titleKey: 'priv6_title', bodyKey: 'priv6_body' },
];

function Section({ title, children }) {
  return (
    <div className="card p-6">
      <h2 className="font-serif font-bold uppercase tracking-[0.12em] text-pine mb-3">{title}</h2>
      <div className="text-sm text-moss leading-relaxed">{children}</div>
    </div>
  );
}

export default function InfoPage({ type }) {
  const { settings } = useApp();

  const title = {
    faq: t('faq'),
    payments: t('payment_options'),
    terms: t('terms'),
    privacy: t('privacy'),
  }[type] || t('faq');

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{settings?.store_name || 'NARCOS BAY'}</p>
      <h1 className="section-title mb-8">{title}</h1>

      {type === 'faq' && (
        <div className="space-y-4">
          {FAQ_ITEMS.map((f) => (
            <Section key={f.qKey} title={t(f.qKey)}><p>{t(f.aKey)}</p></Section>
          ))}
          <div className="card p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
            <p className="text-sm text-moss font-semibold">{t('still_need_help')}</p>
            <div className="flex gap-3">
              <a href="mailto:admin@narcosbay.com" className="btn-outline !py-2"><Mail size={13} /> {t('btn_email')}</a>
              <a href="https://t.me/narcosbay" target="_blank" rel="noreferrer" className="btn-outline !py-2"><MessageCircle size={13} /> {t('btn_telegram')}</a>
            </div>
          </div>
        </div>
      )}

      {type === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="card p-5 text-center">
                  <div className="mx-auto w-12 h-12 bg-subcard rounded-full flex items-center justify-center">
                    <Icon size={24} className="text-pine" />
                  </div>
                  <h3 className="font-serif font-semibold text-pine mt-3 uppercase tracking-wide text-sm">{t(p.labelKey)}</h3>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT_FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="card p-6 text-center">
                <div className="mx-auto w-12 h-12 bg-crimson/10 rounded-full flex items-center justify-center">
                  <Icon size={22} className="text-crimson" />
                </div>
                <h3 className="font-serif font-semibold text-pine mt-4 uppercase tracking-wide text-sm">{t(titleKey)}</h3>
                <p className="text-xs text-moss mt-2 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'terms' && (
        <div className="space-y-4">
          {TERMS_SECTIONS.map((s) => (
            <Section key={s.titleKey} title={t(s.titleKey)}><p>{t(s.bodyKey)}</p></Section>
          ))}
          <div className="flex items-center gap-3 card p-5">
            <ShieldCheck size={18} className="text-crimson shrink-0" />
            <p className="text-sm text-moss">{t('terms_question')} <Link to="/contact" className="font-semibold text-pine hover:text-crimson underline underline-offset-2">{t('contact_support')}</Link>.</p>
          </div>
        </div>
      )}

      {type === 'privacy' && (
        <div className="space-y-4">
          {PRIVACY_SECTIONS.map((s) => (
            <Section key={s.titleKey} title={t(s.titleKey)}><p>{t(s.bodyKey)}</p></Section>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[{ icon: Lock, key: 'encrypted' }, { icon: PackageCheck, key: 'discreet' }, { icon: RefreshCw, key: 'control_your_data' }].map(({ icon: Icon, key }) => (
              <div key={key} className="card p-5 flex items-center gap-3">
                <Icon size={18} className="text-crimson shrink-0" />
                <span className="text-sm font-semibold text-pine">{t(key)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 card p-5">
            <CreditCard size={18} className="text-crimson shrink-0" />
            <p className="text-sm text-moss">{t('privacy_request')} <Link to="/contact" className="font-semibold text-pine hover:text-crimson underline underline-offset-2">{t('contact_support')}</Link>.</p>
          </div>
        </div>
      )}
    </div>
  );
}
