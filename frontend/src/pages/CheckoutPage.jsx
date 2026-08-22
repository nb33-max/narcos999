import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Lock, Loader2, CheckCircle2, Tag, ShieldAlert } from 'lucide-react';
import { useCart } from '../store/CartContext.jsx';
import { useApp } from '../store/AppContext.jsx';
import { useToast } from '../store/ToastContext.jsx';
import { apiPost } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { t } from '../lib/i18n';
import AuthModal from '../components/AuthModal.jsx';
import { BitcoinIcon, PayPalIcon, BankIcon, GiftCardIcon } from '../components/PaymentIcons.jsx';

const PAYMENT_METHODS = [
  { id: 'CRYPTO', labelKey: 'pay_crypto', icon: BitcoinIcon },
  { id: 'WIRE', labelKey: 'pay_wire', icon: BankIcon },
  { id: 'PAYPAL', labelKey: 'pay_paypal', icon: PayPalIcon },
  { id: 'GIFT', labelKey: 'pay_gift', icon: GiftCardIcon },
];

export default function CheckoutPage() {
  const { items, totals, promo, promoDiscount, removePromo, clearCart, applyPromo } = useCart();
  const { settings, user, paymentMethods } = useApp();
  const { toast } = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [form, setForm] = useState({
    email: user?.email || '', full_name: user?.full_name || '', phone: '',
    address: '', city: '', postal_code: '', country: 'Germany',
  });
  const [payment, setPayment] = useState('CRYPTO');
  const [cryptoId, setCryptoId] = useState(null);
  const [giftType, setGiftType] = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const cryptoWallets = paymentMethods?.CRYPTO || [];
  const giftTypes = paymentMethods?.GIFT || [];
  const wireEntries = paymentMethods?.WIRE || [];
  const paypalEntries = paymentMethods?.PAYPAL || [];

  const paymentNote = () => {
    if (payment === 'CRYPTO') {
      const w = cryptoWallets.find((x) => x.id === cryptoId);
      return w ? `CRYPTO — ${w.label}` : 'CRYPTO';
    }
    if (payment === 'GIFT') {
      const g = giftTypes.find((x) => x.value === giftType || x.label === giftType);
      const label = g ? g.label : giftType;
      return `GIFT CARD — ${label || 'TBD'}${giftCode.trim() ? ` — code ${giftCode.trim()}` : ''}`;
    }
    return payment;
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <ShieldAlert size={52} className="mx-auto text-crimson" />
        <h1 className="font-serif text-2xl font-bold text-pine mt-4">{t('checkout_gate_title')}</h1>
        <p className="text-moss text-sm mt-3">{t('checkout_gate_body')}</p>
        <div className="flex flex-col gap-3 mt-6">
          <button onClick={() => setAuthOpen(true)} className="btn-primary">{t('sign_in')}</button>
          <button onClick={() => setAuthOpen(true)} className="btn-outline">{t('create_account')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <ShoppingBag size={44} className="mx-auto text-stone" />
        <h1 className="font-serif text-2xl font-bold text-pine mt-4">{t('empty_cart')}</h1>
        <Link to="/shop" className="btn-primary mt-6">{t('continue_shopping')}</Link>
      </div>
    );
  }

  const handleApplyPromo = async () => {
    if (!code.trim()) return;
    try {
      const res = await apiPost('/promotions/validate', { code, subtotal: totals.subtotal });
      if (res.valid) {
        applyPromo(res.promo, res.discount);
        toast(t('promo_applied_save').replace('{amount}', formatCurrency(res.discount, settings)), 'success');
        setCode('');
      } else {
        toast(res.reason || t('invalid_code'), 'error');
      }
    } catch { toast(t('validation_failed'), 'error'); }
  };

  const placeOrder = async (payLater = false) => {
    if (!form.email || !form.full_name || !form.address || !form.city) {
      toast(t('complete_details'), 'error');
      return;
    }
    setPlacing(true);
    try {
      const payload = {
        user_id: user?.id || null,
        customer_name: form.full_name,
        customer_email: form.email,
        customer_phone: form.phone,
        shipping_address: { address: form.address, city: form.city, postal_code: form.postal_code, country: form.country },
        items: items.map((it) => ({ product_id: it.product_id, name: it.name, tier: it.tier, quantity: it.quantity, unit_price: it.unit_price, total: it.unit_price * it.quantity })),
        subtotal: totals.subtotal,
        discount_amount: totals.discount,
        discount_code: promo?.code || null,
        shipping_fee: totals.shipping,
        tax_amount: totals.tax,
        total_amount: totals.total,
        payment_method: payment,
        payment_status: 'UNPAID',
        payment_note: payLater ? `PAY LATER — ${paymentNote()}` : paymentNote(),
      };
      const order = await apiPost('/orders', payload);
      clearCart();
      setPlaced(order);
      toast(payLater ? t('order_secured') : t('order_placed_success').replace('{number}', order.order_number), 'success');
    } catch (err) {
      toast(err.message || t('order_failed'), 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <CheckCircle2 size={56} className="mx-auto text-emerald-500" />
        <h1 className="font-serif text-3xl font-bold text-pine mt-5">{t('order_confirmed')}</h1>
        <p className="text-moss mt-3">{t('your_reference')}</p>
        <p className="font-mono text-2xl font-bold text-crimson mt-2">{placed.order_number}</p>
        <p className="text-sm text-moss mt-3 max-w-sm mx-auto">{t('order_confirmed_body')}</p>
        <Link to="/shop" className="btn-primary block mt-8">{t('continue_shopping')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson mb-2">{t('discreet_checkout')}</p>
      <h1 className="section-title mb-8">{t('secure_checkout')} <Lock size={20} className="inline-block text-emerald-600" /></h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
        <div className="space-y-6">
          {/* Customer info */}
          <div className="card p-6">
            <h3 className="font-serif font-semibold uppercase tracking-[0.12em] mb-4">{t('customer_info')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className="label">{t('email')}</label><input className="input" type="email" value={form.email} onChange={set('email')} placeholder={t('ph_email')} /></div>
              <div><label className="label">{t('full_name')}</label><input className="input" value={form.full_name} onChange={set('full_name')} placeholder={t('ph_name')} /></div>
              <div><label className="label">{t('phone')}</label><input className="input" value={form.phone} onChange={set('phone')} placeholder={t('ph_phone')} /></div>
              <div className="sm:col-span-2"><label className="label">{t('delivery_address')}</label><input className="input" value={form.address} onChange={set('address')} placeholder={t('ph_street')} /></div>
              <div><label className="label">{t('city')}</label><input className="input" value={form.city} onChange={set('city')} placeholder={t('city')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">{t('postal_code')}</label><input className="input" value={form.postal_code} onChange={set('postal_code')} placeholder={t('ph_postal')} /></div>
                <div><label className="label">{t('country')}</label>
                  <select className="input" value={form.country} onChange={set('country')}>
                    {[['Germany', 'country_germany'], ['Netherlands', 'country_netherlands'], ['United Kingdom', 'country_uk'], ['France', 'country_france'], ['Spain', 'country_spain'], ['Italy', 'country_italy'], ['Portugal', 'country_portugal'], ['Ireland', 'country_ireland'], ['Austria', 'country_austria'], ['Belgium', 'country_belgium'], ['Switzerland', 'country_switzerland'], ['Canada', 'country_canada']].map(([val, key]) => <option key={val} value={val}>{t(key)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card p-6">
            <h3 className="font-serif font-semibold uppercase tracking-[0.12em] mb-1">{t('payment_method')}</h3>
            <p className="text-[11px] text-moss mb-4">{t('pay_details_hint')}</p>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.id} onClick={() => setPayment(m.id)}
                    className={`flex flex-col items-center justify-center gap-2 border rounded-xl px-4 py-5 transition-all ${payment === m.id ? 'border-crimson bg-crimson/5' : 'border-stone hover:border-crimson/40'}`}>
                    <span className={`flex items-center justify-center w-12 h-12 rounded-lg ${payment === m.id ? 'bg-crimson/10 text-crimson' : 'bg-subcard text-pine'}`}>
                      <Icon size={26} />
                    </span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${payment === m.id ? 'text-crimson' : 'text-pine'}`}>{t(m.labelKey)}</span>
                    <span className={`w-4 h-4 rounded-full border-2 ${payment === m.id ? 'border-crimson bg-crimson' : 'border-stone'}`} />
                  </button>
                );
              })}
            </div>

            {payment === 'CRYPTO' && (
              <div className="mt-4 space-y-4">
                {cryptoWallets.length === 0 ? (
                  <p className="text-xs text-moss bg-subcard rounded-xl p-4">{t('validation_failed')}</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {cryptoWallets.map((w) => (
                        <button key={w.id} onClick={() => setCryptoId(w.id)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${cryptoId === w.id ? 'bg-pine text-canvas' : 'bg-subcard text-moss hover:text-pine'}`}>{w.label}</button>
                      ))}
                    </div>
                    {(() => {
                      const w = cryptoWallets.find((x) => x.id === cryptoId) || cryptoWallets[0];
                      return (
                        <div className="bg-subcard rounded-xl p-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-moss">{t('crypto_wallet')} · {w.label}</p>
                          <p className="font-mono text-xs break-all text-pine mt-1">{w.value}</p>
                          {w.hint && <p className="text-[11px] text-moss mt-2">{w.hint}</p>}
                          <p className="text-[11px] text-moss mt-2">{t('order_after_conf')}</p>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            {payment === 'WIRE' && (
              <div className="mt-4 space-y-3">
                {wireEntries.length === 0 && <p className="text-xs text-moss bg-subcard rounded-xl p-4">{t('validation_failed')}</p>}
                {wireEntries.map((e) => (
                  <div key={e.id} className="bg-subcard rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-moss mb-2">{e.label}</p>
                    <p className="font-mono text-xs whitespace-pre-line text-pine">{e.value}</p>
                    {e.hint && <p className="text-[11px] text-moss mt-2">{e.hint}</p>}
                  </div>
                ))}
              </div>
            )}

            {payment === 'PAYPAL' && (
              <div className="mt-4 space-y-3">
                {paypalEntries.length === 0 && <p className="text-xs text-moss bg-subcard rounded-xl p-4">{t('validation_failed')}</p>}
                {paypalEntries.map((e) => (
                  <div key={e.id} className="bg-subcard rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-moss mb-2">{e.label}</p>
                    {e.value.startsWith('http') ? (
                      <a href={e.value} target="_blank" rel="noreferrer" className="text-sm font-bold text-crimson underline underline-offset-2 break-all">{e.value}</a>
                    ) : (
                      <p className="font-mono text-xs text-pine">{e.value}</p>
                    )}
                    {e.hint && <p className="text-[11px] text-moss mt-2">{e.hint}</p>}
                    <p className="text-[11px] text-moss mt-2">{t('paypal_redirect')}</p>
                  </div>
                ))}
              </div>
            )}

            {payment === 'GIFT' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label">{t('gift_card_type')}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {giftTypes.map((g) => {
                      const selected = giftType === (g.value || g.label);
                      return (
                        <button key={g.id} onClick={() => setGiftType(g.value || g.label)}
                          className={`relative flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold uppercase tracking-wide transition-all ${selected ? 'border-crimson bg-crimson/10 text-crimson' : 'border-stone text-pine hover:border-crimson/40'}`}>
                          {selected && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-crimson" />}
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                  {giftTypes.length === 0 && <p className="text-xs text-moss mt-2">{t('validation_failed')}</p>}
                </div>

                {giftType && (
                  <div className="bg-crimson/5 border border-crimson/25 rounded-xl p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-crimson mb-1">{t('gift_card_type')}</p>
                    <p className="font-serif text-lg font-bold text-pine">{giftTypes.find((g) => (g.value || g.label) === giftType)?.label || giftType}</p>
                    <p className="text-[11px] text-moss mt-1">{t('gift_pay_direct')}</p>
                  </div>
                )}

                <div>
                  <label className="label">{t('gift_card_code')}</label>
                  <input className="input font-mono uppercase" value={giftCode} onChange={(e) => setGiftCode(e.target.value)} placeholder={t('ph_gift')} />
                  <p className="text-[11px] text-moss mt-2">{t('gift_card_hint')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <label className="label">{t('delivery_notes')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input" placeholder={t('ph_delivery')} />
          </div>
        </div>

        {/* Summary */}
        <div className="card h-fit p-6 sticky top-24">
          <h3 className="font-serif font-semibold uppercase tracking-[0.12em] mb-4">{t('order_summary')}</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={it.image} alt={it.name} className="w-11 h-11 rounded-lg object-cover bg-subcard" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-pine truncate">{it.name}</p>
                  <p className="text-[11px] text-moss uppercase">{it.tier || t('standard_tier')} × {it.quantity}</p>
                </div>
                <span className="text-sm font-bold">{formatCurrency(it.unit_price * it.quantity, settings)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            {promo ? (
              <div className="flex items-center justify-between bg-crimson/5 border border-crimson/20 rounded-lg px-3 py-2">
                <span className="text-sm font-bold text-crimson uppercase flex items-center gap-1.5"><Tag size={13} /> {promo.code} — -{formatCurrency(promoDiscount, settings)}</span>
                <button onClick={removePromo} className="text-[10px] font-bold uppercase text-moss hover:text-crimson">{t('remove')}</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('promo_code')} className="input !py-2 text-xs uppercase" />
                <button onClick={handleApplyPromo} className="btn-primary !py-2 !px-4 text-[10px]">{t('apply')}</button>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-stone text-sm">
            <div className="flex justify-between text-moss"><span>{t('subtotal')}</span><span>{formatCurrency(totals.subtotal, settings)}</span></div>
            {totals.discount > 0 && <div className="flex justify-between text-emerald-600"><span>{t('discount')}</span><span>-{formatCurrency(totals.discount, settings)}</span></div>}
            <div className="flex justify-between text-moss"><span>{t('shipping')}</span><span>{totals.shipping === 0 ? t('free') : formatCurrency(totals.shipping, settings)}</span></div>
            <div className="flex justify-between text-moss"><span>{t('tax')}</span><span>{formatCurrency(totals.tax, settings)}</span></div>
            <div className="flex justify-between font-bold text-pine text-lg pt-2 border-t border-stone"><span>{t('total')}</span><span>{formatCurrency(totals.total, settings)}</span></div>
          </div>

          <button onClick={() => placeOrder(false)} disabled={placing} className="btn-primary w-full mt-5 !py-4">
            {placing ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
            {placing ? t('placing_order') : t('place_order')}
          </button>

          <p className="text-[10px] text-moss/70 text-center mt-3">{t('terms_agree')}</p>
        </div>
      </div>
    </div>
  );
}
