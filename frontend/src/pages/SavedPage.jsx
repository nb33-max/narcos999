import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { useWishlist } from '../store/WishlistContext.jsx';
import { useApp } from '../store/AppContext.jsx';
import { t } from '../lib/i18n';

export default function SavedPage() {
  const { items } = useWishlist();
  const { trackEvent } = useApp();
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('your_collection')}</p>
          <h1 className="section-title">{t('saved_products')}</h1>
        </div>
        <span className="pill bg-crimson/10 text-crimson">{t('saved_count').replace('{n}', items.length)}</span>
      </div>

      {items.length === 0 ? (
        <div className="card max-w-md mx-auto py-16 px-8 text-center">
          <Heart size={44} className="mx-auto text-stone" />
          <h3 className="font-serif text-xl font-semibold text-pine mt-4">{t('nothing_saved_title')}</h3>
          <p className="text-sm text-moss mt-2">{t('nothing_saved_body')}</p>
          <Link to="/shop" onClick={() => trackEvent('saved_to_shop')} className="btn-primary mt-6">{t('start_shopping')}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
