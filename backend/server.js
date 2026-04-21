const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const dotenv    = require('dotenv');
const path      = require('path');
const { connect: connectRedis } = require('./config/redis');

dotenv.config();
connectRedis();

const app = express();

/* ── Security & performance middleware ─────────────────── */
// HTTP compression — reduces response size ~70%
try {
  const compression = require('compression');
  app.use(compression({ level: 6, threshold: 1024 }));
} catch { console.warn('compression not installed — run: npm i compression'); }

// Security headers
try {
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: false, // allow inline scripts/styles for now
    crossOriginEmbedderPolicy: false,
  }));
} catch {}

// CORS — allow localhost in dev, configure FRONTEND_URL in production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

/* ── Static files with long cache headers ──────────────── */
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',           // browser caches images 7 days
  etag:   true,
  lastModified: true,
  setHeaders(res) {
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  },
}));

/* ── Add cache-control headers to API GET responses ─────── */
app.use((req, res, next) => {
  if (req.method === 'GET') {
    // Public shop/snack lists: cache 2 minutes in browser
    if (req.path.startsWith('/api/shops') || req.path.startsWith('/api/snacks')) {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
    } else {
      // Everything else: no cache (auth-sensitive)
      res.setHeader('Cache-Control', 'no-store');
    }
  }
  next();
});

/* ── Routes ────────────────────────────────────────────── */
app.use('/api/auth',       require('./routes/authRoutes'));
app.use('/api/shops',      require('./routes/shopRoutes'));
app.use('/api/snacks',     require('./routes/snackRoutes'));
app.use('/api/orders',     require('./routes/orderRoutes'));
app.use('/api/admin',      require('./routes/adminRoutes'));
app.use('/api/user',       require('./routes/userRoutes'));
app.use('/api/shopkeeper', require('./routes/shopkeeperRoutes'));

/* ── Health check ──────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'SnackZone Running 🍿',
    redis:  require('./config/redis').isConnected,
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed,
  });
});

/* ── Global error handler ──────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

/* ── Start ─────────────────────────────────────────────── */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀 Server → http://localhost:${process.env.PORT || 5000}`));
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });

app.get("/api", (req, res) => {
  res.json({ message: "SnackZone API running" });
});

module.exports = app;
