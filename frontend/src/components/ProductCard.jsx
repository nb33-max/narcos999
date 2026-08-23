import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Play, Star } from 'lucide-react';
import { useWishlist } from '../store/WishlistContext';
import { useApp } from '../store/AppContext';
import { useToast } from '../store/ToastContext';
import { formatCurrency } from '../lib/format';
import { t } from '../lib/i18n';

function Badge({ children, color = 'bg-crimson text-canvas' }) {
  return <span className={`pill absolute top-3 left-3 z-10 ${color}`}>{children}</span>;
}

export default function ProductCard({ product }) {
  const { settings } = useApp();
  const { toggle, isSaved } = useWishlist();
  const { toast } = useToast();
  const [imgIdx, setImgIdx] = useState(0);
  const media = product.media || [];
  const primary = media.find((m) => m.is_primary) || media[0];
  const saved = isSaved(product.id);
  const outOfStock = product.inventory <= 0;
  const price = product.price_on_request ? null : (product.price ?? 0);

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggle(product);
    toast(added ? t('saved_to_wishlist') : t('removed_from_wishlist'), added ? 'success' : 'info');
  };

  return (
    <Link to={`/product/${product.slug}`} className="group card overflow-hidden relative block hover:shadow-lift transition-shadow duration-300">
      <div className="relative aspect-square overflow-hidden bg-subcard" onMouseEnter={() => media.length > 1 && setImgIdx(1)} onMouseLeave={() => setImgIdx(0)}>
        {media.length > 0 ? (
          media[imgIdx % media.length]?.media_type === 'video' ? (
            <video
              src={media[imgIdx % media.length]?.secure_url}
              poster={media[imgIdx % media.length]?.poster_url}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={media[imgIdx % media.length]?.secure_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pine to-mossdark flex items-center justify-center text-canvas/50 font-serif">NB</div>
        )}

        {product.best_seller && <Badge>{t('best_seller')}</Badge>}
        {!product.best_seller && product.new_arrival && <Badge color="bg-emerald-600 text-white">{t('new')}</Badge>}
        {!product.best_seller && !product.new_arrival && product.featured && <Badge color="bg-pine text-canvas">{t('featured')}</Badge>}
        {outOfStock && <Badge color="bg-pine/80 text-canvas">{t('out_of_stock')}</Badge>}

        {media.some((m) => m.media_type === 'video') && (
          <span className="absolute top-3 right-3 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-canvas"><Play size={13} /></span>
        )}

        <button onClick={handleWishlist} className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-soft ${saved ? 'bg-crimson text-canvas' : 'bg-white/90 text-pine hover:text-crimson'}`} aria-label={t('aria_wishlist')}>
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-moss">{product.category_name || t('botanical')}</p>
        <h3 className="font-serif font-semibold text-pine mt-1 leading-snug line-clamp-1">{product.name}</h3>
        <div className="mt-2">
          <p className="font-bold text-crimson">
            {price === null ? <span className="text-[11px] uppercase tracking-wider">{t('price_on_request')}</span> : formatCurrency(price, settings)}
          </p>
        </div>
        {product.review_count > 0 && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-moss">
            <Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />
            <span className="font-semibold text-pine">{Number(product.rating || 4.5).toFixed(1)}</span>
            <span>({product.review_count} {t('verified_reviews')})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
