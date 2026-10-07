import Setting from '../models/Setting.js';
import { DEFAULT_LOW_STOCK } from '../../../utils/constants.js';
import { sanitize, wholeNumber } from '../../../utils/validate.js';

const ID = 'inventory';

export async function get() {
  const doc = await Setting.findById(ID);
  return { lowStockThreshold: doc ? doc.lowStockThreshold : DEFAULT_LOW_STOCK };
}

export async function save(body) {
  const data = sanitize(body, {
    lowStockThreshold: { label: 'Threshold', required: true, parse: (v) => wholeNumber(v, 'Threshold', { min: 0 }) },
  });
  const doc = await Setting.findOneAndUpdate({ _id: ID }, { $set: data }, { new: true, upsert: true });
  return { lowStockThreshold: doc.lowStockThreshold };
}
