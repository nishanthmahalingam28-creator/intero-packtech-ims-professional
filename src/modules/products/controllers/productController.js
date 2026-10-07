import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as products from '../services/productService.js';
const ok = { success: true };
export const list = asyncHandler(async (req, res) => res.json(await products.list(req.user)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await products.create(req.user, req.body)));
export const update = asyncHandler(async (req, res) => res.json(await products.update(req.user, req.params.id, req.body)));
export const adjustStock = asyncHandler(async (req, res) => res.json(await products.adjustStock(req.user, req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => { await products.remove(req.user, req.params.id); res.json(ok); });
