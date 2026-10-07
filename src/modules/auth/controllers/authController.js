import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as authService from '../services/authService.js';

export const login = asyncHandler(async (req, res) => {
  const { token, user } = await authService.login(req.body);
  res.json({ token, user });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
