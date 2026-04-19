import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// User
import HomePage        from './pages/HomePage.jsx';
import ShopsPage       from './pages/ShopsPage.jsx';
import ShopDetailPage  from './pages/ShopDetailPage.jsx';
import RegisterPage    from './pages/RegisterPage.jsx';
import LoginPage       from './pages/LoginPage.jsx';
import CartPage        from './pages/CartPage.jsx';
import CheckoutPage    from './pages/CheckoutPage.jsx';
import OrdersPage      from './pages/OrdersPage.jsx';
import OrderTrackPage  from './pages/OrderTrackPage.jsx';
import ProfilePage     from './pages/ProfilePage.jsx';
// Admin
import AdminDashboard  from './pages/admin/AdminDashboard.jsx';
import AdminShops      from './pages/admin/AdminShops.jsx';
import AdminSnacks     from './pages/admin/AdminSnacks.jsx';
import AdminOrders     from './pages/admin/AdminOrders.jsx';
import AdminApprovals  from './pages/admin/AdminApprovals.jsx';
import AdminUsers      from './pages/admin/AdminUsers.jsx';
import AdminLogin      from './pages/AdminLogin.jsx';
// Shopkeeper
import ShopkeeperDashboard from './pages/shopkeeper/ShopkeeperDashboard.jsx';
import ShopkeeperSnacks    from './pages/shopkeeper/ShopkeeperSnacks.jsx';
import ShopkeeperOrders    from './pages/shopkeeper/ShopkeeperOrders.jsx';
import ShopkeeperShop      from './pages/shopkeeper/ShopkeeperShop.jsx';

import Navbar from './components/common/Navbar.jsx';
// Delivery
import DeliveryDashboard from './pages/delivery/DeliveryDashboard.jsx';
import DeliveryOrderPage from './pages/delivery/DeliveryOrderPage.jsx';

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

      <Routes>
        {/* Public */}
        <Route path="/"            element={<HomePage />} />
        <Route path="/shops"       element={<ShopsPage />} />
        <Route path="/shops/:id"   element={<ShopDetailPage />} />
        <Route path="/register"    element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/login"       element={<PublicRoute><LoginPage    /></PublicRoute>} />
        <Route path="/admin/login" element={<PublicRoute><AdminLogin   /></PublicRoute>} />

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
        <Route path="/admin/users"       element={<AdminRoute><AdminUsers      /></AdminRoute>} />

        {/* Shopkeeper panel */}
        <Route path="/shopkeeper"        element={<ShopkeeperRoute><ShopkeeperDashboard /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/pending" element={<ShopkeeperRoute><ShopkeeperDashboard /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/snacks" element={<ShopkeeperRoute><ShopkeeperSnacks    /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/orders" element={<ShopkeeperRoute><ShopkeeperOrders    /></ShopkeeperRoute>} />
        <Route path="/shopkeeper/shop"   element={<ShopkeeperRoute><ShopkeeperShop      /></ShopkeeperRoute>} />

        {/* Delivery portal */}
        <Route path="/delivery"            element={<DeliveryRoute><DeliveryDashboard /></DeliveryRoute>} />
        <Route path="/delivery/order/:id"  element={<DeliveryRoute><DeliveryOrderPage /></DeliveryRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
