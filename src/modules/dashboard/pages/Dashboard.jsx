import { useAuth } from '../../../context/AuthContext';
import { ROLES } from '../../../utils/constants';
import SuperAdminDashboard from './SuperAdminDashboard';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import SalesDashboard from './SalesDashboard';

// Picks the dashboard that belongs to the logged-in role.
export default function Dashboard() {
  const { profile } = useAuth();
  switch (profile.role) {
    case ROLES.SUPER_ADMIN: return <SuperAdminDashboard />;
    case ROLES.ADMIN: return <AdminDashboard />;
    case ROLES.MANAGER: return <ManagerDashboard />;
    default: return <SalesDashboard />;
  }
}
