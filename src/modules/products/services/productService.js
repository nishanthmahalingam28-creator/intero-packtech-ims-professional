import Product from '../models/Product.js';
import SubProduct from '../../sub-products/models/SubProduct.js';
import SalesRequest from '../../sales/models/SalesRequest.js';
import StockTransaction from '../../inventory/models/StockTransaction.js';
import Warehouse from '../../warehouses/models/Warehouse.js';
import { nextCode } from '../../../database/Counter.js';
import { AppError } from '../../../utils/AppError.js';
import { ACTIVE_STATES, REQUEST_STATUS, ROLES } from '../../../utils/constants.js';
import { runInTransaction } from '../../../utils/transaction.js';
import { assertWarehouseAccess, findInScope, warehouseFilter } from '../../../utils/scope.js';
import { money, objectId, oneOf, optString, reqString, sanitize, wholeNumber } from '../../../utils/validate.js';

const DETAILS = {
  name: { label: 'Product name', required: true, parse: (v) => reqString(v, 'Product name', { max: 150 }) },
  category: { label: 'Category', required: true, parse: (v) => reqString(v, 'Category', { max: 80 }) },
  description: { label: 'Description', default: '', parse: (v) => optString(v, 'Description', { max: 1000 }) },
  price: { label: 'Price', required: true, parse: (v) => money(v, 'Price') },
  warehouseId: { label: 'Warehouse', required: true, parse: (v) => objectId(v, 'Warehouse') },
  status: { label: 'Status', default: 'active', parse: (v) => oneOf(v, 'Status', ACTIVE_STATES) },
};
// Stock can only be given when a product is CREATED (opening stock). Afterwards it changes only through
// adjustStock() or an approved sale, so every change leaves a row in the stock ledger.
const CREATE_SPEC = { ...DETAILS, stockQuantity: { label: 'Stock quantity', required: true, parse: (v) => wholeNumber(v, 'Stock quantity', { min: 0 }) } };

const ledger = (actor, product) => ({
  productId: product._id,
  productName: product.name,
  warehouseId: product.warehouseId,
  performedBy: actor._id,
  performedByName: actor.name,
});

async function assertWarehouseExists(warehouseId) {
  if (!(await Warehouse.exists({ _id: warehouseId }))) throw new AppError('Warehouse not found.', 404);
}

export function list(actor) {
  const filter = warehouseFilter(actor);
  // Sales users only need products they can actually order.
  if (actor.role === ROLES.SALES) filter.status = 'active';
  return Product.find(filter).sort({ name: 1 });
}

// Product + its opening-stock ledger row are saved together (all or nothing).
export async function create(actor, body) {
  const data = sanitize(body, CREATE_SPEC);
  assertWarehouseAccess(actor, data.warehouseId);
  await assertWarehouseExists(data.warehouseId);
  const code = await nextCode('PRD', 4);

  return runInTransaction(async (session) => {
    const [product] = await Product.create([{ ...data, code }], { session });
    await StockTransaction.create(
      [{ ...ledger(actor, product), type: 'INITIAL', quantityChange: data.stockQuantity, balanceAfter: data.stockQuantity, reason: 'Opening stock' }],
      { session }
    );
    return product;
  });
}

export async function update(actor, id, body) {
  const product = await findInScope(Product, id, actor, 'Product not found.');
  const changes = sanitize(body, DETAILS, { partial: true });

  if (changes.warehouseId && changes.warehouseId !== String(product.warehouseId)) {
    assertWarehouseAccess(actor, changes.warehouseId);
    await assertWarehouseExists(changes.warehouseId);
    const [subs, pending] = await Promise.all([
      SubProduct.exists({ parentProductId: product._id }),
      SalesRequest.exists({ productId: product._id, status: REQUEST_STATUS.PENDING }),
    ]);
    if (subs || pending) throw new AppError('A product with sub-products or pending sales requests cannot be moved to another warehouse.', 409);
  }

  const renamed = changes.name && changes.name !== product.name;
  product.set(changes);
  await product.save();
  if (renamed) await SubProduct.updateMany({ parentProductId: product._id }, { parentProductName: product.name });
  return product;
}

// mode: 'add' | 'remove' | 'set'
// One atomic update changes the stock; the ledger row is written in the same transaction.
export async function adjustStock(actor, id, body) {
  const product = await findInScope(Product, id, actor, 'Product not found.');
  const mode = oneOf(body?.mode, 'Adjustment type', ['add', 'remove', 'set']);
  const amount = wholeNumber(body?.amount, 'Quantity', { min: mode === 'set' ? 0 : 1 });
  const reason = optString(body?.reason, 'Reason', { max: 250 }) || 'Manual adjustment';

  await runInTransaction(async (session) => {
    const update = mode === 'set' ? { $set: { stockQuantity: amount } } : { $inc: { stockQuantity: mode === 'add' ? amount : -amount } };
    // For "remove" the filter itself says "only if enough stock is left", so stock can never go below 0
    // even when two people remove stock at the same moment.
    const filter = { _id: product._id, ...(mode === 'remove' ? { stockQuantity: { $gte: amount } } : {}) };
    const before = await Product.findOneAndUpdate(filter, update, { new: false, session });
    if (!before) throw new AppError('Stock cannot become negative.', 409);

    const balanceAfter = mode === 'set' ? amount : before.stockQuantity + (mode === 'add' ? amount : -amount);
    await StockTransaction.create(
      [{ ...ledger(actor, before), type: 'ADJUSTMENT', quantityChange: balanceAfter - before.stockQuantity, balanceAfter, reason }],
      { session }
    );
  });
  return Product.findById(product._id);
}

export async function remove(actor, id) {
  const product = await findInScope(Product, id, actor, 'Product not found.');
  const [subs, pending] = await Promise.all([
    SubProduct.exists({ parentProductId: product._id }),
    SalesRequest.exists({ productId: product._id, status: REQUEST_STATUS.PENDING }),
  ]);
  if (subs) throw new AppError('Delete this product\'s sub-products first.', 409);
  if (pending) throw new AppError('This product has pending sales requests. Approve or cancel them first.', 409);
  await product.deleteOne(); // the stock ledger and old sales requests keep their own copy of the name
}
