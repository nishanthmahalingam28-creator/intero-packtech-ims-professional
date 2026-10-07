import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Eye, Plus, X } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import DataTable from '../../../components/ui/DataTable';
import ErrorState from '../../../components/ui/ErrorState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import CreateRequestModal from '../components/CreateRequestModal';
import RequestDetails from '../components/RequestDetails';
import { useAuth } from '../../../context/AuthContext';
import { useProducts, useSalesRequests, useWarehouses } from '../../../hooks/useData';
import useAction from '../../../hooks/useAction';
import { approveRequest, cancelRequest, createSalesRequest } from '../services/salesService';
import { can } from '../../../utils/permissions';
import { ROLES, STATUS } from '../../../utils/constants';
import { dateInRange, formatCurrency, formatDate, formatNumber } from '../../../utils/format';

export default function SalesRequests() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const sales = useSalesRequests();
  const products = useProducts();
  const wh = useWarehouses();
  const { busy, run } = useAction();
  const canCreate = can(profile.role, 'sales:create');
  const canProcess = can(profile.role, 'sales:process'); // Admin + Manager only
  const [createOpen, setCreateOpen] = useState(canCreate && params.get('new') === '1');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'approve' | 'cancel', request }

  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));
  const orderable = products.data.filter((p) => p.status === 'active' && p.stockQuantity > 0);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.data
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => dateInRange(r.createdAt, from, to))
      .filter((r) => !q || [r.requestNo, r.productName, r.salesUserName].some((v) => (v || '').toLowerCase().includes(q)));
  }, [sales.data, search, status, from, to]);

  const closeCreate = () => { setCreateOpen(false); if (params.get('new')) setParams({}, { replace: true }); };

  const create = async (product, quantity, notes) => {
    const ok = await run(() => createSalesRequest(product.id, quantity, notes), 'Sales request created and sent for approval.');
    if (ok) closeCreate();
  };

  const handleProcess = async () => {
    const { type, request } = confirm;
    const ok = await run(
      () => (type === 'approve' ? approveRequest(request.id) : cancelRequest(request.id)),
      type === 'approve' ? 'Request approved and stock updated.' : 'Request cancelled.'
    );
    // Close the dialog either way: on failure the error toast explains why, and the live list shows the real status.
    if (ok !== undefined) setConfirm(null);
  };

  const columns = [
    { key: 'requestNo', label: 'Request ID', sortable: true, render: (r) => <span className="font-mono text-xs font-medium">{r.requestNo}</span> },
    { key: 'productName', label: 'Product', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true, render: (r) => formatNumber(r.quantity) },
    ...(profile.role === ROLES.SALES ? [] : [{ key: 'salesUserName', label: 'Sales user', sortable: true }]),
    { key: 'warehouseName', label: 'Warehouse', render: (r) => r.warehouseName || whMap[r.warehouseId] || '-' },
    { key: 'totalAmount', label: 'Amount', sortable: true, render: (r) => formatCurrency(r.totalAmount) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <Badge status={r.status} /> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions', label: 'Actions', render: (r) => (
        <div className="flex gap-1">
          <button className="btn-secondary btn-sm" title="View details" onClick={() => setViewing(r)}><Eye className="h-3.5 w-3.5" /></button>
          {canProcess && r.status === STATUS.PENDING && (
            <>
              <button className="btn-primary btn-sm" onClick={() => setConfirm({ type: 'approve', request: r })}><Check className="h-3.5 w-3.5" /> Approve</button>
              <button className="btn-secondary btn-sm text-red-600" onClick={() => setConfirm({ type: 'cancel', request: r })}><X className="h-3.5 w-3.5" /> Cancel</button>
            </>
          )}
        </div>
      ),
    },
  ];

  const subtitle = profile.role === ROLES.SALES ? 'Create requests and track their status.'
    : canProcess ? 'Review pending requests, then approve or cancel them.'
    : 'View-only access to sales requests.';

  return (
    <>
      <PageHeader title="Sales Requests" subtitle={subtitle}
        action={canCreate && <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Sales Request</button>} />
      <ErrorState message={sales.error || products.error} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Search ID, product or user..." />
        <Select className="lg:w-44" value={status} onChange={setStatus} aria-label="Filter by status" options={[{ value: 'all', label: 'All statuses' }, ...Object.values(STATUS).map((s) => ({ value: s, label: s }))]} />
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span className="text-slate-400">to</span>
          <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
      </div>

      <DataTable columns={columns} rows={rows} loading={sales.loading} emptyTitle="No sales requests found"
        emptyText={canCreate ? 'Create your first sales request.' : 'Requests will appear here when sales users create them.'}
        initialSort={{ key: 'createdAt', dir: 'desc' }} />

      <CreateRequestModal open={createOpen} onClose={closeCreate} products={orderable} onSave={create} busy={busy} />
      <RequestDetails request={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={!!confirm} busy={busy} danger={confirm?.type === 'cancel'}
        title={confirm?.type === 'approve' ? 'Approve sales request?' : 'Cancel sales request?'}
        confirmLabel={confirm?.type === 'approve' ? 'Approve request' : 'Cancel request'}
        message={confirm ? (confirm.type === 'approve'
          ? `Approving ${confirm.request.requestNo} will reduce the stock of "${confirm.request.productName}" by ${formatNumber(confirm.request.quantity)}.`
          : `${confirm.request.requestNo} will be cancelled. Stock will not change.`) : ''}
        onConfirm={handleProcess} onCancel={() => setConfirm(null)} />
    </>
  );
}
