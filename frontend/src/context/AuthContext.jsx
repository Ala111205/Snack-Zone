import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();
const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('snackzone_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart,    setCart]    = useState([]);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('sz_city') || '');

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await API.get('/auth/me');
      setUser(data);
      setCart(data.cart || []);
      if (data.currentCity && !localStorage.getItem('sz_city')) setSelectedCity(data.currentCity);
    } catch {
      localStorage.removeItem('snackzone_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('snackzone_token');
    if (token) fetchMe(); else setLoading(false);
  }, [fetchMe]);

  const changeCity = (city) => {
    setSelectedCity(city);
    localStorage.setItem('sz_city', city);
    if (user) API.put('/user/profile', { currentCity: city }).catch(() => {});
  };

  /* ── Auth ── */
  const login = async (phone, password, otp) => {
    const { data } = await API.post('/auth/login', { phone, password, otp });
    localStorage.setItem('snackzone_token', data.token);
    setUser(data.user);
    setCart(data.user.cart || []);
    return data;
  };

  const adminLogin = async (phone, password) => {
    const { data } = await API.post('/auth/admin-login', { phone, password });
    localStorage.setItem('snackzone_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const { data } = await API.post('/auth/register', formData);
    return data;
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    localStorage.removeItem('snackzone_token');
    setUser(null);
    setCart([]);
    toast.success('Logged out');
  };

  const sendOTP = async (phone, purpose) => {
    const { data } = await API.post('/auth/send-otp', { phone, purpose });
    return data;
  };

  /* ── Cart — single-shop enforcement ── */
  const cartShopId = cart.length > 0 ? (cart[0]?.shop?._id || cart[0]?.shop || '') : '';

  const addToCart = async (snack, quantity = 1) => {
    if (!user) return { success: false, reason: 'login' };
    const snackShopId = snack.shop?._id || snack.shop || '';
    if (cartShopId && snackShopId && cartShopId.toString() !== snackShopId.toString())
      return { success: false, reason: 'different_shop', shopName: snack.shop?.name };

    const existing = cart.find(c => (c.snack?._id || c.snack) === snack._id);
    const newCart  = existing
      ? cart.map(c => (c.snack?._id || c.snack) === snack._id ? { ...c, quantity: c.quantity + quantity } : c)
      : [...cart, { snack, quantity, shop: snack.shop }];
    setCart(newCart);
    try {
      await API.post('/user/cart', { cart: newCart.map(c => ({ snack: c.snack?._id || c.snack, quantity: c.quantity, shop: c.shop?._id || c.shop })) });
    } catch {}
    return { success: true };
  };

  const clearCartAndAdd = async (snack, quantity = 1) => {
    const newCart = [{ snack, quantity, shop: snack.shop }];
    setCart(newCart);
    try { await API.post('/user/cart', { cart: newCart.map(c => ({ snack: c.snack?._id || c.snack, quantity: c.quantity, shop: c.shop?._id || c.shop })) }); } catch {}
    return { success: true };
  };

  const removeFromCart = async (snackId) => {
    const newCart = cart.filter(c => (c.snack?._id || c.snack) !== snackId);
    setCart(newCart);
    try { await API.post('/user/cart', { cart: newCart.map(c => ({ snack: c.snack?._id || c.snack, quantity: c.quantity, shop: c.shop?._id || c.shop })) }); } catch {}
  };

  const updateCartQty = async (snackId, quantity) => {
    if (quantity < 1) return removeFromCart(snackId);
    const newCart = cart.map(c => (c.snack?._id || c.snack) === snackId ? { ...c, quantity } : c);
    setCart(newCart);
    try { await API.post('/user/cart', { cart: newCart.map(c => ({ snack: c.snack?._id || c.snack, quantity: c.quantity, shop: c.shop?._id || c.shop })) }); } catch {}
  };

  const clearCart = async () => {
    setCart([]);
    try { await API.post('/user/cart', { cart: [] }); } catch {}
  };

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + (c.snack?.price || 0) * c.quantity, 0);

  return (
    <AuthContext.Provider value={{
      user, loading, cart, cartCount, cartTotal, cartShopId,
      selectedCity, changeCity,
      login, adminLogin, register, logout, sendOTP, fetchMe,
      addToCart, clearCartAndAdd, removeFromCart, updateCartQty, clearCart,
      API,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { API };
