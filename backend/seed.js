/**
 * SnackZone v3 — Seed Script
 * Creates: Admin + 2 Shops (auto-approved) + sample snacks + 1 shopkeeper (pending)
 * Run: node seed.js
 */
const mongoose = require('mongoose');
const User     = require('./models/User');
const Shop     = require('./models/Shop');
const Snack    = require('./models/Snack');
require('dotenv').config();

const ADMIN = { name:'SnackZone Admin', phone:'+919999999999', password:'admin123', role:'admin', isVerified:true };

const SHOPS = [
  {
    name: 'SnackHub Chennai', description: 'Premium snacks across Chennai in 45 minutes',
    city:'Chennai', state:'Tamil Nadu', address:'12, Anna Nagar', pincode:'600040',
    location:{ lat:13.0843, lng:80.2101 },
    serviceCities:['Chennai','Tambaram','Avadi'],
    servicePincodes:['600040','600001','600002','600010','600050'],
    deliveryFee:40, freeDeliveryAbove:299, status:'approved', isActive:true, isVerified:true,
    estimatedDeliveryTime:'30–45 mins',
  },
  {
    name: 'KPM Snacks Kanchipuram', description: 'Local snacks in Kanchipuram & surroundings',
    city:'Kanchipuram', state:'Tamil Nadu', address:'5, Gandhi Road', pincode:'631501',
    location:{ lat:12.8342, lng:79.7036 },
    serviceCities:['Kanchipuram','Sriperumbudur','Walajabad'],
    servicePincodes:['631501','631502','631551'],
    deliveryFee:30, freeDeliveryAbove:249, status:'approved', isActive:true, isVerified:true,
    estimatedDeliveryTime:'35–50 mins',
  },
];

const SNACKS_PER_SHOP = [
  [
    { name:'Masala Lays',    description:'Spicy masala crisps',              price:20, originalPrice:25, category:'chips',     quantity:100, isFeatured:true },
    { name:'Oreo Cookies',  description:'Cream-filled sandwich cookies',     price:35, originalPrice:40, category:'cookies',   quantity:80,  isFeatured:true },
    { name:'KitKat',        description:'Crispy wafer chocolate bar',        price:40,                   category:'chocolate', quantity:60 },
    { name:'Mixed Nuts',    description:'Cashews, almonds & peanuts',        price:120,originalPrice:150,category:'nuts',      quantity:40 },
    { name:'Mango Fruity',  description:'Fresh mango drink 200ml',           price:15,                   category:'beverages', quantity:200 },
  ],
  [
    { name:'Ribbon Pakoda', description:'Crispy local ribbon pakoda',        price:30, originalPrice:35, category:'chips',     quantity:60,  isFeatured:true },
    { name:'Murukku',       description:'Traditional rice-flour murukku',    price:25,                   category:'chips',     quantity:80,  isFeatured:true },
    { name:'Coconut Cookies',description:'Home-made coconut biscuits',       price:40,                   category:'cookies',   quantity:50 },
    { name:'Dry Fruits Mix',description:'Cashew, raisin and almond mix',     price:150,originalPrice:180,category:'nuts',      quantity:30 },
    { name:'Badam Milk',    description:'Chilled almond milk 200ml',         price:20,                   category:'beverages', quantity:100 },
  ],
];

// Demo delivery boy
const DELIVERY_BOY = {
  name:'Vijay Delivery', phone:'+917777777777', password:'vijay123', role:'delivery',
  isVerified:true,
};

// A pending shopkeeper to demo the approval workflow
const PENDING_SHOPKEEPER = {
  name:'Ravi Snacks Owner', phone:'+918888888888', password:'ravi123', role:'shopowner',
  isVerified:true, shopApprovalStatus:'pending',
};
const PENDING_SHOP = {
  name:'Ravi Snacks Salem', city:'Salem', state:'Tamil Nadu',
  address:'10, Omalur Road, Salem', pincode:'636004',
  serviceCities:['Salem','Attur'], servicePincodes:['636004','636121'],
  deliveryFee:35, freeDeliveryAbove:299, status:'pending', isActive:false, isVerified:false,
  description:'Best local snacks in Salem',
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB Connected');

  /* Admin */
  let admin = await User.findOne({ phone: ADMIN.phone });
  if (!admin) {
    admin = await User.create(ADMIN);
    console.log('✅ Admin created:', ADMIN.phone, '/', ADMIN.password);
  } else {
    console.log('ℹ️  Admin already exists');
  }

  /* Delivery boy */
  let dbUser = await User.findOne({ phone: DELIVERY_BOY.phone });
  if (!dbUser) {
    dbUser = await User.create(DELIVERY_BOY);
    console.log('✅ Delivery boy created:', DELIVERY_BOY.phone, '/', DELIVERY_BOY.password);
  }

  /* Approved shops + snacks */
  for (let i = 0; i < SHOPS.length; i++) {
    let shop = await Shop.findOne({ name: SHOPS[i].name });
    if (!shop) {
      shop = await Shop.create({ ...SHOPS[i], owner: admin._id, ownerName: admin.name, ownerPhone: ADMIN.phone, approvedBy: admin._id, approvedAt: new Date() });
      console.log(`✅ Shop created: ${shop.name}`);
    }
    const existing = await Snack.countDocuments({ shop: shop._id });
    if (existing === 0) {
      await Snack.insertMany(SNACKS_PER_SHOP[i].map(s => ({ ...s, shop: shop._id })));
      console.log(`   └─ ${SNACKS_PER_SHOP[i].length} snacks added to ${shop.name}`);
    }
  }

  /* Pending shopkeeper */
  let skUser = await User.findOne({ phone: PENDING_SHOPKEEPER.phone });
  if (!skUser) {
    skUser = await User.create(PENDING_SHOPKEEPER);
    const skShop = await Shop.create({ ...PENDING_SHOP, owner: skUser._id, ownerName: skUser.name, ownerPhone: skUser.phone });
    skUser.shopId = skShop._id;
    await skUser.save();
    console.log('✅ Pending shopkeeper created:', PENDING_SHOPKEEPER.phone, '/', PENDING_SHOPKEEPER.password);
    console.log(`   └─ Shop "${skShop.name}" pending approval`);
  } else {
    console.log('ℹ️  Pending shopkeeper already exists');
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('   ADMIN:      Phone:', ADMIN.phone,              '| Pass:', ADMIN.password, '→ /admin/login');
  console.log('   DELIVERY:   Phone:', DELIVERY_BOY.phone,       '| Pass:', DELIVERY_BOY.password, '→ /login');
  console.log('   SHOPKEEPER: Phone:', PENDING_SHOPKEEPER.phone,  '| Pass:', PENDING_SHOPKEEPER.password, '→ /login (pending approval)');
  console.log('\n   Admin panel → http://localhost:3000/admin/login');
  console.log('   Shopkeeper  → http://localhost:3000/login\n');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
