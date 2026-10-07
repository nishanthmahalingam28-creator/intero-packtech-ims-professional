// Small input validators. Every function either returns a CLEAN value of the right type or throws an
// AppError with a friendly message. Because only clean primitives ever reach the database, a client cannot
// inject query operators such as {"$ne": null} (NoSQL injection).
import { AppError } from './AppError.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID = /^[a-f\d]{24}$/i;

export function reqString(value, label, { max = 200 } = {}) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) throw new AppError(`${label} is required.`);
  if (s.length > max) throw new AppError(`${label} is too long (maximum ${max} characters).`);
  return s;
}

export function optString(value, label, { max = 1000 } = {}) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new AppError(`${label} is not valid.`);
  const s = value.trim();
  if (s.length > max) throw new AppError(`${label} is too long (maximum ${max} characters).`);
  return s;
}

export function email(value, label = 'Email') {
  const s = reqString(value, label, { max: 254 }).toLowerCase();
  if (!EMAIL.test(s)) throw new AppError('Enter a valid email address.');
  return s;
}

export function optEmail(value, label = 'Email') {
  if (value == null || value === '') return '';
  return email(value, label);
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 8) throw new AppError('Password must be at least 8 characters.');
  if (value.length > 72) throw new AppError('Password must be at most 72 characters.'); // bcrypt limit
  return value;
}

// Money: a number that is not negative. Stored with 2 decimals.
export function money(value, label = 'Price') {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new AppError(`${label} must be a number.`);
  if (n < 0) throw new AppError(`${label} must not be negative.`);
  if (n > 1e9) throw new AppError(`${label} is too large.`);
  return Math.round(n * 100) / 100;
}

// Whole number. min = 1 for quantities that must be positive, 0 for stock levels.
export function wholeNumber(value, label = 'Quantity', { min = 0, max = 1e9 } = {}) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isInteger(n)) throw new AppError(`${label} must be a whole number.`);
  if (n < min) throw new AppError(min > 0 ? `${label} must be greater than 0.` : `${label} must not be negative.`);
  if (n > max) throw new AppError(`${label} is too large.`);
  return n;
}

export function oneOf(value, label, allowed) {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new AppError(`${label} is not valid.`);
  return value;
}

// MongoDB ids must be 24-character hex STRINGS (never objects).
export function objectId(value, label = 'Identifier') {
  if (typeof value !== 'string' || !OBJECT_ID.test(value)) throw new AppError(`${label} is not valid.`);
  return value;
}

// Copies ONLY the fields listed in `spec` from `body` (this blocks "mass assignment", e.g. a client
// sending { role: 'super_admin' } to an endpoint that should not accept it).
// spec = { fieldName: { label, parse(value), required?, default? } }
// partial = true  -> used for PATCH: only fields that were sent are validated and returned.
export function sanitize(body, spec, { partial = false } = {}) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const out = {};
  for (const [key, rule] of Object.entries(spec)) {
    const present = Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined;
    if (!present) {
      if (!partial && rule.required) throw new AppError(`${rule.label} is required.`);
      if (!partial && 'default' in rule) out[key] = rule.default;
      continue;
    }
    out[key] = rule.parse(input[key]);
  }
  return out;
}
