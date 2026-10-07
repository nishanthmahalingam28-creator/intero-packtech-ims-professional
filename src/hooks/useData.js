// One hook per API resource. The SERVER already limits what each role receives
// (Super Admin: everything; others: their own warehouse; Sales: only their own requests),
// so these hooks simply ask for the data. `enabled` avoids calling endpoints a role may not use.
import useApi from './useApi';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/permissions';
import { DEFAULT_LOW_STOCK } from '../utils/constants';

const DEFAULT_SETTINGS = { lowStockThreshold: DEFAULT_LOW_STOCK };

export const useWarehouses = () => useApi('/warehouses');
export const useProducts = () => useApi('/products');
export const useSalesRequests = () => useApi('/sales-requests');

export function useSubProducts() {
  const { profile } = useAuth();
  return useApi('/sub-products', { enabled: can(profile.role, 'product:manage') });
}

export function useConsumables() {
  const { profile } = useAuth();
  return useApi('/consumables', { enabled: can(profile.role, 'product:manage') });
}

export function useUsers() {
  const { profile } = useAuth();
  return useApi('/users', { enabled: can(profile.role, 'user:manage') });
}

export function useStockTransactions() {
  const { profile } = useAuth();
  return useApi('/stock-transactions', { enabled: can(profile.role, 'inventory:view') });
}

export function useLowStockThreshold() {
  const { data } = useApi('/settings', { initial: DEFAULT_SETTINGS });
  return data?.lowStockThreshold ?? DEFAULT_LOW_STOCK;
}
