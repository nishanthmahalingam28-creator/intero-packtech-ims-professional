import './plugins.js';
import mongoose from 'mongoose';
import { ACTIVE_STATES } from '../../../utils/constants.js';

const warehouseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // WH-01
    name: { type: String, required: true, trim: true, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 250 },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ACTIVE_STATES, default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Warehouse', warehouseSchema);
