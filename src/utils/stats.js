import { STATUS } from './constants';

export const salesStats = (requests) => {
  const by = (s) => requests.filter((r) => r.status === s);
  return {
    total: requests.length,
    pending: by(STATUS.PENDING).length,
    approved: by(STATUS.APPROVED).length,
    cancelled: by(STATUS.CANCELLED).length,
    revenue: by(STATUS.APPROVED).reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0),
  };
};

export const stockStats = (products, threshold) => ({
  products: products.length,
  totalStock: products.reduce((s, p) => s + (Number(p.stockQuantity) || 0), 0),
  lowStock: products.filter((p) => p.stockQuantity <= threshold).length, // includes out-of-stock
  outOfStock: products.filter((p) => p.stockQuantity <= 0).length,
});
