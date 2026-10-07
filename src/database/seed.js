// Usage (from the server folder):
//   npm run seed        -> creates the first Super Admin (from .env) if it does not exist
//   npm run seed:demo   -> also loads DEMO warehouses, users, products and sales requests
//
// DEVELOPMENT ONLY. The demo accounts all share one well-known password. Never use this in production.
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from './connection.js';
import User from '../modules/users/models/User.js';
import Warehouse from '../modules/warehouses/models/Warehouse.js';
import Product from '../modules/products/models/Product.js';
import SubProduct from '../modules/sub-products/models/SubProduct.js';
import Consumable from '../modules/consumables/models/Consumable.js';
import SalesRequest from '../modules/sales/models/SalesRequest.js';
import StockTransaction from '../modules/inventory/models/StockTransaction.js';
import Setting from '../modules/settings/models/Setting.js';
import { nextCode } from './Counter.js';
import { password as validPassword, email as validEmail } from '../utils/validate.js';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@12345';
const wantDemo = process.argv.includes('--demo');

async function ensureSuperAdmin() {
  if (!env.superAdmin.email || !env.superAdmin.password) {
    throw new Error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in server/.env first.');
  }
  const email = validEmail(env.superAdmin.email);
  validPassword(env.superAdmin.password);
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Super Admin already exists: ${email}`);
    return existing;
  }
  const admin = await User.create({
    name: env.superAdmin.name,
    email,
    passwordHash: await bcrypt.hash(env.superAdmin.password, 10),
    role: 'super_admin',
    warehouseId: null,
  });
  console.log(`Super Admin created: ${email}`);
  return admin;
}

async function loadDemoData(superAdmin) {
  if (await Warehouse.exists({})) {
    console.log('Demo data skipped: warehouses already exist (the demo loads only into an empty system).');
    return;
  }
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Warehouses
  const [wh1, wh2] = await Warehouse.create([
    { code: 'WH-01', name: 'Coimbatore Main', location: 'Chinnavedampatti, Coimbatore', phone: '+91 90000 00001', email: 'coimbatore@interopacktech.demo', description: 'Primary distribution warehouse' },
    { code: 'WH-02', name: 'Chennai Hub', location: 'Ambattur Industrial Estate, Chennai', phone: '+91 90000 00002', email: 'chennai@interopacktech.demo', description: 'North region dispatch hub' },
  ]);
  await Setting.findOneAndUpdate({ _id: 'inventory' }, { $set: { lowStockThreshold: 50 } }, { upsert: true });

  // 2. Products + opening-stock ledger rows
  const defs = [
    { name: '5-Ply Corrugated Box (12x10x8)', category: 'Corrugated Boxes', price: 42, stock: 500, wh: wh1, description: 'Heavy-duty shipping carton' },
    { name: 'Bubble Wrap Roll 1m x 50m', category: 'Protective Packaging', price: 650, stock: 120, wh: wh1, description: 'Air bubble cushioning roll' },
    { name: 'BOPP Packing Tape 48mm', category: 'Tapes', price: 38, stock: 30, wh: wh1, description: 'Clear 100m tape' },
    { name: 'Stretch Film 500mm', category: 'Packaging Film', price: 320, stock: 0, wh: wh1, description: 'Pallet wrapping film' },
    { name: 'Thermal Label Roll 100x150', category: 'Labels', price: 210, stock: 260, wh: wh2, description: 'Barcode label roll' },
    { name: '3-Ply Corrugated Box (9x6x4)', category: 'Corrugated Boxes', price: 24, stock: 800, wh: wh2, description: 'Light-duty carton' },
  ];
  const products = [];
  for (const d of defs) {
    const product = await Product.create({
      code: await nextCode('PRD', 4), name: d.name, category: d.category, description: d.description,
      price: d.price, stockQuantity: d.stock, warehouseId: d.wh._id,
    });
    await StockTransaction.create({
      type: 'INITIAL', productId: product._id, productName: product.name, warehouseId: product.warehouseId,
      quantityChange: d.stock, balanceAfter: d.stock, reason: 'Opening stock',
      performedBy: superAdmin._id, performedByName: superAdmin.name,
    });
    products.push(product);
  }

  // 3. Sub-products and consumables
  await SubProduct.create([
    { name: 'Box Divider Pad', parentProductId: products[0]._id, parentProductName: products[0].name, warehouseId: wh1._id, quantity: 300, price: 6, description: 'Cardboard divider for 12x10x8 box' },
    { name: 'Bubble Wrap Sheet 30cm', parentProductId: products[1]._id, parentProductName: products[1].name, warehouseId: wh1._id, quantity: 150, price: 18, description: 'Pre-cut sheet' },
  ]);
  await Consumable.create([
    { name: 'Glue Adhesive Drum', warehouseId: wh1._id, quantity: 12, price: 4500, description: 'Water-based box glue, 20 L' },
    { name: 'Strapping Band Roll', warehouseId: wh2._id, quantity: 40, price: 900, description: 'PP strapping, 16mm' },
  ]);

  // 4. Users
  const [, , sales] = await User.create([
    { name: 'Anitha Admin', email: 'admin@interopacktech.demo', passwordHash: hash, role: 'admin', warehouseId: wh1._id },
    { name: 'Mohan Manager', email: 'manager@interopacktech.demo', passwordHash: hash, role: 'manager', warehouseId: wh1._id },
    { name: 'Sathya Sales', email: 'sales@interopacktech.demo', passwordHash: hash, role: 'sales', warehouseId: wh1._id },
  ]);

  // 5. Three PENDING requests (stock is untouched until someone approves them)
  const picks = [[products[0], 100, 'Urgent order for retail customer'], [products[1], 20, 'Monthly repeat order'], [products[2], 10, 'Packing line refill']];
  for (const [p, qty, notes] of picks) {
    await SalesRequest.create({
      requestNo: await nextCode('SR', 6), salesUserId: sales._id, salesUserName: sales.name,
      warehouseId: wh1._id, warehouseName: wh1.name, productId: p._id, productName: p.name,
      quantity: qty, price: p.price, totalAmount: p.price * qty, notes,
    });
  }

  console.log('Demo data loaded.');
  console.log(`Demo logins (password ${DEMO_PASSWORD}): admin@ / manager@ / sales@interopacktech.demo`);
}

try {
  await connectDb();
  const superAdmin = await ensureSuperAdmin();
  if (wantDemo) await loadDemoData(superAdmin);
} catch (err) {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
