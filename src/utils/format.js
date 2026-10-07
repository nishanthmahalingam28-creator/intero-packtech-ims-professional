export const toDate = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
};

export const formatDateTime = (ts) => {
  const d = toDate(ts);
  return d
    ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';
};

export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);

export const formatNumber = (n) => new Intl.NumberFormat('en-IN').format(Number(n) || 0);

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || 'U';

// Human-friendly codes such as SR-K3F9AB (collisions are extremely unlikely)
export const genCode = (prefix) =>
  `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;

export const getStockStatus = (qty, threshold) => {
  if (qty <= 0) return 'Out of Stock';
  if (qty <= threshold) return 'Low Stock';
  return 'In Stock';
};

// from/to are "YYYY-MM-DD" strings from <input type="date">
export const dateInRange = (ts, from, to) => {
  const d = toDate(ts);
  if (!d) return !from && !to;
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to && d > new Date(`${to}T23:59:59.999`)) return false;
  return true;
};
