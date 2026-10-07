// AUTHORIZATION: "what is this user allowed to do?"
// This is the SERVER copy of the permission table. The React app has an identical table only to hide
// buttons and menus; the checks that really protect the data are the ones made here, on the server.
import { ROLES } from './constants.js';

const { SUPER_ADMIN: SA, ADMIN: A, MANAGER: M, SALES: S } = ROLES;

export const PERMISSIONS = {
  'dashboard:view': [SA, A, M, S],
  'warehouse:manage': [SA, A],
  'user:manage': [SA, A],
  'product:manage': [SA, A], // products, price, sub-products, consumables
  'stock:manage': [SA, A],
  'inventory:view': [SA, A, M],
  'sales:view': [SA, A, M, S], // the service limits Sales to their own requests
  'sales:create': [S],
  'sales:process': [A, M], // approve / cancel. Super Admin is NOT here, on purpose.
  'report:view': [SA, A, M],
  'settings:manage': [SA, A],
};

export const can = (role, permission) => PERMISSIONS[permission]?.includes(role) ?? false;

// Roles a user may create / edit / delete in User Management.
export function manageableRoles(role) {
  if (role === SA) return [SA, A, M, S];
  if (role === A) return [M, S];
  return [];
}
