let cachedSettings = null;

export function formatCurrency(amount, settings = cachedSettings) {
  if (amount === null || amount === undefined) return '';
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const sym = settings?.currency_symbol || '€';
  const pos = settings?.symbol_position || 'before';
  const decimals = settings?.decimal_places ?? 2;
  const th = settings?.thousand_separator || ',';
  const dec = settings?.decimal_separator || '.';
  const fixed = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [int, frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, th);
  const body = frac !== undefined ? grouped + dec + frac : grouped;
  return pos === 'after' ? `${body} ${sym}` : `${sym}${body}`;
}

export function setFormatSettings(s) {
  cachedSettings = s;
}

export function getProductPrice(product) {
  if (product.price_on_request) return null;
  return product.price ?? 0;
}

export function computeCartTotals(items, settings, promoDiscount = 0) {
  const valid = (items || []).filter((it) => Number.isFinite(Number(it.unit_price)) && Number.isFinite(Number(it.quantity)));
  const subtotal = valid.reduce((sum, it) => sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 0), 0);
  const discount = promoDiscount || 0;
  const freeShippingMin = settings?.free_shipping_min || 150;
  const shipping = subtotal - discount >= freeShippingMin || subtotal === 0 ? 0 : settings?.flat_delivery_fee ?? 12;
  const tax = (subtotal - discount) * ((settings?.tax_percent || 0) / 100);
  const total = subtotal - discount + shipping + tax;
  return { subtotal, discount, shipping, tax, total, freeShippingMin, remaining: Math.max(0, freeShippingMin - (subtotal - discount)) };
}

export function uuid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function timeAgo(isoStr) {
  if (!isoStr) return '';
  const t = new Date(isoStr + (isoStr.length === 19 ? 'Z' : ''));
  const diff = Date.now() - t.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return t.toLocaleDateString();
}

export function formatDate(isoStr) {
  if (!isoStr) return '';
  const t = new Date(isoStr + (isoStr.length === 19 ? 'Z' : ''));
  return t.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const STATUS_COLORS = {
  PENDING: '#F59E0B',
  CONFIRMED: '#3B82F6',
  PROCESSING: '#F59E0B',
  PACKED: '#8B5CF6',
  SHIPPED: '#3B82F6',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
  REFUNDED: '#6B7280',
  UNPAID: '#F59E0B',
  PAID: '#10B981',
  FAILED: '#EF4444',
  UNREAD: '#F59E0B',
  READ: '#3B82F6',
  REPLIED: '#10B981',
};
