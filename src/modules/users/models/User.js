import './plugins.js';
import mongoose from 'mongoose';
import { ACTIVE_STATES, ROLES } from '../../../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false -> the hash is never loaded unless a query explicitly asks for it (only login does).
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null }, // null for Super Admin
    status: { type: String, enum: ACTIVE_STATES, default: 'active' },
  },
  { timestamps: true }
);

userSchema.index({ warehouseId: 1, role: 1 });

export default mongoose.model('User', userSchema);
