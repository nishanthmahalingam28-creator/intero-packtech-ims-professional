import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as consumables from '../services/consumableService.js';
const ok = { success: true };
export const list = asyncHandler(async (req, res) => res.json(await consumables.list(req.user)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await consumables.create(req.user, req.body)));
export const update = asyncHandler(async (req, res) => res.json(await consumables.update(req.user, req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => { await consumables.remove(req.user, req.params.id); res.json(ok); });
