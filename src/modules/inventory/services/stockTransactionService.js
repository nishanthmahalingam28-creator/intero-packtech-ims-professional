import StockTransaction from '../models/StockTransaction.js';
import { warehouseFilter } from '../../../utils/scope.js';

// Newest 500 ledger rows the user is allowed to see.
export const list = (actor) => StockTransaction.find(warehouseFilter(actor)).sort({ createdAt: -1 }).limit(500);
