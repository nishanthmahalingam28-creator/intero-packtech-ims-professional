import { AlertTriangle, Boxes, CheckCircle2, Clock, Package, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader';
import StatCard from '../../../components/ui/StatCard';
import ErrorState from '../../../components/ui/ErrorState';
import { LowStockList, RecentRequests, RecentTransactions } from '../components/Cards';
import { useAuth } from '../../../context/AuthContext';
import { useLowStockThreshold, useProducts, useSalesRequests, useStockTransactions, useWarehouses } from '../../../hooks/useData';
import { salesStats, stockStats } from '../../../utils/stats';
import { formatCurrency, formatNumber } from '../../../utils/format';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const threshold = useLowStockThreshold();
  const wh = useWarehouses();
  const products = useProducts();
  const sales = useSalesRequests();
  const txns = useStockTransactions();

  const s = salesStats(sales.data);
  const st = stockStats(products.data, threshold);
  const myWh = wh.data.find((w) => w.id === profile.warehouseId);
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));

  return (
    <>
      <PageHeader title="Admin Dashboard" subtitle={myWh ? `Overview of ${myWh.name} (${myWh.code}).` : 'Overview of your warehouse.'} />
      <ErrorState message={wh.error || products.error || sales.error || txns.error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Package} label="Products" value={formatNumber(st.products)} tone="purple" to="/products" />
        <StatCard icon={Boxes} label="Current Stock" value={formatNumber(st.totalStock)} tone="green" to="/inventory" />
        <StatCard icon={Clock} label="Pending Sales Requests" value={formatNumber(s.pending)} tone="amber" to="/sales-requests" />
        <StatCard icon={CheckCircle2} label="Approved Sales" value={formatNumber(s.approved)} tone="teal" to="/sales-requests" />
        <StatCard icon={Wallet} label="Approved Sales Value" value={formatCurrency(s.revenue)} tone="blue" to="/reports" />
        <StatCard icon={AlertTriangle} label="Low-stock Products" value={formatNumber(st.lowStock)} hint={`${st.outOfStock} out of stock`} tone="orange" to="/inventory" />
      </div>

      {s.pending > 0 && (
        <div className="card mt-6 flex flex-col gap-2 border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">{s.pending} sales request{s.pending === 1 ? '' : 's'} waiting for approval.</p>
          <Link to="/sales-requests" className="btn-primary btn-sm self-start sm:self-auto">Review requests</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RecentRequests requests={sales.data} />
        <LowStockList products={products.data} threshold={threshold} warehouses={whMap} />
        <RecentTransactions transactions={txns.data} />
      </div>
    </>
  );
}
