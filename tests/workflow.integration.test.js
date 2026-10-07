// END-TO-END TEST of the business rules, against a real (in-memory) MongoDB replica set.
//   npm test
// The first run downloads a MongoDB binary (~100 MB) and needs internet. Later runs are fast.
// It does NOT touch your real database.
import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import bcrypt from 'bcryptjs';

let MongoMemoryReplSet = null;
try {
  ({ MongoMemoryReplSet } = await import('mongodb-memory-server'));
} catch {
  /* dev dependency not installed -> the suite is skipped below */
}

const PASSWORD = 'Passw0rd!';

describe('Intero Packtech IMS - full workflow', { skip: !MongoMemoryReplSet && 'mongodb-memory-server is not installed (run npm install)' }, () => {
  let replSet, server, base, mongoose;
  let M; // models
  const ids = {};
  const tokens = {};

  const call = async (method, path, token, body) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  };
  const stockOf = async () => (await M.Product.findById(ids.product)).stockQuantity;
  const saleRows = (requestId) => M.StockTransaction.countDocuments({ requestId, type: 'SALE' });
  const makeRequest = async (quantity) => (await call('POST', '/sales-requests', tokens.sales, { productId: ids.product, quantity })).body;

  before(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = 'mongodb://unused';
    process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
    process.env.CLIENT_ORIGIN = 'http://localhost:5173';

    const { connectDb } = await import('../src/database/connection.js');
    mongoose = (await import('mongoose')).default;
    await connectDb(replSet.getUri('ims_test'));
    const { createApp } = await import('../src/app/serverApp.js');

    M = {
      User: (await import('../src/modules/users/models/User.js')).default,
      Warehouse: (await import('../src/modules/warehouses/models/Warehouse.js')).default,
      Product: (await import('../src/modules/products/models/Product.js')).default,
      StockTransaction: (await import('../src/modules/inventory/models/StockTransaction.js')).default,
      SalesRequest: (await import('../src/modules/sales/models/SalesRequest.js')).default,
    };
    await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build indexes (incl. the unique ledger index)

    const wh1 = await M.Warehouse.create({ code: 'WH-01', name: 'Main', location: 'Coimbatore' });
    const wh2 = await M.Warehouse.create({ code: 'WH-02', name: 'Hub', location: 'Chennai' });
    ids.wh1 = String(wh1._id);
    ids.wh2 = String(wh2._id);

    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    const people = [
      ['sa', 'super_admin', null], ['admin', 'admin', wh1._id], ['manager', 'manager', wh1._id],
      ['manager2', 'manager', wh2._id], ['sales', 'sales', wh1._id], ['sales2', 'sales', wh1._id],
    ];
    for (const [key, role, warehouseId] of people) {
      const u = await M.User.create({ name: `${key} user`, email: `${key}@test.com`, passwordHash, role, warehouseId });
      ids[key] = String(u._id);
    }
    const product = await M.Product.create({ code: 'PRD-T1', name: 'Test Box', category: 'Boxes', price: 10, stockQuantity: 500, warehouseId: wh1._id });
    ids.product = String(product._id);

    server = http.createServer(createApp());
    await new Promise((r) => server.listen(0, r));
    base = `http://127.0.0.1:${server.address().port}`;

    for (const [key] of people) {
      const res = await call('POST', '/auth/login', null, { email: `${key}@test.com`, password: PASSWORD });
      tokens[key] = res.body.token;
    }
  });

  after(async () => {
    if (server) {
      server.closeAllConnections?.(); // fetch keeps connections alive; close them so shutdown cannot hang
      await new Promise((r) => server.close(r));
    }
    if (mongoose) await mongoose.disconnect();
    if (replSet) await replSet.stop();
  });

  // ------------------------------------------------------------------ AUTHENTICATION
  test('login: wrong password and unknown email give the same generic error', async () => {
    const a = await call('POST', '/auth/login', null, { email: 'sales@test.com', password: 'wrong-password' });
    const b = await call('POST', '/auth/login', null, { email: 'nobody@test.com', password: 'wrong-password' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.body.message, 'Invalid email or password.');
    assert.equal(b.body.message, a.body.message);
  });

  test('login: valid credentials return a token and the role, never the password hash', async () => {
    const res = await call('POST', '/auth/login', null, { email: 'manager@test.com', password: PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, 'manager');
    assert.ok(res.body.token);
    assert.equal(res.body.user.passwordHash, undefined);
  });

  test('login: a NoSQL-injection style body is rejected', async () => {
    const res = await call('POST', '/auth/login', null, { email: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 400);
  });

  test('protected routes need a valid token', async () => {
    assert.equal((await call('GET', '/products', null)).status, 401);
    assert.equal((await call('GET', '/products', 'garbage.token.value')).status, 401);
  });

  // ------------------------------------------------------------------ AUTHORIZATION
  test('Sales cannot reach any management endpoint', async () => {
    const t = tokens.sales;
    assert.equal((await call('GET', '/users', t)).status, 403);
    assert.equal((await call('POST', '/warehouses', t, { code: 'X', name: 'X', location: 'X' })).status, 403);
    assert.equal((await call('POST', '/products', t, {})).status, 403);
    assert.equal((await call('PATCH', `/products/${ids.product}`, t, { price: 1 })).status, 403);
    assert.equal((await call('POST', `/products/${ids.product}/stock`, t, { mode: 'set', amount: 9999 })).status, 403);
    assert.equal((await call('GET', '/stock-transactions', t)).status, 403);
    assert.equal(await stockOf(), 500);
  });

  test('Manager cannot manage warehouses, users, products or stock', async () => {
    const t = tokens.manager;
    assert.equal((await call('POST', '/warehouses', t, { code: 'X', name: 'X', location: 'X' })).status, 403);
    assert.equal((await call('GET', '/users', t)).status, 403);
    assert.equal((await call('POST', `/products/${ids.product}/stock`, t, { mode: 'add', amount: 5 })).status, 403);
    assert.equal((await call('GET', '/stock-transactions', t)).status, 200); // inventory view is allowed
  });

  test('only Sales can create requests (Admin, Manager and Super Admin cannot)', async () => {
    for (const who of ['admin', 'manager', 'sa']) {
      const res = await call('POST', '/sales-requests', tokens[who], { productId: ids.product, quantity: 1 });
      assert.equal(res.status, 403, who);
    }
  });

  // ------------------------------------------------------------------ SALES REQUEST + VALIDATION
  test('creating a request: status Pending, price from the database, stock NOT reduced', async () => {
    const res = await call('POST', '/sales-requests', tokens.sales, { productId: ids.product, quantity: 100, price: 1, totalAmount: 1, status: 'Approved' });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'Pending'); // a client cannot choose the status
    assert.equal(res.body.price, 10); // a client cannot choose the price
    assert.equal(res.body.totalAmount, 1000);
    assert.match(res.body.requestNo, /^SR-\d{6}$/);
    ids.r1 = res.body.id;
    assert.equal(await stockOf(), 500);
  });

  test('request validation: zero, negative, decimal, unknown product, too many', async () => {
    const t = tokens.sales;
    assert.equal((await call('POST', '/sales-requests', t, { productId: ids.product, quantity: 0 })).status, 400);
    assert.equal((await call('POST', '/sales-requests', t, { productId: ids.product, quantity: -5 })).status, 400);
    assert.equal((await call('POST', '/sales-requests', t, { productId: ids.product, quantity: 1.5 })).status, 400);
    assert.equal((await call('POST', '/sales-requests', t, { productId: '507f1f77bcf86cd799439011', quantity: 1 })).status, 404);
    const tooMany = await call('POST', '/sales-requests', t, { productId: ids.product, quantity: 501 });
    assert.equal(tooMany.status, 409);
    assert.equal(tooMany.body.message, 'Insufficient stock available.');
  });

  test('Sales sees only their own requests', async () => {
    assert.equal((await call('GET', '/sales-requests', tokens.sales)).body.length, 1);
    assert.equal((await call('GET', '/sales-requests', tokens.sales2)).body.length, 0);
  });

  // ------------------------------------------------------------------ APPROVAL RULES
  test('Super Admin cannot approve or cancel (business rule 4)', async () => {
    const a = await call('POST', `/sales-requests/${ids.r1}/approve`, tokens.sa);
    const c = await call('POST', `/sales-requests/${ids.r1}/cancel`, tokens.sa);
    assert.equal(a.status, 403);
    assert.equal(c.status, 403);
    assert.match(a.body.message, /Super Admin cannot approve or cancel/);
    assert.equal((await M.SalesRequest.findById(ids.r1)).status, 'Pending');
    assert.equal(await stockOf(), 500);
  });

  test('Sales cannot approve; a manager of ANOTHER warehouse cannot see or approve it', async () => {
    assert.equal((await call('POST', `/sales-requests/${ids.r1}/approve`, tokens.sales)).status, 403);
    assert.equal((await call('POST', `/sales-requests/${ids.r1}/approve`, tokens.manager2)).status, 404);
    assert.equal((await M.SalesRequest.findById(ids.r1)).status, 'Pending');
  });

  test('Manager approves: 500 - 100 = 400, approver recorded, one ledger row', async () => {
    const res = await call('POST', `/sales-requests/${ids.r1}/approve`, tokens.manager);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'Approved');
    assert.equal(res.body.processedByName, 'manager user');
    assert.ok(res.body.processedAt);
    assert.equal(await stockOf(), 400);

    const rows = await M.StockTransaction.find({ requestId: ids.r1 });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].type, 'SALE');
    assert.equal(rows[0].quantityChange, -100);
    assert.equal(rows[0].balanceAfter, 400);
  });

  test('an Approved request cannot be approved or cancelled again; stock is not deducted twice', async () => {
    const again = await call('POST', `/sales-requests/${ids.r1}/approve`, tokens.admin);
    const cancel = await call('POST', `/sales-requests/${ids.r1}/cancel`, tokens.manager);
    assert.equal(again.status, 409);
    assert.equal(cancel.status, 409);
    assert.match(again.body.message, /already approved/);
    assert.equal(await stockOf(), 400);
    assert.equal(await saleRows(ids.r1), 1);
  });

  test('CONCURRENCY: five simultaneous approvals -> exactly one succeeds, stock is deducted once', async () => {
    const r2 = await makeRequest(50);
    const attempts = await Promise.all(
      ['manager', 'admin', 'manager', 'admin', 'manager'].map((who) => call('POST', `/sales-requests/${r2.id}/approve`, tokens[who]))
    );
    const statuses = attempts.map((a) => a.status).sort();
    assert.deepEqual(statuses, [200, 409, 409, 409, 409]);
    assert.equal(await stockOf(), 350); // 400 - 50, not 400 - 250
    assert.equal(await saleRows(r2.id), 1);
  });

  test('insufficient stock at approval: rejected, request stays Pending, stock never negative', async () => {
    const r3 = await makeRequest(300); // both fit today (350 available) ...
    const r4 = await makeRequest(300);
    assert.equal((await call('POST', `/sales-requests/${r3.id}/approve`, tokens.manager)).status, 200);
    assert.equal(await stockOf(), 50);

    const res = await call('POST', `/sales-requests/${r4.id}/approve`, tokens.manager); // ... but not both
    assert.equal(res.status, 409);
    assert.equal(res.body.message, 'Insufficient stock available.');
    assert.equal((await M.SalesRequest.findById(r4.id)).status, 'Pending');
    assert.equal(await saleRows(r4.id), 0);
    assert.equal(await stockOf(), 50);
    ids.r4 = r4.id;
  });

  test('cancelling does not touch stock and records who cancelled', async () => {
    const res = await call('POST', `/sales-requests/${ids.r4}/cancel`, tokens.admin);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'Cancelled');
    assert.equal(res.body.processedByName, 'admin user');
    assert.equal(await stockOf(), 50);
    assert.equal((await call('POST', `/sales-requests/${ids.r4}/approve`, tokens.manager)).status, 409); // cannot revive it
  });

  // ------------------------------------------------------------------ STOCK / PRODUCTS (Admin)
  test('Admin: products are limited to their own warehouse and start with a ledger row', async () => {
    const own = await call('POST', '/products', tokens.admin, { name: 'Tape', category: 'Tapes', price: '38.5', stockQuantity: 30, warehouseId: ids.wh1 });
    assert.equal(own.status, 201);
    assert.match(own.body.code, /^PRD-\d{4}$/);
    assert.equal(await M.StockTransaction.countDocuments({ productId: own.body.id, type: 'INITIAL' }), 1);

    const other = await call('POST', '/products', tokens.admin, { name: 'Tape', category: 'Tapes', price: 1, stockQuantity: 1, warehouseId: ids.wh2 });
    assert.equal(other.status, 403);
    assert.equal((await call('POST', '/products', tokens.admin, { name: 'Bad', category: 'X', price: -1, stockQuantity: 1, warehouseId: ids.wh1 })).status, 400);
    assert.equal((await call('POST', '/products', tokens.admin, { name: 'Bad', category: 'X', price: 1, stockQuantity: -1, warehouseId: ids.wh1 })).status, 400);
    ids.tape = own.body.id;
  });

  test('stock adjustment: add / remove / set, never below zero, each one is logged', async () => {
    const adj = (body) => call('POST', `/products/${ids.tape}/stock`, tokens.admin, body);
    assert.equal((await adj({ mode: 'add', amount: 20, reason: 'Delivery' })).body.stockQuantity, 50);
    assert.equal((await adj({ mode: 'remove', amount: 10 })).body.stockQuantity, 40);
    const tooMuch = await adj({ mode: 'remove', amount: 41 });
    assert.equal(tooMuch.status, 409);
    assert.equal(tooMuch.body.message, 'Stock cannot become negative.');
    assert.equal((await adj({ mode: 'set', amount: 7 })).body.stockQuantity, 7);
    assert.equal((await adj({ mode: 'add', amount: 0 })).status, 400);
    assert.equal((await adj({ mode: 'set', amount: -1 })).status, 400);
    assert.equal(await M.StockTransaction.countDocuments({ productId: ids.tape, type: 'ADJUSTMENT' }), 3);
  });

  test('stock cannot be changed through the normal product update', async () => {
    const res = await call('PATCH', `/products/${ids.tape}`, tokens.admin, { stockQuantity: 99999, price: 40 });
    assert.equal(res.status, 200);
    assert.equal(res.body.price, 40);
    assert.equal(res.body.stockQuantity, 7);
  });

  // ------------------------------------------------------------------ USERS / WAREHOUSES
  test('Admin can create Sales in their warehouse only, and never an Admin or Super Admin', async () => {
    const make = (role, warehouseId, email) => call('POST', '/users', tokens.admin, { name: 'N', email, password: PASSWORD, role, warehouseId });
    assert.equal((await make('sales', ids.wh1, 'new1@test.com')).status, 201);
    assert.equal((await make('sales', ids.wh2, 'new2@test.com')).status, 403);
    assert.equal((await make('admin', ids.wh1, 'new3@test.com')).status, 403);
    assert.equal((await make('super_admin', ids.wh1, 'new4@test.com')).status, 403);
    assert.equal((await make('sales', ids.wh1, 'new1@test.com')).status, 409); // duplicate email
    assert.equal((await call('POST', '/users', tokens.admin, { name: 'N', email: 'weak@test.com', password: '123', role: 'sales', warehouseId: ids.wh1 })).status, 400);
  });

  test('nobody can change their own role or deactivate themselves', async () => {
    assert.equal((await call('PATCH', `/users/${ids.sa}`, tokens.sa, { role: 'sales', warehouseId: ids.wh1 })).status, 403);
    assert.equal((await call('PATCH', `/users/${ids.sa}`, tokens.sa, { status: 'inactive' })).status, 403);
    assert.equal((await call('DELETE', `/users/${ids.sa}`, tokens.sa)).status, 403);
  });

  test('Admin cannot see or edit users of another warehouse or other Admins', async () => {
    const users = (await call('GET', '/users', tokens.admin)).body;
    assert.ok(users.every((u) => u.warehouseId === ids.wh1));
    assert.equal((await call('PATCH', `/users/${ids.manager2}`, tokens.admin, { name: 'Hacked' })).status, 403);
    assert.equal((await call('PATCH', `/users/${ids.sa}`, tokens.admin, { name: 'Hacked' })).status, 403);
  });

  test('a deactivated user is locked out immediately, even with a valid token', async () => {
    assert.equal((await call('GET', '/auth/me', tokens.sales2)).status, 200);
    assert.equal((await call('PATCH', `/users/${ids.sales2}`, tokens.sa, { status: 'inactive' })).status, 200);
    assert.equal((await call('GET', '/auth/me', tokens.sales2)).status, 401);
    assert.equal((await call('POST', '/auth/login', null, { email: 'sales2@test.com', password: PASSWORD })).status, 403);
  });

  test('a warehouse that still has products cannot be deleted', async () => {
    const res = await call('DELETE', `/warehouses/${ids.wh1}`, tokens.sa);
    assert.equal(res.status, 409);
    const empty = await call('DELETE', `/warehouses/${ids.wh2}`, tokens.admin); // wh2 has a manager assigned
    assert.equal(empty.status, 409);
  });

  test('warehouse CRUD for Admin and duplicate Warehouse ID protection', async () => {
    const created = await call('POST', '/warehouses', tokens.admin, { code: 'wh-03', name: 'Salem', location: 'Salem' });
    assert.equal(created.status, 201);
    assert.equal(created.body.code, 'WH-03');
    assert.equal((await call('POST', '/warehouses', tokens.sa, { code: 'WH-03', name: 'Dup', location: 'X' })).status, 409);
    assert.equal((await call('PATCH', `/warehouses/${created.body.id}`, tokens.admin, { status: 'inactive' })).body.status, 'inactive');
    assert.equal((await call('DELETE', `/warehouses/${created.body.id}`, tokens.admin)).status, 200);
  });

  test('settings: anyone can read the low-stock threshold, only SA/Admin can change it', async () => {
    assert.equal((await call('GET', '/settings', tokens.sales)).body.lowStockThreshold, 50);
    assert.equal((await call('PUT', '/settings', tokens.manager, { lowStockThreshold: 5 })).status, 403);
    assert.equal((await call('PUT', '/settings', tokens.admin, { lowStockThreshold: -1 })).status, 400);
    assert.equal((await call('PUT', '/settings', tokens.admin, { lowStockThreshold: 20 })).body.lowStockThreshold, 20);
  });
});
