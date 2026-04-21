/**
 * Reusable skeleton loader components.
 * Each matches the exact layout of the real content it replaces,
 * so the page doesn't jump when data loads.
 */
import React from 'react';
import './Skeletons.css';

/* ── Primitive building blocks ────────────────────────── */
export const SkBox = ({ h = 16, w = '100%', r = 8, style = {} }) => (
  <div className="sk-box skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />
);

/* ── Snack card (used in HomePage + ShopDetail) ─────── */
export function SnackCardSkeleton({ count = 8 }) {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="sk-snack-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="sk-snack-img skeleton" />
          <div className="sk-snack-body">
            <SkBox h={11} w="45%" r={6} />
            <SkBox h={17} w="80%" r={7} />
            <SkBox h={11} w="60%" r={6} />
            <div className="sk-snack-footer">
              <SkBox h={22} w="55px" r={8} />
              <SkBox h={32} w="32px" r={8} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Shop card (used in ShopsPage) ──────────────────── */
export function ShopCardSkeleton({ count = 6 }) {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="sk-shop-card" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="sk-shop-img skeleton" />
          <div className="sk-shop-body">
            <SkBox h={11} w="35%" r={6} />
            <SkBox h={20} w="75%" r={7} />
            <SkBox h={11} w="55%" r={6} />
            <div className="sk-shop-row">
              <SkBox h={22} w="70px" r={100} />
              <SkBox h={22} w="60px" r={100} />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Order card (used in OrdersPage) ────────────────── */
export function OrderCardSkeleton({ count = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="sk-order-card" style={{ animationDelay: `${i * 0.07}s` }}>
          <div className="sk-order-hdr">
            <SkBox h={14} w="130px" r={6} />
            <SkBox h={26} w="100px" r={100} />
          </div>
          <div className="sk-order-chips">
            <SkBox h={24} w="80px" r={100} />
            <SkBox h={24} w="100px" r={100} />
            <SkBox h={24} w="70px" r={100} />
          </div>
          <div className="sk-order-ftr">
            <SkBox h={14} w="70px" r={6} />
            <SkBox h={36} w="110px" r={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Delivery order card (used in DeliveryDashboard) ── */
export function DeliveryCardSkeleton({ count = 2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="sk-delivery-card" style={{ animationDelay: `${i * 0.07}s` }}>
          <div className="sk-order-hdr">
            <SkBox h={14} w="140px" r={6} />
            <SkBox h={24} w="90px" r={100} />
          </div>
          <div className="sk-shop-row" style={{ marginTop: 10 }}>
            <SkBox h={38} w="38px" r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <SkBox h={14} w="60%" r={6} />
              <SkBox h={11} w="40%" r={5} />
            </div>
          </div>
          <div className="sk-shop-row" style={{ marginTop: 8 }}>
            <SkBox h={34} w="34px" r={9} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <SkBox h={14} w="50%" r={6} />
              <SkBox h={11} w="70%" r={5} />
            </div>
          </div>
          <SkBox h={48} w="100%" r={13} style={{ marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

/* ── Admin stat cards ────────────────────────────────── */
export function StatCardSkeleton({ count = 4 }) {
  return (
    <>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="sk-stat-card" style={{ animationDelay: `${i * 0.06}s` }}>
          <div className="sk-stat-icon skeleton" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkBox h={13} w="55%" r={6} />
            <SkBox h={28} w="70%" r={8} />
          </div>
        </div>
      ))}
    </>
  );
}

/* ── Page-level full-screen skeleton ─────────────────── */
export function PageSkeleton() {
  return (
    <div className="sk-page">
      <div className="sk-page-inner">
        <SkBox h={28} w="200px" r={10} style={{ marginBottom: 6 }} />
        <SkBox h={14} w="140px" r={6} style={{ marginBottom: 28 }} />
        <div className="sk-snack-grid">
          <SnackCardSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
