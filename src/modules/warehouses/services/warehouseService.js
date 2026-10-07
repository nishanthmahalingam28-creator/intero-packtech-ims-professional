import Warehouse from '../models/Warehouse.js';
import Product from '../../products/models/Product.js';
import User from '../../users/models/User.js';
import Consumable from '../../consumables/models/Consumable.js';
import SalesRequest from '../../sales/models/SalesRequest.js';
import { AppError } from '../../../utils/AppError.js';
import { ACTIVE_STATES, REQUEST_STATUS } from '../../../utils/constants.js';
import { oneOf, optEmail, optString, reqString, sanitize } from '../../../utils/validate.js';

const SPEC = {
  code: { label: 'Warehouse ID', required: true, parse: (v) => reqString(v, 'Warehouse ID', { max: 30 }).toUpperCase() },
  name: { label: 'Warehouse name', required: true, parse: (v) => reqString(v, 'Warehouse name', { max: 120 }) },
  location: { label: 'Location', required: true, parse: (v) => reqString(v, 'Location', { max: 250 }) },
  phone: { label: 'Phone', default: '', parse: (v) => optString(v, 'Phone', { max: 30 }) },
  email: { label: 'Email', default: '', parse: (v) => optEmail(v) },
  description: { label: 'Description', default: '', parse: (v) => optString(v, 'Description', { max: 500 }) },
  status: { label: 'Status', default: 'active', parse: (v) => oneOf(v, 'Status', ACTIVE_STATES) },
};

async function assertCodeFree(code, ignoreId) {
  const clash = await Warehouse.findOne({ code, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) });
  if (clash) throw new AppError(`Warehouse ID "${code}" is already used.`, 409);
}

async function getOrFail(id) {
  const doc = /^[a-f\d]{24}$/i.test(String(id)) ? await Warehouse.findById(id) : null;
  if (!doc) throw new AppError('Warehouse not found.', 404);
  return doc;
}

// Every signed-in user may read the warehouse list (names are needed to display products and requests).
// Product count and total stock come from one aggregation over ALL products, so they are always accurate.
export async function list() {
  const [warehouses, totals] = await Promise.all([
    Warehouse.find().sort({ name: 1 }),
    Product.aggregate([{ $group: { _id: '$warehouseId', productCount: { $sum: 1 }, totalStock: { $sum: '$stockQuantity' } } }]),
  ]);
  const byId = new Map(totals.map((t) => [String(t._id), t]));
  return warehouses.map((w) => ({
    ...w.toJSON(),
    productCount: byId.get(String(w._id))?.productCount ?? 0,
    totalStock: byId.get(String(w._id))?.totalStock ?? 0,
  }));
}

export async function create(body) {
  const data = sanitize(body, SPEC);
  await assertCodeFree(data.code);
  return Warehouse.create(data);
}

export async function update(id, body) {
  const warehouse = await getOrFail(id);
  const changes = sanitize(body, SPEC, { partial: true });
  if (changes.code) await assertCodeFree(changes.code, warehouse.id);
  warehouse.set(changes);
  return warehouse.save();
}

export async function remove(id) {
  const warehouse = await getOrFail(id);
  const [products, consumables, users, pending] = await Promise.all([
    Product.exists({ warehouseId: warehouse._id }),
    Consumable.exists({ warehouseId: warehouse._id }),
    User.exists({ warehouseId: warehouse._id }),
    SalesRequest.exists({ warehouseId: warehouse._id, status: REQUEST_STATUS.PENDING }),
  ]);
  if (products) throw new AppError('This warehouse still has products. Move or delete them first.', 409);
  if (consumables) throw new AppError('This warehouse still has consumables. Delete them first.', 409);
  if (users) throw new AppError('This warehouse still has users assigned. Reassign or delete them first.', 409);
  if (pending) throw new AppError('This warehouse still has pending sales requests.', 409);
  await warehouse.deleteOne();
}
