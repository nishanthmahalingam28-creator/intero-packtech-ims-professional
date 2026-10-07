import { AlertTriangle, Boxes, CheckCircle2, Clock, XCircle } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import StatCard from '../../../components/ui/StatCard';
import ErrorState from '../../../components/ui/ErrorState';
import { LowStockList, RecentRequests, RecentTransactions } from '../components/Cards';
import { useLowStockThreshold, useProducts, useSalesRequests, useStockTransactions, useWarehouses } from '../../../hooks/useData';
import { STATUS } from '../../../utils/constants';
import { salesStats, stockStats } from '../../../utils/stats';
import { formatCurrency, formatNumber } from '../../../utils/format';

export default function ManagerDashboard() {
  const threshold = useLowStockThreshold();
  const wh = useWarehouses();
  const products = useProducts();
  const sales = useSalesRequests();
  const txns = useStockTransactions();

  const s = salesStats(sales.data);
  const st = stockStats(products.data, threshold);
  const pending = sales.data.filter((r) => r.status === STATUS.PENDING);
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));

  return (
    <>
      <PageHeader title="Manager Dashboard" subtitle="Approval queue, sales and stock for your warehouse." />
      <ErrorState message={sales.error || products.error || txns.error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Clock} label="Pending Approvals" value={formatNumber(s.pending)} tone="amber" to="/sales-requests" />
        <StatCard icon={CheckCircle2} label="Approved Sales" value={formatNumber(s.approved)} hint={formatCurrency(s.revenue)} tone="green" to="/sales-requests" />
        <StatCard icon={XCircle} label="Cancelled Sales" value={formatNumber(s.cancelled)} tone="red" to="/sales-requests" />
        <StatCard icon={Boxes} label="Total Stock" value={formatNumber(st.totalStock)} tone="teal" to="/inventory" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Low-stock Products" value={formatNumber(st.lowStock)} tone="orange" to="/inventory" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RecentRequests requests={pending} title="Approval queue" limit={6} />
        <RecentTransactions transactions={txns.data} />
        <LowStockList products={products.data} threshold={threshold} warehouses={whMap} />
        <RecentRequests requests={sales.data.filter((r) => r.status !== STATUS.PENDING)} title="Recently processed" />
      </div>
    </>
  );
}
