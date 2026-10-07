// "Scope" = which rows a user is allowed to see.
//   Super Admin           -> everything
//   Admin / Manager / Sales -> only their own warehouse
import { AppError } from './AppError.js';
import { ROLES } from './constants.js';

export const isSuper = (user) => user.role === ROLES.SUPER_ADMIN;

// Mongo filter limiting a query to the user's warehouse. A user without a warehouse matches nothing.
export function warehouseFilter(user) {
  if (isSuper(user)) return {};
  return user.warehouseId ? { warehouseId: user.warehouseId } : { _id: null };
}

// Throws 403 when a non-Super-Admin tries to act on another warehouse.
export function assertWarehouseAccess(user, warehouseId) {
  if (isSuper(user)) return;
  if (!user.warehouseId || String(user.warehouseId) !== String(warehouseId)) {
    throw new AppError('You can only manage records of your own warehouse.', 403, 'FORBIDDEN');
  }
}

// Loads one record by id, but only if it is inside the user's scope.
// Out-of-scope records look exactly like missing ones (404), so ids of other warehouses are not revealed.
export async function findInScope(Model, id, user, notFoundMessage = 'Record not found.') {
  if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id)) throw new AppError(notFoundMessage, 404);
  const doc = await Model.findOne({ _id: id, ...warehouseFilter(user) });
  if (!doc) throw new AppError(notFoundMessage, 404);
  return doc;
}
