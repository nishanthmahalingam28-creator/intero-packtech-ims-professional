import './plugins.js';
import mongoose from 'mongoose';
import { REQUEST_STATUS } from '../../../utils/constants.js';

const { Schema } = mongoose;

// Names / price are COPIED into the request when it is created (a "snapshot"), so old sales reports stay
// correct even if a product is renamed, re-priced or deleted later.
const salesRequestSchema = new Schema(
  {
    requestNo: { type: String, required: true, unique: true }, // SR-000001
    salesUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    salesUserName: { type: String, required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    warehouseName: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    price: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(REQUEST_STATUS), default: REQUEST_STATUS.PENDING },
    notes: { type: String, trim: true, default: '' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    processedByName: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

salesRequestSchema.index({ salesUserId: 1, createdAt: -1 });
salesRequestSchema.index({ warehouseId: 1, status: 1, createdAt: -1 });
salesRequestSchema.index({ productId: 1, status: 1 });

export default mongoose.model('SalesRequest', salesRequestSchema);
