import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Plus, ShoppingCart, XCircle } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import StatCard from '../../../components/ui/StatCard';
import ErrorState from '../../../components/ui/ErrorState';
import { RecentRequests } from '../components/Cards';
import { useSalesRequests } from '../../../hooks/useData';
import { salesStats } from '../../../utils/stats';
import { formatNumber } from '../../../utils/format';

export default function SalesDashboard() {
  const sales = useSalesRequests();
  const s = salesStats(sales.data);

  return (
    <>
      <PageHeader
        title="Sales Dashboard"
        subtitle="Create sales requests and track their approval status."
        action={<Link to="/sales-requests?new=1" className="btn-primary"><Plus className="h-4 w-4" /> Create Sales Request</Link>}
      />
      <ErrorState message={sales.error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingCart} label="My Sales Requests" value={formatNumber(s.total)} tone="teal" to="/sales-requests" />
        <StatCard icon={Clock} label="Pending Requests" value={formatNumber(s.pending)} tone="amber" to="/sales-requests" />
        <StatCard icon={CheckCircle2} label="Approved Requests" value={formatNumber(s.approved)} tone="green" to="/sales-requests" />
        <StatCard icon={XCircle} label="Cancelled Requests" value={formatNumber(s.cancelled)} tone="red" to="/sales-requests" />
      </div>

      <div className="mt-6">
        <RecentRequests requests={sales.data} title="My recent requests" showUser={false} limit={8} />
      </div>
    </>
  );
}
