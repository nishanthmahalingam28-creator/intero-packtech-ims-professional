import SubProduct from '../models/SubProduct.js';
import Product from '../../products/models/Product.js';
import { ACTIVE_STATES } from '../../../utils/constants.js';
import { findInScope, warehouseFilter } from '../../../utils/scope.js';
import { money, objectId, oneOf, optString, reqString, sanitize, wholeNumber } from '../../../utils/validate.js';

const SPEC = {
  name: { label: 'Name', required: true, parse: (v) => reqString(v, 'Name', { max: 150 }) },
  parentProductId: { label: 'Parent product', required: true, parse: (v) => objectId(v, 'Parent product') },
  quantity: { label: 'Quantity', required: true, parse: (v) => wholeNumber(v, 'Quantity', { min: 0 }) },
  price: { label: 'Price', required: true, parse: (v) => money(v, 'Price') },
  description: { label: 'Description', default: '', parse: (v) => optString(v, 'Description', { max: 500 }) },
  status: { label: 'Status', default: 'active', parse: (v) => oneOf(v, 'Status', ACTIVE_STATES) },
};

export const list = (actor) => SubProduct.find(warehouseFilter(actor)).sort({ name: 1 });

// The parent must be inside the actor's scope. Warehouse and parent name are then COPIED from the parent
// (never trusted from the browser), so a sub-product always belongs to its parent's warehouse.
async function withParent(actor, parentProductId) {
  const parent = await findInScope(Product, parentProductId, actor, 'Parent product not found.');
  return { parentProductId: parent._id, parentProductName: parent.name, warehouseId: parent.warehouseId };
}

export async function create(actor, body) {
  const data = sanitize(body, SPEC);
  return SubProduct.create({ ...data, ...(await withParent(actor, data.parentProductId)) });
}

export async function update(actor, id, body) {
  const sub = await findInScope(SubProduct, id, actor, 'Sub-product not found.');
  const changes = sanitize(body, SPEC, { partial: true });
  if (changes.parentProductId) Object.assign(changes, await withParent(actor, changes.parentProductId));
  sub.set(changes);
  return sub.save();
}

export async function remove(actor, id) {
  const sub = await findInScope(SubProduct, id, actor, 'Sub-product not found.');
  await sub.deleteOne();
}
