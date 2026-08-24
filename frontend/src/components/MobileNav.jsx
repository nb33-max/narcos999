import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Store, Heart, ShoppingBag, User } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { useCart } from '../store/CartContext';
import { useWishlist } from '../store/WishlistContext';
import { t } from '../lib/i18n';

function NavTab({ active, badge, onClick, to, label, children }) {
  const cls = `relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${active ? 'text-crimson' : 'text-pine hover:text-crimson'}`;
  const inner = (
    <>
      <span className="relative">
        {children}
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-3.5 h-3.5 px-0.5 bg-crimson text-canvas text-[8px] font-bold rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
        )}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} aria-label={label} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>{inner}</button>
  );
}

export default function MobileNav({ onOpenCart, onOpenAuth }) {
  const { user } = useApp();
  const { count: cartCount } = useCart();
  const { count: savedCount } = useWishlist();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const accountAction = () => {
    if (user) navigate('/account');
    else onOpenAuth();
  };

  const isActive = (to) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(to + '/'));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-stone pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch max-w-md mx-auto">
        <NavTab active={isActive('/')} to="/" label={t('home')} badge={0}>
          <Home size={20} />
        </NavTab>
        <NavTab active={isActive('/shop')} to="/shop" label={t('shop')} badge={0}>
          <Store size={20} />
        </NavTab>
        <NavTab active={isActive('/saved')} to="/saved" label={t('saved')} badge={savedCount}>
          <Heart size={20} />
        </NavTab>
        <NavTab active={false} onClick={onOpenCart} label={t('cart')} badge={cartCount}>
          <ShoppingBag size={20} />
        </NavTab>
        <NavTab active={isActive('/account')} onClick={accountAction} label={t('account')} badge={0}>
          <User size={20} />
        </NavTab>
      </div>
    </nav>
  );
}
