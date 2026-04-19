# 🍿 SnackZone — Vite + React Frontend

This is the **Vite** version of the SnackZone frontend (converted from Create React App).

---

## ⚡ Why Vite?

| Feature | CRA | Vite |
|---------|-----|------|
| Dev server start | ~10–30s | ~300ms |
| Hot Module Reload | Slow | Instant |
| Build time | Slow | 3–5× faster |
| Bundle size | Larger | Optimised (Rollup) |
| Config | Opaque (webpack) | Simple `vite.config.js` |

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start dev server
```bash
npm run dev
```
→ Runs on `http://localhost:3000`  
→ API calls proxied to `http://localhost:5000` (backend must be running)

### 3. Build for production
```bash
npm run build
```
→ Output in `dist/` folder

### 4. Preview production build
```bash
npm run preview
```

---

## 📁 Project Structure

```
snackzone-vite/
├── index.html              ← Entry HTML (Vite standard)
├── vite.config.js          ← Vite config with proxy
├── package.json
├── .env.example
└── src/
    ├── main.jsx            ← React entry point
    ├── App.jsx             ← Router + providers
    ├── index.css           ← Global design system
    ├── context/
    │   └── AuthContext.jsx ← Auth + cart global state
    ├── components/
    │   ├── common/
    │   │   └── Navbar.jsx
    │   ├── user/
    │   │   └── SnackCard.jsx
    │   └── admin/
    │       └── AdminLayout.jsx
    └── pages/
        ├── HomePage.jsx
        ├── RegisterPage.jsx   ← 3-step: Phone OTP → Info → Address
        ├── LoginPage.jsx      ← Phone + Password + OTP
        ├── AdminLogin.jsx
        ├── CartPage.jsx
        ├── CheckoutPage.jsx   ← COD, Card, GPay, PhonePe, Paytm
        ├── OrdersPage.jsx
        ├── OrderTrackPage.jsx ← Live Leaflet map tracking
        ├── ProfilePage.jsx
        └── admin/
            ├── AdminDashboard.jsx
            ├── AdminSnacks.jsx
            └── AdminOrders.jsx
```

---

## 🔌 API Proxy

The `vite.config.js` proxies `/api` and `/uploads` to `http://localhost:5000`:

```js
server: {
  proxy: {
    '/api':     { target: 'http://localhost:5000', changeOrigin: true },
    '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
  }
}
```

No CORS issues in development. In production, deploy backend separately and set:
```
VITE_API_URL=https://your-backend-url.com
```

---

## 🔑 Key Differences from CRA version

| Item | CRA | Vite |
|------|-----|------|
| Entry file | `src/index.js` | `src/main.jsx` |
| HTML template | `public/index.html` | `index.html` (root) |
| Env vars | `REACT_APP_*` | `VITE_*` |
| File extensions | `.js` works | `.jsx` recommended |
| Proxy config | `"proxy"` in package.json | `vite.config.js` |
| Module type | CommonJS | ES Modules (`"type": "module"`) |

---

## 🌐 Connecting to Backend

Make sure the backend is running:
```bash
cd ../backend
npm run dev   # starts on port 5000
```

Then start the frontend:
```bash
npm run dev   # starts on port 3000
```

---

## 🛡️ Default Admin Credentials

After running `node seed.js` in the backend:
- **URL:** `http://localhost:3000/admin/login`
- **Phone:** `+919999999999`
- **Password:** `admin123`
