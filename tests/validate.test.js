import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/utils/AppError.js';
import * as v from '../src/utils/validate.js';

const throwsApp = (fn, pattern) => assert.throws(fn, (err) => err instanceof AppError && (!pattern || pattern.test(err.message)));

test('quantity must be a whole number greater than 0', () => {
  assert.equal(v.wholeNumber('5', 'Quantity', { min: 1 }), 5);
  throwsApp(() => v.wholeNumber(0, 'Quantity', { min: 1 }), /greater than 0/);
  throwsApp(() => v.wholeNumber(-3, 'Quantity', { min: 1 }), /greater than 0/);
  throwsApp(() => v.wholeNumber(2.5, 'Quantity', { min: 1 }), /whole number/);
  throwsApp(() => v.wholeNumber('abc', 'Quantity', { min: 1 }), /whole number/);
  throwsApp(() => v.wholeNumber('', 'Quantity', { min: 1 }), /whole number/);
});

test('stock level may be 0 but not negative', () => {
  assert.equal(v.wholeNumber(0, 'Stock', { min: 0 }), 0);
  throwsApp(() => v.wholeNumber(-1, 'Stock', { min: 0 }), /not be negative/);
});

test('price must not be negative', () => {
  assert.equal(v.money('12.345'), 12.35);
  assert.equal(v.money(0), 0);
  throwsApp(() => v.money(-1), /not be negative/);
  throwsApp(() => v.money('x'), /must be a number/);
  throwsApp(() => v.money(Infinity), /must be a number/);
});

test('required strings are trimmed and must not be empty', () => {
  assert.equal(v.reqString('  hi  ', 'Name'), 'hi');
  throwsApp(() => v.reqString('   ', 'Name'), /required/);
  throwsApp(() => v.reqString(undefined, 'Name'), /required/);
  throwsApp(() => v.reqString({ $ne: '' }, 'Name'), /required/); // object injection is rejected
});

test('email validation', () => {
  assert.equal(v.email('  A@B.com '), 'a@b.com');
  throwsApp(() => v.email('not-an-email'), /valid email/);
  throwsApp(() => v.email({ $gt: '' }), /required/);
});

test('password rules', () => {
  assert.equal(v.password('Abcdefg1'), 'Abcdefg1');
  throwsApp(() => v.password('short'), /at least 8/);
  throwsApp(() => v.password('x'.repeat(73)), /at most 72/);
});

test('object ids must be 24-char hex STRINGS', () => {
  assert.equal(v.objectId('507f1f77bcf86cd799439011'), '507f1f77bcf86cd799439011');
  throwsApp(() => v.objectId('123'));
  throwsApp(() => v.objectId({ $ne: null }));
  throwsApp(() => v.objectId(['507f1f77bcf86cd799439011']));
});

test('sanitize copies only whitelisted fields (blocks mass assignment)', () => {
  const spec = { name: { label: 'Name', required: true, parse: (x) => v.reqString(x, 'Name') } };
  assert.deepEqual(v.sanitize({ name: ' A ', role: 'super_admin', _id: 'x' }, spec), { name: 'A' });
});

test('sanitize: missing required field fails, PATCH (partial) only validates what was sent', () => {
  const spec = {
    name: { label: 'Name', required: true, parse: (x) => v.reqString(x, 'Name') },
    status: { label: 'Status', default: 'active', parse: (x) => v.oneOf(x, 'Status', ['active', 'inactive']) },
  };
  throwsApp(() => v.sanitize({}, spec), /Name is required/);
  assert.deepEqual(v.sanitize({ name: 'A' }, spec), { name: 'A', status: 'active' });
  assert.deepEqual(v.sanitize({ status: 'inactive' }, spec, { partial: true }), { status: 'inactive' });
  throwsApp(() => v.sanitize({ status: 'weird' }, spec, { partial: true }), /not valid/);
});
