import Consumable from '../models/Consumable.js';
import Warehouse from '../../warehouses/models/Warehouse.js';
import { AppError } from '../../../utils/AppError.js';
import { ACTIVE_STATES } from '../../../utils/constants.js';
import { assertWarehouseAccess, findInScope, warehouseFilter } from '../../../utils/scope.js';
import { money, objectId, oneOf, optString, reqString, sanitize, wholeNumber } from '../../../utils/validate.js';

const SPEC = {
  name: { label: 'Name', required: true, parse: (v) => reqString(v, 'Name', { max: 150 }) },
  warehouseId: { label: 'Warehouse', required: true, parse: (v) => objectId(v, 'Warehouse') },
  quantity: { label: 'Quantity', required: true, parse: (v) => wholeNumber(v, 'Quantity', { min: 0 }) },
  price: { label: 'Price', default: 0, parse: (v) => (v === '' || v == null ? 0 : money(v, 'Price')) },
  description: { label: 'Description', default: '', parse: (v) => optString(v, 'Description', { max: 500 }) },
  status: { label: 'Status', default: 'active', parse: (v) => oneOf(v, 'Status', ACTIVE_STATES) },
};

async function checkWarehouse(actor, warehouseId) {
  assertWarehouseAccess(actor, warehouseId);
  if (!(await Warehouse.exists({ _id: warehouseId }))) throw new AppError('Warehouse not found.', 404);
}

export const list = (actor) => Consumable.find(warehouseFilter(actor)).sort({ name: 1 });

export async function create(actor, body) {
  const data = sanitize(body, SPEC);
  await checkWarehouse(actor, data.warehouseId);
  return Consumable.create(data);
}

export async function update(actor, id, body) {
  const item = await findInScope(Consumable, id, actor, 'Consumable not found.');
  const changes = sanitize(body, SPEC, { partial: true });
  if (changes.warehouseId) await checkWarehouse(actor, changes.warehouseId);
  item.set(changes);
  return item.save();
}

export async function remove(actor, id) {
  const item = await findInScope(Consumable, id, actor, 'Consumable not found.');
  await item.deleteOne();
}
