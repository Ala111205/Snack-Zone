import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

/* ── Page loading fallback ────────────────────────────── */
const PageFallback = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh' }}>
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
      <div className="spinner" style={{ width:48, height:48 }} />
      <p style={{ fontFamily:'var(--font-display)', color:'var(--text-muted)', fontSize:'0.88rem' }}>Loading…</p>
    </div>
  </div>
);

// User
import HomePage        from './pages/HomePage.jsx';
import ShopsPage       from './pages/ShopsPage.jsx';
import ShopDetailPage  from './pages/ShopDetailPage.jsx';
import RegisterPage    from './pages/RegisterPage.jsx';
import LoginPage       from './pages/LoginPage.jsx';
const CartPage        = lazy(() => import('./pages/CartPage.jsx'));
const CheckoutPage    = lazy(() => import('./pages/CheckoutPage.jsx'));
const OrdersPage      = lazy(() => import('./pages/OrdersPage.jsx'));
const OrderTrackPage  = lazy(() => import('./pages/OrderTrackPage.jsx'));
const ProfilePage     = lazy(() => import('./pages/ProfilePage.jsx'));
// Admin
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminShops      = lazy(() => import('./pages/admin/AdminShops.jsx'));
const AdminSnacks     = lazy(() => import('./pages/admin/AdminSnacks.jsx'));
const AdminOrders     = lazy(() => import('./pages/admin/AdminOrders.jsx'));
const AdminApprovals  = lazy(() => import('./pages/admin/AdminApprovals.jsx'));
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminLogin      = lazy(() => import('./pages/AdminLogin.jsx'));
const ForgotPassword  = lazy(() => import('./pages/ForgotPassword.jsx'));
// Shopkeeper
const ShopkeeperDashboard = lazy(() => import('./pages/shopkeeper/ShopkeeperDashboard.jsx'));
const ShopkeeperSnacks    = lazy(() => import('./pages/shopkeeper/ShopkeeperSnacks.jsx'));
const ShopkeeperOrders    = lazy(() => import('./pages/shopkeeper/ShopkeeperOrders.jsx'));
const ShopkeeperShop      = lazy(() => import('./pages/shopkeeper/ShopkeeperShop.jsx'));

import Navbar from './components/common/Navbar.jsx';
// Delivery
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard.jsx'));
const DeliveryOrderPage = lazy(() => import('./pages/delivery/DeliveryOrderPage.jsx'));
const DeliveryEarnings    = lazy(() => import('./pages/delivery/DeliveryEarnings.jsx'));
const AdminLiveTracking = lazy(() => import('./pages/admin/AdminLiveTracking.jsx'));

/* ── Helpers ─────────────────────────────────── */
const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
    <div className="spinner" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
};

const ShopkeeperRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== 'shopowner') return <Navigate to="/login" replace />;
  return children;
};

const DeliveryRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== 'delivery') return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user?.role === 'admin')     return <Navigate to="/admin"      replace />;
  if (user?.role === 'shopowner') return <Navigate to="/shopkeeper" replace />;
  if (user?.role === 'delivery')  return <Navigate to="/delivery"   replace />;
  if (user)                       return <Navigate to="/"           replace />;
  return children;
};

/* ── All routes ────────────────────────────── */
function AppRoutes() {
  const location = useLocation();
  const isAdminPanel      = location.pathname.startsWith('/admin')      && location.pathname !== '/admin/login';
  const isDeliveryPanel   = location.pathname.startsWith('/delivery');
  const isShopkeeperPanel = location.pathname.startsWith('/shopkeeper');

  return (
    <>
      {!isAdminPanel && !isShopkeeperPanel && !isDeliveryPanel && <Navbar />}

      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/"            element={<HomePage />} />
        <Route path="/shops"       element={<ShopsPage />} />
        <Route path="/shops/:id"   element={<ShopDetailPage />} />
        <Route path="/register"        element={<PublicRoute><RegisterPage    /></PublicRoute>} />
        <Route path="/login"           element={<PublicRoute><LoginPage       /></PublicRoute>} />
        <Route path="/admin/login"     element={<PublicRoute><AdminLogin      /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* User protected */}
        <Route path="/cart"             element={<ProtectedRoute><CartPage       /></ProtectedRoute>} />
        <Route path="/checkout"         element={<ProtectedRoute><CheckoutPage   /></ProtectedRoute>} />
        <Route path="/orders"           element={<ProtectedRoute><OrdersPage     /></ProtectedRoute>} />
        <Route path="/orders/:id/track" element={<ProtectedRoute><OrderTrackPage /></ProtectedRoute>} />
        <Route path="/profile"          element={<ProtectedRoute><ProfilePage    /></ProtectedRoute>} />

        {/* Admin panel */}
        <Route path="/admin"            element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/shops"      element={<AdminRoute><AdminShops     /></AdminRoute>} />
        <Route path="/admin/snacks"     element={<AdminRoute><AdminSnacks    /></AdminRoute>} />
        <Route path="/admin/orders"     element={<AdminRoute><AdminOrders    /></AdminRoute>} />
        <Route path="/admin/approvals"  element={<AdminRoute><AdminApprovals /></AdminRoute>} />
        <Route path="/admin/users"         element={<AdminRoute><AdminUsers        /></AdminRoute>} />
        <Route path="/admin/live-tracking" element={<AdminRoute><AdminLiveTracking /></AdminRoute>} />

        {/* Shopkeeper panel */}
        <Route path="/shopkeeper"        element={<ShopkeeperRoute><ShopkeeperDashboard /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/pending" element={<ShopkeeperRoute><ShopkeeperDashboard /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/snacks" element={<ShopkeeperRoute><ShopkeeperSnacks    /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/orders" element={<ShopkeeperRoute><ShopkeeperOrders    /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/shop"   element={<ShopkeeperRoute><ShopkeeperShop      /></ShopkeeperRoute>} />

        {/* Delivery portal */}
        <Route path="/delivery"            element={<DeliveryRoute><DeliveryDashboard /></DeliveryRoute>} />
        <Route path="/delivery/order/:id"  element={<DeliveryRoute><DeliveryOrderPage /></DeliveryRoute>} />
        <Route path="/delivery/earnings"   element={<DeliveryRoute><DeliveryEarnings  /></DeliveryRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: { fontFamily:'DM Sans', borderRadius:'12px', background:'#1A1A2E', color:'#fff', padding:'12px 20px' },
            success: { iconTheme: { primary:'#FF6B2B', secondary:'#fff' } },
            duration: 3000,
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}