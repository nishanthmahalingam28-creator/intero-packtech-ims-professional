import './plugins.js';
import mongoose from 'mongoose';
import { ACTIVE_STATES } from '../../../utils/constants.js';

// One document = one product stocked in ONE warehouse. Stock lives on this document (stockQuantity),
// so "available stock" is always a single, atomic number that approvals can safely decrement.
const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // PRD-0001
    name: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0, validate: Number.isInteger },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    status: { type: String, enum: ACTIVE_STATES, default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
