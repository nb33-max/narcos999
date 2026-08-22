import { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';

const WishlistContext = createContext(null);
const KEY = 'nb_wishlist';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': {
      const exists = state.some((p) => p.id === action.product.id);
      const next = exists ? state.filter((p) => p.id !== action.product.id) : [action.product, ...state];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }
    case 'REMOVE': {
      const next = state.filter((p) => p.id !== action.id);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }
    case 'CLEAR': {
      localStorage.setItem(KEY, '[]');
      return [];
    }
    default:
      return state;
  }
}

export function WishlistProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, load);
  const toggle = useCallback((product) => {
    const exists = items.some((p) => p.id === product.id);
    dispatch({ type: 'TOGGLE', product });
    return !exists;
  }, [items]);
  const remove = useCallback((id) => dispatch({ type: 'REMOVE', id }), []);
  const isSaved = useCallback((id) => items.some((p) => p.id === id), [items]);

  const value = useMemo(() => ({ items, count: items.length, toggle, remove, isSaved }), [items, toggle, remove, isSaved]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}
