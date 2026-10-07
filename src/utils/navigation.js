import {
  LayoutDashboard, Warehouse, Users, Package, Layers, Archive, Boxes, ShoppingCart, BarChart3,
} from 'lucide-react';

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard:view', end: true },
  { path: '/warehouses', label: 'Warehouses', icon: Warehouse, perm: 'warehouse:manage' },
  { path: '/users', label: 'Users', icon: Users, perm: 'user:manage' },
  { path: '/products', label: 'Products', icon: Package, perm: 'product:manage' },
  { path: '/sub-products', label: 'Sub-products', icon: Layers, perm: 'product:manage' },
  { path: '/consumables', label: 'Consumables', icon: Archive, perm: 'product:manage' },
  { path: '/inventory', label: 'Inventory', icon: Boxes, perm: 'inventory:view' },
  { path: '/sales-requests', label: 'Sales Requests', icon: ShoppingCart, perm: 'sales:view' },
  { path: '/reports', label: 'Reports', icon: BarChart3, perm: 'report:view' },
];
