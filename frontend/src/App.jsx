import { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useApp } from './store/AppContext.jsx';
import { useCart } from './store/CartContext.jsx';
import { CartProvider } from './store/CartContext.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import SearchModal from './components/SearchModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import RestrictedPage from './pages/RestrictedPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BotPanel from './pages/BotPanel.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import AgeVerificationModal, { isAgeVerified } from './components/AgeVerificationModal.jsx';
import FloatingMessage from './components/FloatingMessage.jsx';
import MobileNav from './components/MobileNav.jsx';

const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const ShopPage = lazy(() => import('./pages/ShopPage.jsx'));
const ProductPage = lazy(() => import('./pages/ProductPage.jsx'));
const SavedPage = lazy(() => import('./pages/SavedPage.jsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const InfoPage = lazy(() => import('./pages/InfoPage.jsx'));

function Shell() {
  const { availability, settings, loading, trackEvent } = useApp();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [ageOpen, setAgeOpen] = useState(() => !isAgeVerified());
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!availability.allowed) return;
    trackEvent('pageview');
    window.scrollTo(0, 0);
  }, [location.pathname, loading, availability.allowed, trackEvent]);

  if (loading) return <LoadingScreen />;

  if (!availability.allowed) {
    return <RestrictedPage />;
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 lg:pb-0">
      <Header onOpenCart={() => setCartOpen(true)} onOpenSearch={() => setSearchOpen(true)} onOpenAuth={() => setAuthOpen(true)} />
      <main className="flex-1">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<InfoPage type="faq" />} />
            <Route path="/payments" element={<InfoPage type="payments" />} />
            <Route path="/terms" element={<InfoPage type="terms" />} />
            <Route path="/privacy" element={<InfoPage type="privacy" />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <MobileNav onOpenCart={() => setCartOpen(true)} onOpenAuth={() => setAuthOpen(true)} />
      <FloatingMessage onOpenAuth={() => setAuthOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AgeVerificationModal open={ageOpen} onVerify={() => setAgeOpen(false)} />
    </div>
  );
}

export default function App() {
  const { settings, loading } = useApp();
  const location = useLocation();
  if (location.pathname.startsWith('/admin/bot')) {
    return loading ? <LoadingScreen /> : <BotPanel />;
  }
  if (location.pathname.startsWith('/admin')) {
    return loading ? <LoadingScreen /> : <AdminPage />;
  }
  return (
    <CartProvider settings={settings}>
      <Shell />
    </CartProvider>
  );
}
