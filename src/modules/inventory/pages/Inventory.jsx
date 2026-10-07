import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import DataTable from '../../../components/ui/DataTable';
import ErrorState from '../../../components/ui/ErrorState';
import Spinner from '../../../components/ui/Spinner';
import StockAdjustModal from '../components/StockAdjustModal';
import { useAuth } from '../../../context/AuthContext';
import { useLowStockThreshold, useProducts, useSalesRequests, useStockTransactions, useWarehouses } from '../../../hooks/useData';
import useAction from '../../../hooks/useAction';
import { adjustStock } from '../../products/services/productService';
import { saveLowStockThreshold } from '../../settings/services/settingsService';
import { can } from '../../../utils/permissions';
import { ROLES, STATUS } from '../../../utils/constants';
import { formatCurrency, formatDateTime, formatNumber, getStockStatus } from '../../../utils/format';

export default function Inventory() {
  const { profile } = useAuth();
  const products = useProducts();
  const wh = useWarehouses();
  const sales = useSalesRequests();
  const txns = useStockTransactions();
  const threshold = useLowStockThreshold();
  const { busy, run } = useAction();
  const [tab, setTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [warehouse, setWarehouse] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adjusting, setAdjusting] = useState(null);
  const [limitInput, setLimitInput] = useState(String(threshold));

  useEffect(() => setLimitInput(String(threshold)), [threshold]);

  const canManageStock = can(profile.role, 'stock:manage');
  const canConfigure = can(profile.role, 'settings:manage');
  const isSuper = profile.role === ROLES.SUPER_ADMIN;
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));

  // Reserved = quantity in Pending requests (stock is only deducted on approval)
  const reserved = useMemo(() => {
    const m = {};
    sales.data.filter((r) => r.status === STATUS.PENDING).forEach((r) => { m[r.productId] = (m[r.productId] || 0) + r.quantity; });
    return m;
  }, [sales.data]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.data
      .filter((p) => warehouse === 'all' || p.warehouseId === warehouse)
      .filter((p) => statusFilter === 'all' || getStockStatus(p.stockQuantity, threshold) === statusFilter)
      .filter((p) => !q || [p.name, p.code].some((v) => (v || '').toLowerCase().includes(q)));
  }, [products.data, search, warehouse, statusFilter, threshold]);

  const saveStock = async (mode, amount, reason) => {
    const ok = await run(() => adjustStock(adjusting.id, mode, amount, reason), 'Stock updated.');
    if (ok) setAdjusting(null);
  };

  const columns = [
    { key: 'name', label: 'Product', sortable: true, render: (p) => <div><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.code}</p></div> },
    { key: 'warehouseId', label: 'Warehouse', sortable: true, sortValue: (p) => whMap[p.warehouseId] || '', render: (p) => whMap[p.warehouseId] || '-' },
    { key: 'stockQuantity', label: 'Available', sortable: true, render: (p) => <span className="font-semibold">{formatNumber(p.stockQuantity)}</span> },
    { key: 'reserved', label: 'Reserved (pending)', sortValue: (p) => reserved[p.id] || 0, sortable: true, render: (p) => formatNumber(reserved[p.id] || 0) },
    { key: 'price', label: 'Price', sortable: true, render: (p) => formatCurrency(p.price) },
    { key: 'stockStatus', label: 'Stock status', render: (p) => <Badge status={getStockStatus(p.stockQuantity, threshold)} /> },
    { key: 'updatedAt', label: 'Last updated', sortable: true, render: (p) => formatDateTime(p.updatedAt) },
    ...(canManageStock ? [{ key: 'actions', label: 'Actions', render: (p) => <button className="btn-secondary btn-sm" onClick={() => setAdjusting(p)}><SlidersHorizontal className="h-3.5 w-3.5" /> Adjust</button> }] : []),
  ];

  const historyColumns = [
    { key: 'createdAt', label: 'Date', sortable: true, render: (t) => formatDateTime(t.createdAt) },
    { key: 'productName', label: 'Product', sortable: true },
    { key: 'type', label: 'Type', render: (t) => <Badge status={t.type} /> },
    { key: 'quantityChange', label: 'Change', sortable: true, render: (t) => <span className={`font-semibold ${t.quantityChange < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{t.quantityChange > 0 ? '+' : ''}{formatNumber(t.quantityChange)}</span> },
    { key: 'balanceAfter', label: 'Balance after', render: (t) => formatNumber(t.balanceAfter) },
    { key: 'reason', label: 'Reason' },
    { key: 'performedByName', label: 'By' },
  ];

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === id ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{label}</button>
  );

  return (
    <>
      <PageHeader title="Inventory" subtitle="Live stock levels, reserved quantities and stock history." />
      <ErrorState message={products.error || sales.error || txns.error} />

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Low-stock threshold</p>
          <p className="text-xs text-slate-500">Products with stock at or below this number show as "Low Stock".</p>
        </div>
        {canConfigure ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(() => saveLowStockThreshold(limitInput), 'Threshold saved.'); }}>
            <input type="number" min="0" step="1" className="input w-28" value={limitInput} onChange={(e) => setLimitInput(e.target.value)} aria-label="Low stock threshold" />
            <button className="btn-primary" disabled={busy}>{busy && <Spinner size="sm" />} Save</button>
          </form>
        ) : (
          <p className="text-lg font-bold">{formatNumber(threshold)}</p>
        )}
      </div>

      <div className="mb-4 flex gap-1">{tabBtn('stock', 'Stock levels')}{tabBtn('history', 'Stock history')}</div>

      {tab === 'stock' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Search product or ID..." />
            {isSuper && <Select className="lg:w-48" value={warehouse} onChange={setWarehouse} aria-label="Filter by warehouse" options={[{ value: 'all', label: 'All warehouses' }, ...wh.data.map((w) => ({ value: w.id, label: w.name }))]} />}
            <Select className="lg:w-44" value={statusFilter} onChange={setStatusFilter} aria-label="Filter by stock status" options={[{ value: 'all', label: 'All stock levels' }, { value: 'In Stock', label: 'In Stock' }, { value: 'Low Stock', label: 'Low Stock' }, { value: 'Out of Stock', label: 'Out of Stock' }]} />
          </div>
          <DataTable columns={columns} rows={rows} loading={products.loading} emptyTitle="No stock records" emptyText="Products you add will appear here." initialSort={{ key: 'name', dir: 'asc' }} />
        </>
      ) : (
        <DataTable columns={historyColumns} rows={txns.data} loading={txns.loading} emptyTitle="No stock history yet" emptyText="Every stock change is recorded here." initialSort={{ key: 'createdAt', dir: 'desc' }} />
      )}

      <StockAdjustModal product={adjusting} onClose={() => setAdjusting(null)} onSave={saveStock} busy={busy} />
    </>
  );
}
