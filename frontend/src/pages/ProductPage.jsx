import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, Heart, Send, ShoppingBag, Minus, Plus, ChevronLeft, ChevronRight, Maximize2, Play, Loader2 } from 'lucide-react';
import { apiGet } from '../lib/api';
import { useApp } from '../store/AppContext.jsx';
import { useCart } from '../store/CartContext.jsx';
import { useWishlist } from '../store/WishlistContext.jsx';
import { useToast } from '../store/ToastContext.jsx';
import { formatCurrency } from '../lib/format';
import { t, interpolate } from '../lib/i18n';
import ProductCard from '../components/ProductCard.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [tier, setTier] = useState(null);
  const [qty, setQty] = useState(1);
  const { settings, trackEvent } = useApp();
  const { addItem } = useCart();
  const { toggle, isSaved } = useWishlist();
  const { toast } = useToast();
  const navigate = useNavigate();
  const stageRef = useRef(null);
  const touchX = useRef(null);

  const goPrev = () => media.length > 1 && setMediaIdx((i) => (i - 1 + media.length) % media.length);
  const goNext = () => media.length > 1 && setMediaIdx((i) => (i + 1) % media.length);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) { if (dx < 0) goNext(); else goPrev(); }
  };

  const openFullscreen = () => {
    const el = stageRef.current?.querySelector(isVideo ? 'video' : 'img');
    if (!el) return;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) fn.call(el)?.catch?.(() => {});
  };

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);
    apiGet(`/products/${slug}`).then((p) => {
      setProduct(p);
      setTier(p.pricing_tiers?.length ? p.pricing_tiers[0] : null);
      setQty(1);
      setMediaIdx(0);
      return apiGet('/products', { category: p.category?.slug, limit: 8 });
    }).then((r) => setRelated(r)).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 size={30} className="animate-spin text-moss" /></div>;
  if (!product) return (
    <div className="max-w-3xl mx-auto px-4 py-32 text-center">
      <p className="font-serif text-2xl text-pine">{t('product_not_found')}</p>
      <Link to="/shop" className="btn-primary mt-6">{t('back_to_shop')}</Link>
    </div>
  );

  const media = product.media || [];
  const primaryMedia = media[mediaIdx % Math.max(1, media.length)] || {};
  const isVideo = primaryMedia.media_type === 'video';
  const saved = isSaved(product.id);
  const unitPrice = tier ? tier.price : product.price;
  const totalPrice = unitPrice * qty;
  const savings = product.compare_at_price ? Math.round(((product.compare_at_price - unitPrice) / product.compare_at_price) * 100) : 0;

  const handleAdd = () => {
    if (product.inventory <= 0) return;
    const cartImage = media.find((m) => m.media_type === 'image')?.secure_url || media.find((m) => m.is_primary)?.secure_url || media[0]?.secure_url;
    addItem({
      product_id: product.id, name: product.name, image: cartImage,
      tier: tier ? `${tier.quantity}${tier.unit}`.toUpperCase() : null,
      variant: product.strain_type || null,
      unit_price: unitPrice, quantity: qty, max_qty: product.inventory,
    });
    trackEvent('cart_add', { entity_id: product.id, entity_name: product.name, metadata: { tier: tier?.quantity, qty } });
    toast(`${interpolate(t('added_to_cart'), { name: product.name })} — ${formatCurrency(totalPrice, settings)}`, 'success');
  };

  const handleWishlist = () => {
    const added = toggle(product);
    trackEvent('wishlist', { entity_id: product.id, entity_name: product.name });
    toast(added ? t('saved_to_wishlist') : t('removed_from_wishlist'), added ? 'success' : 'info');
  };

  const telegramInquire = () => {
    const url = `https://t.me/narcosbay_official?text=${encodeURIComponent(`I'd like to inquire about ${product.name} (${product.sku})`)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-moss mb-6 flex-wrap">
        <Link to="/" className="hover:text-crimson">{t('home')}</Link><ChevronRight size={12} />
        <Link to="/shop" className="hover:text-crimson">{t('shop')}</Link><ChevronRight size={12} />
        {product.category && <><Link to={`/shop?category=${product.category.slug}`} className="hover:text-crimson">{product.category.name}</Link><ChevronRight size={12} /></>}
        <span className="text-pine">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div
            ref={stageRef}
            className={`card overflow-hidden bg-subcard relative select-none ${isVideo ? 'aspect-[4/3]' : 'aspect-square'}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}>
            {isVideo ? (
              <video key={primaryMedia.secure_url} src={primaryMedia.secure_url} controls playsInline preload="metadata" className="w-full h-full object-contain bg-black" />
            ) : (
              <img src={primaryMedia.secure_url} alt={product.name} className="w-full h-full object-cover" draggable={false} />
            )}

            {media.length > 1 && (
              <>
                <button onClick={goPrev} aria-label={t('prev_media')} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-canvas flex items-center justify-center hover:bg-crimson transition-colors"><ChevronLeft size={18} /></button>
                <button onClick={goNext} aria-label={t('next_media')} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-canvas flex items-center justify-center hover:bg-crimson transition-colors"><ChevronRight size={18} /></button>
              </>
            )}

            <button onClick={openFullscreen} title={t('open_fullscreen')} aria-label={t('open_fullscreen')} className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/40 text-canvas flex items-center justify-center hover:bg-crimson transition-colors"><Maximize2 size={15} /></button>

            {product.inventory > 0 && product.inventory <= product.low_stock_threshold && (
              <span className="pill bg-amber-500 text-white absolute top-4 left-4">{t('low_stock')}</span>
            )}
          </div>
          {media.length > 1 && <p className="text-[10px] text-moss/70 mt-2 text-center">{t('media_hint')}</p>}
          <div className="flex gap-3 mt-3 overflow-x-auto pb-1">
            {media.map((m, i) => (
              <button key={i} onClick={() => setMediaIdx(i)} className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-subcard shrink-0 transition-all ${mediaIdx === i ? 'border-crimson' : 'border-transparent'}`}>
                <img src={m.secure_url} alt={m.alt_text || product.name} className="w-full h-full object-cover" />
                {m.media_type === 'video' && <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-canvas"><Play size={18} /></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {product.strain_type && <span className="pill bg-pine/10 text-pine">{product.strain_type}</span>}
            {product.sku && <span className="pill bg-subcard text-moss font-mono">{product.sku}</span>}
            {product.batch_number && <span className="pill bg-subcard text-moss font-mono">{product.batch_number}</span>}
            {product.inventory > 0 ? (
              <span className="pill bg-emerald-500/10 text-emerald-600">● {t('in_stock')}</span>
            ) : (
              <span className="pill bg-red-500/10 text-red-600">● {t('out_of_stock')}</span>
            )}
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-bold text-pine tracking-wide">{product.name}</h1>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex text-amber-500">
              {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={15} fill={i <= Math.round(product.rating) ? 'currentColor' : 'none'} />)}
            </div>
            <span className="text-sm text-moss">{product.rating} · {product.review_count} {t('verified_reviews')}</span>
          </div>

          <p className="text-moss mt-4 leading-relaxed whitespace-pre-wrap">{product.short_description}</p>

          {/* Tier selector */}
          {product.pricing_tiers?.length > 0 && (
            <div className="mt-6">
              <p className="label">{t('select_tier')}</p>
              <div className="flex flex-wrap gap-2">
                {product.pricing_tiers.map((t) => (
                  <button key={t.id} onClick={() => { setTier(t); setQty(1); }}
                    className={`px-4 py-3 rounded-xl border text-left transition-all ${tier?.id === t.id ? 'border-crimson bg-crimson/5 shadow-soft' : 'border-stone bg-white hover:border-crimson/40'}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-moss">{t.quantity}{t.unit} {t('pack')}</span>
                    <span className="block font-bold text-pine mt-0.5">{formatCurrency(t.price, settings)}</span>
                  </button>
                ))}
              </div>
              {savings > 0 && <p className="text-[11px] text-emerald-600 font-semibold mt-2">{interpolate(t('you_save'), { pct: savings })}</p>}
            </div>
          )}

          {/* Qty */}
          <div className="mt-5 flex items-center gap-4">
            <div>
              <p className="label">{t('quantity')}</p>
              <div className="flex items-center gap-2 border border-stone rounded-xl bg-white px-2 py-2">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-1.5 text-moss hover:text-crimson"><Minus size={15} /></button>
                <span className="w-8 text-center font-bold">{qty}</span>
                <button onClick={() => setQty(Math.min(product.inventory || 1, qty + 1))} className="p-1.5 text-moss hover:text-crimson"><Plus size={15} /></button>
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] uppercase tracking-widest text-moss">{t('total')}</p>
              <p className="font-serif text-3xl font-bold text-crimson">{formatCurrency(totalPrice, settings)}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button onClick={handleAdd} disabled={product.inventory <= 0} className="btn-primary flex-1 !py-4">
              <ShoppingBag size={16} /> {product.inventory <= 0 ? t('sold_out') : t('add_to_cart')}
            </button>
            <button onClick={handleWishlist} className={`btn-outline !py-4 ${saved ? '!border-crimson !text-crimson' : ''}`}>
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} /> {saved ? t('saved') : t('save_to_wishlist')}
            </button>
            <button onClick={telegramInquire} className="btn-outline !py-4 !border-emerald-600/30 !text-emerald-700 hover:!border-emerald-600">
              <Send size={16} /> {t('telegram_inquire')}
            </button>
          </div>

          {/* Description */}
          <div className="mt-10">
            <h3 className="font-serif font-semibold uppercase tracking-[0.12em] text-pine border-b border-stone pb-3">{t('description')}</h3>
            <p className="py-5 text-sm text-moss leading-relaxed whitespace-pre-wrap">{product.description}</p>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.filter((r) => r.id !== product.id).length > 0 && (
        <div className="mt-16">
          <h2 className="section-title text-2xl mb-6">{t('you_may_also_like')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {related.filter((r) => r.id !== product.id).slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
