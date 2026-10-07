import './plugins.js';
import mongoose from 'mongoose';
import { ACTIVE_STATES } from '../../../utils/constants.js';

const subProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    parentProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    parentProductName: { type: String, required: true }, // kept in sync when the parent is renamed
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true }, // copied from the parent
    quantity: { type: Number, required: true, min: 0, validate: Number.isInteger },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ACTIVE_STATES, default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('SubProduct', subProductSchema);
