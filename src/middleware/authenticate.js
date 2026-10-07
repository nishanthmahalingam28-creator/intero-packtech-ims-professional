// AUTHENTICATION: "Who is the user?"
// Reads the token from the "Authorization: Bearer <token>" header, proves it is genuine, and then loads
// the user FROM THE DATABASE on every request. Because role and status come from the database (not from
// the token), deactivating a user or changing a role takes effect immediately.
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../modules/users/models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Please sign in to continue.', 401, 'UNAUTHENTICATED');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('Your account no longer exists.', 401, 'UNAUTHENTICATED');
  if (user.status !== 'active') {
    throw new AppError('Your account is deactivated. Please contact the administrator.', 401, 'ACCOUNT_INACTIVE');
  }

  req.user = user;
  next();
});
