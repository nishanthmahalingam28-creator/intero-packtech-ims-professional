import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as settings from '../services/settingsService.js';
export const get = asyncHandler(async (_req, res) => res.json(await settings.get()));
export const save = asyncHandler(async (req, res) => res.json(await settings.save(req.body)));
