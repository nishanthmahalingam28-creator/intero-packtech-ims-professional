import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as users from '../services/userService.js';
const ok = { success: true };
export const list = asyncHandler(async (req, res) => res.json(await users.list(req.user)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await users.create(req.user, req.body)));
export const update = asyncHandler(async (req, res) => res.json(await users.update(req.user, req.params.id, req.body)));
export const remove = asyncHandler(async (req, res) => { await users.remove(req.user, req.params.id); res.json(ok); });
