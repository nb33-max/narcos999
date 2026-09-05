import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Tag } from 'lucide-react';
import { useCart } from '../store/CartContext';
import { useApp } from '../store/AppContext';
import { useToast } from '../store/ToastContext';
import { formatCurrency } from '../lib/format';
import { t, interpolate } from '../lib/i18n';
import { apiPost } from '../lib/api';

export default function CartPage() {
  const { items, totals, count, setQty, removeItem, promo, promoDiscount, applyPromo, removePromo } = useCart();
  const { settings } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await apiPost('/promotions/validate', { code, subtotal: totals.subtotal });
      if (res.valid) {
        applyPromo(res.promo, res.discount);
        toast(interpolate(t('promo_applied'), { amount: formatCurrency(res.discount, settings) }), 'success');
        setCode('');
      } else {
        toast(res.reason || t('invalid_code'), 'error');
      }
    } catch {
      toast(t('unable_validate'), 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('cart_kicker')}</p>
          <h1 className="section-title">{t('cart')}</h1>
        </div>
        <span className="pill bg-crimson/10 text-crimson">{t('cart_count').replace('{count}', count)}</span>
      </div>

      {items.length === 0 ? (
        <div className="card max-w-md mx-auto py-16 px-8 text-center">
          <ShoppingBag size={44} className="mx-auto text-stone" />
          <h3 className="font-serif text-xl font-semibold text-pine mt-4">{t('empty_cart')}</h3>
          <p className="text-sm text-moss mt-2">{t('empty_cart_body')}</p>
          <button onClick={() => navigate('/shop')} className="btn-primary mt-6">{t('start_shopping')}</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Items */}
          <div className="space-y-4">
            {items.map((it) => (
              <div key={it.product_id + it.tier + it.variant} className="flex gap-4 bg-white border border-stone/70 rounded-xl p-4">
                <img src={it.image} alt={it.name} className="w-20 h-20 rounded-lg object-cover bg-subcard shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-pine truncate">{it.name}</p>
                      <p className="text-[11px] text-moss mt-0.5 uppercase tracking-wider">
                        {it.tier ? <span className="pill bg-crimson/10 text-crimson">{it.tier}</span> : null}
                        {it.variant ? <span className="ml-2 text-moss/70">{it.variant}</span> : null}
                      </p>
                    </div>
                    <button onClick={() => removeItem(it.product_id, it.tier, it.variant)} className="text-moss/50 hover:text-crimson transition-colors shrink-0" aria-label={t('remove')}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 border border-stone rounded-lg px-1">
                      <button onClick={() => setQty(it.product_id, it.tier, Math.max(1, it.quantity - 1))} className="p-1.5 text-moss hover:text-crimson" aria-label="-"><Minus size={13} /></button>
                      <span className="text-sm font-semibold w-6 text-center">{it.quantity}</span>
                      <button onClick={() => setQty(it.product_id, it.tier, Math.min(it.max_qty || 999, it.quantity + 1))} className="p-1.5 text-moss hover:text-crimson" aria-label="+"><Plus size={13} /></button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-pine">{formatCurrency(it.unit_price * it.quantity, settings)}</p>
                      <p className="text-[11px] text-moss/60">{formatCurrency(it.unit_price, settings)} {t('per_unit')}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="card p-6 lg:sticky lg:top-20 space-y-4">
            <div className="h-2 bg-subcard rounded-full overflow-hidden">
              <div className="h-full bg-crimson transition-all duration-500" style={{ width: `${Math.min(100, (100 * (totals.subtotal - totals.discount)) / totals.freeShippingMin)}%` }} />
            </div>
            <p className="text-[11px] text-moss text-center">
              {totals.remaining > 0 ? interpolate(t('free_express'), { amount: formatCurrency(totals.remaining, settings) }) : t('free_unlocked')}
            </p>

            <div className="bg-subcard rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={14} className="text-crimson" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-pine">{t('promo_code')}</span>
              </div>
              {promo ? (
                <div className="flex items-center justify-between bg-white border border-crimson/20 rounded-lg px-3 py-2 mt-2">
                  <div>
                    <p className="text-sm font-bold text-crimson uppercase">{promo.code}</p>
                    <p className="text-[11px] text-moss">-{formatCurrency(promoDiscount, settings)}</p>
                  </div>
                  <button onClick={() => { removePromo(); toast(t('promo_removed'), 'info'); }} className="text-[11px] font-bold uppercase text-moss hover:text-crimson">{t('remove')}</button>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('ph_promo')} className="input !py-2 text-xs uppercase" />
                  <button onClick={handleApply} disabled={checking} className="btn-primary !py-2 !px-4 text-[10px]">{checking ? '…' : t('apply')}</button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-moss"><span>{t('subtotal')}</span><span>{formatCurrency(totals.subtotal, settings)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-emerald-600"><span>{t('discount')}</span><span>-{formatCurrency(totals.discount, settings)}</span></div>}
              <div className="flex justify-between text-moss"><span>{t('shipping')}</span><span>{totals.shipping === 0 ? t('free') : formatCurrency(totals.shipping, settings)}</span></div>
              <div className="flex justify-between text-moss"><span>{t('tax')}</span><span>{formatCurrency(totals.tax, settings)}</span></div>
              <div className="flex justify-between font-bold text-pine text-base pt-1 border-t border-stone"><span>{t('total')}</span><span>{formatCurrency(totals.total, settings)}</span></div>
            </div>

            <button onClick={() => navigate('/checkout')} className="btn-primary w-full">
              {t('checkout')} <ArrowRight size={15} />
            </button>
            <Link to="/shop" className="btn-ghost w-full">{t('continue_shopping')}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
