import test from 'node:test';
import assert from 'node:assert/strict';
import { PERMISSIONS, can, manageableRoles } from '../src/utils/permissions.js';

const ROLES = ['super_admin', 'admin', 'manager', 'sales'];
const allowed = (permission) => ROLES.filter((r) => can(r, permission));

test('only Admin and Manager can approve / cancel sales requests', () => {
  assert.deepEqual(allowed('sales:process'), ['admin', 'manager']);
});

test('Super Admin can NEVER approve or cancel (business rule 4)', () => {
  assert.equal(can('super_admin', 'sales:process'), false);
});

test('only Sales can create sales requests', () => {
  assert.deepEqual(allowed('sales:create'), ['sales']);
});

test('Sales has no management permissions at all', () => {
  for (const p of ['warehouse:manage', 'user:manage', 'product:manage', 'stock:manage', 'inventory:view', 'report:view', 'settings:manage']) {
    assert.equal(can('sales', p), false, `sales must not have ${p}`);
  }
});

test('Manager has no warehouse / user / product / stock management', () => {
  for (const p of ['warehouse:manage', 'user:manage', 'product:manage', 'stock:manage']) {
    assert.equal(can('manager', p), false, `manager must not have ${p}`);
  }
  assert.equal(can('manager', 'report:view'), true);
});

test('Super Admin and Admin manage warehouses, users, products and stock', () => {
  for (const p of ['warehouse:manage', 'user:manage', 'product:manage', 'stock:manage']) {
    assert.deepEqual(allowed(p), ['super_admin', 'admin']);
  }
});

test('reports are visible to Super Admin, Admin and Manager only', () => {
  assert.deepEqual(allowed('report:view'), ['super_admin', 'admin', 'manager']);
});

test('unknown permissions and roles are denied', () => {
  assert.equal(can('admin', 'does:not:exist'), false);
  assert.equal(can('hacker', 'dashboard:view'), false);
});

test('manageable roles: Super Admin all four, Admin only Manager + Sales, others none', () => {
  assert.deepEqual(manageableRoles('super_admin'), ['super_admin', 'admin', 'manager', 'sales']);
  assert.deepEqual(manageableRoles('admin'), ['manager', 'sales']);
  assert.deepEqual(manageableRoles('manager'), []);
  assert.deepEqual(manageableRoles('sales'), []);
});

test('every permission only lists real roles', () => {
  for (const roles of Object.values(PERMISSIONS)) for (const r of roles) assert.ok(ROLES.includes(r));
});
