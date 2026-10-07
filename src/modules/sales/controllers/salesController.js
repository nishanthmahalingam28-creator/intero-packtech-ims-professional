import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as sales from '../services/salesService.js';
export const list = asyncHandler(async (req, res) => res.json(await sales.list(req.user)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await sales.create(req.user, req.body)));
export const approve = asyncHandler(async (req, res) => res.json(await sales.approve(req.user, req.params.id)));
export const cancel = asyncHandler(async (req, res) => res.json(await sales.cancel(req.user, req.params.id)));
