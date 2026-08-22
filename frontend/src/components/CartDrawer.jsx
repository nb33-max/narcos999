import { useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, X, ArrowRight, ShoppingBag, Tag } from 'lucide-react';
import { useCart } from '../store/CartContext';
import { useApp } from '../store/AppContext';
import { useToast } from '../store/ToastContext';
import { formatCurrency } from '../lib/format';
import { t, interpolate } from '../lib/i18n';
import { apiPost } from '../lib/api';
import { useState } from 'react';

export default function CartDrawer({ open, onClose }) {
  const { items, totals, count, setQty, removeItem, promo, promoDiscount, applyPromo, removePromo } = useCart();
  const { settings } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs anim-fade" onClick={onClose}>
      <div className="w-full max-w-md bg-canvas h-full shadow-lift flex flex-col anim-slide-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone">
          <h3 className="font-serif font-semibold uppercase tracking-[0.12em] flex items-center gap-2">
            <ShoppingBag size={18} /> {t('cart_count').replace('{count}', count)}
          </h3>
          <button onClick={onClose} className="p-2 text-moss hover:text-crimson transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-16">
              <ShoppingBag size={40} className="text-moss/30" />
              <p className="text-sm font-semibold uppercase tracking-widest text-moss">{t('empty_cart')}</p>
              <button onClick={() => { onClose(); navigate('/shop'); }} className="btn-primary !py-2 text-[10px]">{t('shop')}</button>
            </div>
          )}

          {items.map((it) => (
            <div key={it.product_id + it.tier + it.variant} className="flex gap-3 bg-white border border-stone/70 rounded-xl p-3">
              <img src={it.image} alt={it.name} className="w-16 h-16 rounded-lg object-cover bg-subcard shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-pine truncate">{it.name}</p>
                    <p className="text-[11px] text-moss mt-0.5 uppercase tracking-wider">
                      {it.tier ? <span className="pill bg-crimson/10 text-crimson">{it.tier}</span> : null}
                      {it.variant ? <span className="ml-2 text-moss/70">{it.variant}</span> : null}
                    </p>
                  </div>
                  <button onClick={() => removeItem(it.product_id, it.tier, it.variant)} className="text-moss/50 hover:text-crimson transition-colors shrink-0">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 border border-stone rounded-lg px-1">
                    <button onClick={() => setQty(it.product_id, it.tier, Math.max(1, it.quantity - 1))} className="p-1 text-moss hover:text-crimson"><Minus size={13} /></button>
                    <span className="text-sm font-semibold w-6 text-center">{it.quantity}</span>
                    <button onClick={() => setQty(it.product_id, it.tier, Math.min(it.max_qty || 999, it.quantity + 1))} className="p-1 text-moss hover:text-crimson"><Plus size={13} /></button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-pine">{formatCurrency(it.unit_price * it.quantity, settings)}</p>
                    <p className="text-[11px] text-moss/60">{formatCurrency(it.unit_price, settings)} {t('per_unit')}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {items.length > 0 && (
            <div className="bg-white border border-stone/70 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={14} className="text-crimson" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-pine">{t('promo_code')}</span>
              </div>
              {promo ? (
                <div className="flex items-center justify-between bg-crimson/5 border border-crimson/20 rounded-lg px-3 py-2 mt-2">
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
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-stone bg-white px-5 py-4 space-y-3">
            <div className="h-2 bg-subcard rounded-full overflow-hidden">
              <div className="h-full bg-crimson transition-all duration-500" style={{ width: `${Math.min(100, (100 * (totals.subtotal - totals.discount)) / totals.freeShippingMin)}%` }} />
            </div>
            <p className="text-[11px] text-moss text-center">
              {totals.remaining > 0 ? interpolate(t('free_express'), { amount: formatCurrency(totals.remaining, settings) }) : t('free_unlocked')}
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-moss"><span>{t('subtotal')}</span><span>{formatCurrency(totals.subtotal, settings)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-emerald-600"><span>{t('discount')}</span><span>-{formatCurrency(totals.discount, settings)}</span></div>}
              <div className="flex justify-between text-moss"><span>{t('shipping')}</span><span>{totals.shipping === 0 ? t('free') : formatCurrency(totals.shipping, settings)}</span></div>
              <div className="flex justify-between text-moss"><span>{t('tax')}</span><span>{formatCurrency(totals.tax, settings)}</span></div>
              <div className="flex justify-between font-bold text-pine text-base pt-1 border-t border-stone"><span>{t('total')}</span><span>{formatCurrency(totals.total, settings)}</span></div>
            </div>
            <button onClick={() => { onClose(); navigate('/checkout'); }} className="btn-primary w-full">
              {t('checkout')} <ArrowRight size={15} />
            </button>
            <button onClick={onClose} className="btn-ghost w-full">{t('continue_shopping')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
