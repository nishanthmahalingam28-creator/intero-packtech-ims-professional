import './plugins.js';
import mongoose from 'mongoose';
import { ACTIVE_STATES } from '../../../utils/constants.js';

const consumableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    quantity: { type: Number, required: true, min: 0, validate: Number.isInteger },
    price: { type: Number, default: 0, min: 0 },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ACTIVE_STATES, default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Consumable', consumableSchema);
