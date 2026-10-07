import { AlertTriangle, Boxes, CheckCircle2, Clock, Package, Users, Warehouse, XCircle } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import StatCard from '../../../components/ui/StatCard';
import ErrorState from '../../../components/ui/ErrorState';
import { BarList, LowStockList, RecentRequests } from '../components/Cards';
import { useLowStockThreshold, useProducts, useSalesRequests, useUsers, useWarehouses } from '../../../hooks/useData';
import { salesStats, stockStats } from '../../../utils/stats';
import { formatCurrency, formatNumber } from '../../../utils/format';

export default function SuperAdminDashboard() {
  const threshold = useLowStockThreshold();
  const wh = useWarehouses();
  const users = useUsers();
  const products = useProducts();
  const sales = useSalesRequests();

  const s = salesStats(sales.data);
  const st = stockStats(products.data, threshold);
  const admins = users.data.filter((u) => u.role === 'admin').length;
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));
  const stockByWh = wh.data.map((w) => ({
    label: w.name,
    value: products.data.filter((p) => p.warehouseId === w.id).reduce((sum, p) => sum + p.stockQuantity, 0),
  }));
  const error = wh.error || users.error || products.error || sales.error;
  const systemEmpty = !wh.loading && wh.data.length === 0;

  return (
    <>
      <PageHeader title="Super Admin Dashboard" subtitle="Overview across all warehouses and operations." />
      <ErrorState message={error} />

      {systemEmpty && (
        <div className="card mb-6 border-teal-200 bg-teal-50/60 p-5 dark:border-teal-500/30 dark:bg-teal-500/5">
          <p className="font-semibold">Your system is empty</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Start by creating your first warehouse in the Warehouses page. Developers can also load demo data by running <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-slate-800">npm run seed:demo</code> in the server folder.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Warehouse} label="Total Warehouses" value={formatNumber(wh.data.length)} tone="teal" to="/warehouses" />
        <StatCard icon={Users} label="Total Users" value={formatNumber(users.data.length)} hint={`${admins} admin${admins === 1 ? '' : 's'}`} tone="blue" to="/users" />
        <StatCard icon={Package} label="Total Products" value={formatNumber(st.products)} tone="purple" to="/products" />
        <StatCard icon={Boxes} label="Total Stock" value={formatNumber(st.totalStock)} tone="green" to="/inventory" />
        <StatCard icon={Clock} label="Pending Sales" value={formatNumber(s.pending)} tone="amber" to="/sales-requests" />
        <StatCard icon={CheckCircle2} label="Approved Sales" value={formatNumber(s.approved)} hint={formatCurrency(s.revenue)} tone="green" to="/reports" />
        <StatCard icon={XCircle} label="Cancelled Sales" value={formatNumber(s.cancelled)} tone="red" to="/sales-requests" />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={formatNumber(st.lowStock)} hint="Includes out of stock" tone="orange" to="/inventory" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <BarList title="Stock by warehouse" items={stockByWh} link="/inventory" />
        <BarList
          title="Sales overview"
          items={[
            { label: 'Approved', value: s.approved, color: 'bg-emerald-500' },
            { label: 'Pending', value: s.pending, color: 'bg-amber-400' },
            { label: 'Cancelled', value: s.cancelled, color: 'bg-red-400' },
          ]}
          link="/sales-requests"
        />
        <RecentRequests requests={sales.data} />
        <LowStockList products={products.data} threshold={threshold} warehouses={whMap} />
      </div>

    </>
  );
}
