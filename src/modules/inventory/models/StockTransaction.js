import './plugins.js';
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Append-only stock ledger: rows are only ever ADDED (no update / delete API exists).
// Every change to stockQuantity writes exactly one row here.
const stockTransactionSchema = new Schema(
  {
    type: { type: String, enum: ['INITIAL', 'ADJUSTMENT', 'SALE'], required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    quantityChange: { type: Number, required: true }, // negative for sales
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    requestId: { type: Schema.Types.ObjectId, ref: 'SalesRequest', default: null },
    requestNo: { type: String, default: null },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    performedByName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// SAFETY NET against double deduction: a sales request can own at most ONE "SALE" ledger row.
// Even if a bug let the code run twice, the database itself would refuse the second row.
stockTransactionSchema.index({ requestId: 1 }, { unique: true, partialFilterExpression: { type: 'SALE' } });

export default mongoose.model('StockTransaction', stockTransactionSchema);
