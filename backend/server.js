const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');
const path     = require('path');
const { connect: connectRedis } = require('./config/redis');

dotenv.config();

// Connect Redis early
connectRedis();

const app = express();

app.use(cors({ origin: ['http://localhost:3000','http://localhost:5173'], credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/shops',       require('./routes/shopRoutes'));
app.use('/api/snacks',      require('./routes/snackRoutes'));
app.use('/api/orders',      require('./routes/orderRoutes'));
app.use('/api/admin',       require('./routes/adminRoutes'));
app.use('/api/user',        require('./routes/userRoutes'));
app.use('/api/shopkeeper',  require('./routes/shopkeeperRoutes'));   // ← NEW

app.get('/api/health', (req, res) => res.json({ status:'SnackZone v2 Running 🍿', redis: require('./config/redis').isConnected }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(process.env.PORT || 5000, () => console.log(`🚀 Server on port ${process.env.PORT||5000}`));
  })
  .catch(err => { console.error('❌', err.message); process.exit(1); });

module.exports = app;
