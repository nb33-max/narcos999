import { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { computeCartTotals } from '../lib/format';

const CartContext = createContext(null);
const KEY = 'nb_cart';

function sanitize(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => {
      const price = Number(it.unit_price);
      const qty = Number(it.quantity);
      return {
        ...it,
        unit_price: Number.isFinite(price) && price >= 0 ? price : null,
        quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
        max_qty: Number.isFinite(Number(it.max_qty)) && Number(it.max_qty) > 0 ? Math.floor(Number(it.max_qty)) : 999,
      };
    })
    .filter((it) => it.product_id && it.unit_price !== null);
}
function load() {
  try { return sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return []; }
}
function save(items) {
  localStorage.setItem(KEY, JSON.stringify(sanitize(items)));
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.find((it) => it.product_id === action.item.product_id && it.tier === action.item.tier && it.variant === action.item.variant);
      let next;
      if (existing) {
        next = state.items.map((it) => (it === existing ? { ...it, quantity: Math.min(it.quantity + action.item.quantity, it.max_qty || 999) } : it));
      } else {
        next = [...state.items, action.item];
      }
      save(next);
      return { ...state, items: next };
    }
    case 'SET_QTY': {
      const next = state.items.map((it) => (it.product_id === action.id && it.tier === action.tier ? { ...it, quantity: action.qty } : it)).filter((it) => it.quantity > 0);
      save(next);
      return { ...state, items: next };
    }
    case 'REMOVE': {
      const next = state.items.filter((it) => !(it.product_id === action.id && it.tier === action.tier && it.variant === action.variant));
      save(next);
      return { ...state, items: next };
    }
    case 'CLEAR': {
      save([]);
      return { ...state, items: [] };
    }
    case 'APPLY_PROMO': {
      return { ...state, promo: action.promo, promoDiscount: action.discount };
    }
    case 'REMOVE_PROMO': {
      return { ...state, promo: null, promoDiscount: 0 };
    }
    default:
      return state;
  }
}

export function CartProvider({ children, settings }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ items: load(), promo: null, promoDiscount: 0 }));

  useEffect(() => {
    if (state.items.length) save(state.items);
  }, [state.items]);

  const addItem = useCallback((item) => dispatch({ type: 'ADD', item }), []);
  const setQty = useCallback((id, tier, qty) => dispatch({ type: 'SET_QTY', id, tier, qty }), []);
  const removeItem = useCallback((id, tier, variant) => dispatch({ type: 'REMOVE', id, tier, variant }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const applyPromo = useCallback((promo, discount) => dispatch({ type: 'APPLY_PROMO', promo, discount }), []);
  const removePromo = useCallback(() => dispatch({ type: 'REMOVE_PROMO' }), []);

  const totals = useMemo(() => computeCartTotals(state.items, settings, state.promoDiscount), [state.items, state.promoDiscount, settings]);
  const count = useMemo(() => state.items.reduce((s, it) => s + it.quantity, 0), [state.items]);

  const value = useMemo(() => ({
    items: state.items,
    promo: state.promo,
    promoDiscount: state.promoDiscount,
    totals,
    count,
    addItem, setQty, removeItem, clearCart, applyPromo, removePromo,
  }), [state, totals, count, addItem, setQty, removeItem, clearCart, applyPromo, removePromo]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
