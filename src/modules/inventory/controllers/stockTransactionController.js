import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as ledger from '../services/stockTransactionService.js';
export const list = asyncHandler(async (req, res) => res.json(await ledger.list(req.user)));
