// AUTHORIZATION: "What is this user allowed to do?"
// permit('sales:process') lets the request continue only if the user's role holds that permission.
import { AppError } from '../utils/AppError.js';
import { can } from '../utils/permissions.js';
import { ROLES } from '../utils/constants.js';

export const permit = (permission) => (req, _res, next) => {
  if (can(req.user.role, permission)) return next();

  // A clearer message for the one rule people ask about most.
  if (permission === 'sales:process' && req.user.role === ROLES.SUPER_ADMIN) {
    return next(new AppError('Super Admin cannot approve or cancel sales requests.', 403, 'FORBIDDEN'));
  }
  return next(new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'));
};
