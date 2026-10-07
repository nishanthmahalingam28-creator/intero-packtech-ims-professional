import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as warehouses from '../services/warehouseService.js';
const ok = { success: true };
export const list = asyncHandler(async (_req, res) => res.json(await warehouses.list()));
export const create = asyncHandler(async (req, res) => res.status(201).json(await warehouses.create(req.body)));
export const update = asyncHandler(async (req, res) => res.json(await warehouses.update(req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => { await warehouses.remove(req.params.id); res.json(ok); });
