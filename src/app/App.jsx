import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import { ProtectedRoute, RoleRoute } from './ProtectedRoute.jsx';
import Login from '../modules/auth/pages/Login.jsx';
import Dashboard from '../modules/dashboard/pages/Dashboard.jsx';
import Warehouses from '../modules/warehouses/pages/Warehouses.jsx';
import Users from '../modules/users/pages/Users.jsx';
import Products from '../modules/products/pages/Products.jsx';
import SubProducts from '../modules/sub-products/pages/SubProducts.jsx';
import Consumables from '../modules/consumables/pages/Consumables.jsx';
import Inventory from '../modules/inventory/pages/Inventory.jsx';
import SalesRequests from '../modules/sales/pages/SalesRequests.jsx';
import Reports from '../modules/reports/pages/Reports.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="warehouses" element={<RoleRoute perm="warehouse:manage"><Warehouses /></RoleRoute>} />
        <Route path="users" element={<RoleRoute perm="user:manage"><Users /></RoleRoute>} />
        <Route path="products" element={<RoleRoute perm="product:manage"><Products /></RoleRoute>} />
        <Route path="sub-products" element={<RoleRoute perm="product:manage"><SubProducts /></RoleRoute>} />
        <Route path="consumables" element={<RoleRoute perm="product:manage"><Consumables /></RoleRoute>} />
        <Route path="inventory" element={<RoleRoute perm="inventory:view"><Inventory /></RoleRoute>} />
        <Route path="sales-requests" element={<RoleRoute perm="sales:view"><SalesRequests /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute perm="report:view"><Reports /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
