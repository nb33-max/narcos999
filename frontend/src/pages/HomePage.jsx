import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Send, Bot } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import StoriesRail from '../components/StoriesRail.jsx';
import { useApp } from '../store/AppContext.jsx';
import { apiGet } from '../lib/api';
import { t } from '../lib/i18n';
import { telegramBotUrl } from '../lib/telegram';
import { BitcoinIcon, BankIcon, PayPalIcon, GiftCardIcon } from '../components/PaymentIcons.jsx';

const PAYMENTS = [
  { id: 'CRYPTO', icon: BitcoinIcon, labelKey: 'pay_crypto', subKey: 'pay_crypto_sub', descKey: 'pay_crypto_desc' },
  { id: 'PAYPAL', icon: PayPalIcon, labelKey: 'pay_paypal', subKey: 'pay_paypal_sub', descKey: 'pay_paypal_desc' },
  { id: 'WIRE', icon: BankIcon, labelKey: 'pay_wire', subKey: 'pay_wire_sub', descKey: 'pay_wire_desc' },
  { id: 'GIFT', icon: GiftCardIcon, labelKey: 'pay_gift', subKey: 'pay_gift_sub', descKey: 'pay_gift_desc' },
];

export default function HomePage() {
  const { settings, categories, stories } = useApp();
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);

  useEffect(() => {
    apiGet('/products', { featured: 'true', limit: 8 }).then(setFeatured).catch(() => {});
    apiGet('/products', { new_arrival: 'true', limit: 8 }).then(setNewArrivals).catch(() => {});
    apiGet('/products', { best_seller: 'true', limit: 8 }).then(setBestSellers).catch(() => {});
  }, []);

  return (
    <div>
      {/* STORIES RAIL */}
      <StoriesRail stories={stories} />

      {/* FEATURED DROPS */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('curated_selection')}</p>
            <h2 className="section-title">{t('featured_drops')}</h2>
          </div>
          <Link to="/shop" className="btn-ghost">{t('view_all')} <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {featured.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('fresh_stock')}</p>
              <h2 className="section-title">{t('new_arrivals')}</h2>
            </div>
            <Link to="/shop?new_arrival=true" className="btn-ghost">{t('view_all')} <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {newArrivals.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* BEST SELLERS */}
      {bestSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('customer_favorites')}</p>
              <h2 className="section-title">{t('best_sellers')}</h2>
            </div>
            <Link to="/shop" className="btn-ghost">{t('view_all')} <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {bestSellers.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* CATEGORY SPACE */}
      <section id="category-space" className="bg-pine py-16 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('archives')}</p>
            <h2 className="section-title text-canvas">{t('categories')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => (
              <Link key={cat.id} to={`/shop?category=${cat.slug}`} className="group relative rounded-2xl overflow-hidden aspect-[4/3] block">
                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 p-5 text-canvas">
                  <h3 className="font-serif text-xl font-bold uppercase tracking-[0.1em]">{cat.name}</h3>
                  <p className="text-xs text-canvas/70 mt-1 line-clamp-2">{cat.description}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-crimson mt-2">{cat.product_count || 0} {t('products')}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PAYMENT METHODS */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('payment_methods_kicker')}</p>
          <h2 className="section-title">{t('payment_methods')}</h2>
          <p className="text-moss text-sm mt-3">{t('payment_methods_sub')}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
          {PAYMENTS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.id} className="card p-5 text-center">
                <div className="mx-auto w-12 h-12 bg-subcard rounded-full flex items-center justify-center">
                  <Icon size={24} className="text-pine" />
                </div>
                <h3 className="font-serif font-semibold text-pine mt-3 uppercase tracking-wide text-sm">{t(p.labelKey)}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-crimson mt-1">{t(p.subKey)}</p>
                <p className="text-xs text-moss mt-2 leading-relaxed">{t(p.descKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TELEGRAM BANNER */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-crimson to-pine text-canvas p-10 md:p-14 text-center">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          <div className="relative">
            <div className="mx-auto w-14 h-14 bg-canvas/10 border border-canvas/20 rounded-full flex items-center justify-center">
              <Send size={24} />
            </div>
            <h2 className="font-serif text-2xl md:text-4xl font-bold uppercase tracking-[0.1em] mt-6">{t('join_telegram_community')}</h2>
            <p className="text-canvas/80 mt-3 max-w-xl mx-auto text-sm md:text-base">{t('telegram_sub')}</p>
            <a href={settings?.telegram_channel_url || 'https://t.me/narcosbay'} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 bg-canvas text-pine text-xs font-bold uppercase tracking-[0.14em] px-8 py-4 rounded-full hover:bg-stone transition-colors">
              <Send size={15} /> {settings?.telegram_display_name || 'Narcos Bay'}
            </a>
            <a href={telegramBotUrl(settings)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs text-canvas/70 hover:text-canvas transition-colors">
              <Bot size={13} /> {t('telegram_bot_chat')}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
