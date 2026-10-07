import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as subProducts from '../services/subProductService.js';
const ok = { success: true };
export const list = asyncHandler(async (req, res) => res.json(await subProducts.list(req.user)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await subProducts.create(req.user, req.body)));
export const update = asyncHandler(async (req, res) => res.json(await subProducts.update(req.user, req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => { await subProducts.remove(req.user, req.params.id); res.json(ok); });
