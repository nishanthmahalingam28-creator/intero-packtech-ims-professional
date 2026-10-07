import './plugins.js';
import mongoose from 'mongoose';
import { DEFAULT_LOW_STOCK } from '../../../utils/constants.js';

// System settings. Only one document is used: _id = "inventory".
const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    lowStockThreshold: { type: Number, default: DEFAULT_LOW_STOCK, min: 0, validate: Number.isInteger },
  },
  { timestamps: true }
);

export default mongoose.model('Setting', settingSchema);
