import { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import StatCard from '../../../components/ui/StatCard';
import DataTable from '../../../components/ui/DataTable';
import ErrorState from '../../../components/ui/ErrorState';
import { AlertTriangle, Boxes, CheckCircle2, Clock, Package, ShoppingCart, Wallet, XCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useLowStockThreshold, useProducts, useSalesRequests, useWarehouses } from '../../../hooks/useData';
import { downloadCsv } from '../../../utils/csv';
import { ROLES, STATUS } from '../../../utils/constants';
import { salesStats } from '../../../utils/stats';
import { dateInRange, formatCurrency, formatDate, formatDateTime, formatNumber, getStockStatus } from '../../../utils/format';

export default function Reports() {
  const { profile } = useAuth();
  const sales = useSalesRequests();
  const products = useProducts();
  const wh = useWarehouses();
  const threshold = useLowStockThreshold();
  const [tab, setTab] = useState('sales');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [warehouse, setWarehouse] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [printing, setPrinting] = useState(false);

  const isSuper = profile.role === ROLES.SUPER_ADMIN;
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));
  const whName = (id, fallback) => fallback || whMap[id] || '-';

  const switchTab = (t) => { setTab(t); setSearch(''); setStatus('all'); setWarehouse('all'); setFrom(''); setTo(''); };

  // ---------- Sales report ----------
  const salesRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.data
      .filter((r) => status === 'all' || r.status === status)
      .filter((r) => warehouse === 'all' || r.warehouseId === warehouse)
      .filter((r) => dateInRange(r.createdAt, from, to))
      .filter((r) => !q || [r.requestNo, r.productName, r.salesUserName].some((v) => (v || '').toLowerCase().includes(q)));
  }, [sales.data, search, status, warehouse, from, to]);
  const ss = salesStats(salesRows);

  const salesColumns = [
    { key: 'requestNo', label: 'Request ID', sortable: true, csv: (r) => r.requestNo },
    { key: 'productName', label: 'Product', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true, render: (r) => formatNumber(r.quantity) },
    { key: 'totalAmount', label: 'Amount', sortable: true, render: (r) => formatCurrency(r.totalAmount), csv: (r) => r.totalAmount },
    { key: 'salesUserName', label: 'Sales user', sortable: true },
    { key: 'warehouseName', label: 'Warehouse', render: (r) => whName(r.warehouseId, r.warehouseName), csv: (r) => whName(r.warehouseId, r.warehouseName) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <Badge status={r.status} /> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (r) => formatDate(r.createdAt), csv: (r) => formatDateTime(r.createdAt) },
    { key: 'processedByName', label: 'Approved / cancelled by', render: (r) => r.processedByName || '-', csv: (r) => r.processedByName || '' },
  ];

  // ---------- Stock report ----------
  const stockRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.data
      .filter((p) => status === 'all' || getStockStatus(p.stockQuantity, threshold) === status)
      .filter((p) => warehouse === 'all' || p.warehouseId === warehouse)
      .filter((p) => dateInRange(p.updatedAt, from, to))
      .filter((p) => !q || [p.name, p.code, p.category].some((v) => (v || '').toLowerCase().includes(q)));
  }, [products.data, search, status, warehouse, from, to, threshold]);

  const stockSummary = {
    products: stockRows.length,
    totalStock: stockRows.reduce((s, p) => s + p.stockQuantity, 0),
    value: stockRows.reduce((s, p) => s + p.stockQuantity * p.price, 0),
    low: stockRows.filter((p) => p.stockQuantity <= threshold).length,
  };

  const stockColumns = [
    { key: 'name', label: 'Product', sortable: true },
    { key: 'warehouseId', label: 'Warehouse', sortable: true, sortValue: (p) => whMap[p.warehouseId] || '', render: (p) => whMap[p.warehouseId] || '-', csv: (p) => whMap[p.warehouseId] || '' },
    { key: 'stockQuantity', label: 'Current stock', sortable: true, render: (p) => formatNumber(p.stockQuantity), csv: (p) => p.stockQuantity },
    { key: 'price', label: 'Price', sortable: true, render: (p) => formatCurrency(p.price), csv: (p) => p.price },
    { key: 'stockStatus', label: 'Stock status', render: (p) => <Badge status={getStockStatus(p.stockQuantity, threshold)} />, csv: (p) => getStockStatus(p.stockQuantity, threshold) },
    { key: 'updatedAt', label: 'Last updated', sortable: true, render: (p) => formatDateTime(p.updatedAt), csv: (p) => formatDateTime(p.updatedAt) },
  ];

  const isSales = tab === 'sales';
  const columns = isSales ? salesColumns : stockColumns;
  const rows = isSales ? salesRows : stockRows;

  const exportCsv = () => downloadCsv(`${isSales ? 'sales' : 'stock'}-report-${new Date().toISOString().slice(0, 10)}.csv`, columns, rows);
  const print = () => { setPrinting(true); setTimeout(() => { window.print(); setPrinting(false); }, 150); };

  const statusOptions = isSales
    ? [{ value: 'all', label: 'All statuses' }, ...Object.values(STATUS).map((s) => ({ value: s, label: s }))]
    : [{ value: 'all', label: 'All stock levels' }, { value: 'In Stock', label: 'In Stock' }, { value: 'Low Stock', label: 'Low Stock' }, { value: 'Out of Stock', label: 'Out of Stock' }];

  const tabBtn = (id, label) => (
    <button onClick={() => switchTab(id)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === id ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{label}</button>
  );

  return (
    <>
      <div className="mb-4 hidden print:block">
        <p className="text-lg font-bold">Intero Packtech Pvt. Ltd. - {isSales ? 'Sales' : 'Stock'} Report</p>
        <p className="text-sm">Generated {formatDateTime(new Date())} by {profile.name}</p>
      </div>

      <PageHeader title="Reports" subtitle="Sales and stock reports built from live data."
        action={<>
          <button className="btn-secondary" onClick={print}><Printer className="h-4 w-4" /> Print / PDF</button>
          <button className="btn-primary" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> Download CSV</button>
        </>} />
      <ErrorState message={sales.error || products.error} />

      <div className="mb-4 flex gap-1 print:hidden">{tabBtn('sales', 'Sales report')}{tabBtn('stock', 'Stock report')}</div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end print:hidden">
        <SearchInput value={search} onChange={setSearch} placeholder={isSales ? 'Search ID, product or user...' : 'Search product or category...'} />
        <Select className="lg:w-44" value={status} onChange={setStatus} options={statusOptions} aria-label="Filter by status" />
        {isSuper && <Select className="lg:w-48" value={warehouse} onChange={setWarehouse} aria-label="Filter by warehouse" options={[{ value: 'all', label: 'All warehouses' }, ...wh.data.map((w) => ({ value: w.id, label: w.name }))]} />}
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label={isSales ? 'Request from date' : 'Updated from date'} />
          <span className="text-slate-400">to</span>
          <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label={isSales ? 'Request to date' : 'Updated to date'} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
        {isSales ? (
          <>
            <StatCard icon={ShoppingCart} label="Requests" value={formatNumber(ss.total)} tone="teal" />
            <StatCard icon={CheckCircle2} label="Approved" value={formatNumber(ss.approved)} tone="green" />
            <StatCard icon={Clock} label="Pending" value={formatNumber(ss.pending)} tone="amber" />
            <StatCard icon={XCircle} label="Cancelled" value={formatNumber(ss.cancelled)} tone="red" />
            <StatCard icon={Wallet} label="Approved sales value" value={formatCurrency(ss.revenue)} tone="blue" />
          </>
        ) : (
          <>
            <StatCard icon={Package} label="Products" value={formatNumber(stockSummary.products)} tone="purple" />
            <StatCard icon={Boxes} label="Total stock" value={formatNumber(stockSummary.totalStock)} tone="green" />
            <StatCard icon={Wallet} label="Stock value" value={formatCurrency(stockSummary.value)} tone="blue" />
            <StatCard icon={AlertTriangle} label="Low / out of stock" value={formatNumber(stockSummary.low)} tone="orange" />
          </>
        )}
      </div>

      <DataTable columns={columns} rows={rows} loading={isSales ? sales.loading : products.loading} pageSize={printing ? 100000 : 10}
        emptyTitle="No records match your filters" emptyText="Try widening the date range or clearing filters."
        initialSort={isSales ? { key: 'createdAt', dir: 'desc' } : { key: 'name', dir: 'asc' }} key={tab} />
    </>
  );
}
