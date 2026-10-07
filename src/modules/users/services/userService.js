import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Warehouse from '../../warehouses/models/Warehouse.js';
import { AppError } from '../../../utils/AppError.js';
import { ACTIVE_STATES, ROLES } from '../../../utils/constants.js';
import { manageableRoles } from '../../../utils/permissions.js';
import { assertWarehouseAccess, isSuper, warehouseFilter } from '../../../utils/scope.js';
import { email as validEmail, objectId, oneOf, password as validPassword, reqString, sanitize } from '../../../utils/validate.js';

const forbid = (message) => new AppError(message, 403, 'FORBIDDEN');

const SPEC = {
  name: { label: 'Name', required: true, parse: (v) => reqString(v, 'Name', { max: 100 }) },
  email: { label: 'Email', required: true, parse: (v) => validEmail(v) },
  password: { label: 'Password', required: true, parse: (v) => validPassword(v) },
  role: { label: 'Role', required: true, parse: (v) => oneOf(v, 'Role', Object.values(ROLES)) },
  warehouseId: { label: 'Warehouse', parse: (v) => (v ? objectId(v, 'Warehouse') : null) },
  status: { label: 'Status', default: 'active', parse: (v) => oneOf(v, 'Status', ACTIVE_STATES) },
};
// Editing never changes the email (it is the login name).
const { email: _email, ...EDIT_SPEC } = SPEC;
const EDIT_FIELDS = { ...EDIT_SPEC, password: { ...EDIT_SPEC.password, required: false } };

// Who can the actor see?  Super Admin: everybody.  Admin: users of their own warehouse.
export function list(actor) {
  return User.find(warehouseFilter(actor)).sort({ name: 1 });
}

// The warehouse a user is assigned to. Super Admin accounts never belong to a warehouse.
async function resolveWarehouse(actor, role, warehouseId) {
  if (role === ROLES.SUPER_ADMIN) return null;
  if (!warehouseId) throw new AppError('Select a warehouse for this role.');
  assertWarehouseAccess(actor, warehouseId); // an Admin can only use their own warehouse
  if (!(await Warehouse.exists({ _id: warehouseId }))) throw new AppError('Warehouse not found.', 404);
  return warehouseId;
}

// Loads the user the actor wants to change and checks the actor is allowed to touch THIS user.
async function loadManageable(actor, id) {
  const target = /^[a-f\d]{24}$/i.test(String(id)) ? await User.findById(id) : null;
  if (!target) throw new AppError('User not found.', 404);
  if (!manageableRoles(actor.role).includes(target.role)) throw forbid('You cannot manage this user.');
  if (!isSuper(actor) && String(target.warehouseId) !== String(actor.warehouseId)) {
    throw forbid('You can only manage users of your own warehouse.');
  }
  return target;
}

export async function create(actor, body) {
  const data = sanitize(body, SPEC);
  if (!manageableRoles(actor.role).includes(data.role)) throw forbid('You cannot create a user with this role.');
  const warehouseId = await resolveWarehouse(actor, data.role, data.warehouseId);
  if (await User.exists({ email: data.email })) throw new AppError('A user with this email already exists.', 409);

  return User.create({
    name: data.name,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, 10),
    role: data.role,
    warehouseId,
    status: data.status,
  });
}

export async function update(actor, id, body) {
  const target = await loadManageable(actor, id);
  const changes = sanitize(body, EDIT_FIELDS, { partial: true });
  const isSelf = String(target._id) === String(actor._id);

  const role = changes.role ?? target.role;
  const status = changes.status ?? target.status;

  // Nobody may change their own role or deactivate their own account (prevents lock-out and self-promotion).
  if (isSelf && (role !== target.role || status !== 'active')) {
    throw forbid('You cannot change your own role or deactivate your own account.');
  }
  if (!manageableRoles(actor.role).includes(role)) throw forbid('You cannot assign this role.');

  if ('role' in changes || 'warehouseId' in changes) {
    target.warehouseId = await resolveWarehouse(actor, role, 'warehouseId' in changes ? changes.warehouseId : target.warehouseId);
  }
  if (changes.name !== undefined) target.name = changes.name;
  target.role = role;
  target.status = status;
  if (changes.password) target.passwordHash = await bcrypt.hash(changes.password, 10);
  return target.save();
}

export async function remove(actor, id) {
  const target = await loadManageable(actor, id);
  if (String(target._id) === String(actor._id)) throw forbid('You cannot delete your own account.');
  // Sales requests keep the user's NAME as a snapshot, so reports stay readable after deletion.
  await target.deleteOne();
}
