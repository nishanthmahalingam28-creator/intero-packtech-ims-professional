import { useMemo, useState } from 'react';
import { Eye, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import DataTable from '../../../components/ui/DataTable';
import ErrorState from '../../../components/ui/ErrorState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import ProductForm from '../../inventory/components/ProductForm';
import StockAdjustModal from '../../inventory/components/StockAdjustModal';
import { useAuth } from '../../../context/AuthContext';
import { useLowStockThreshold, useProducts, useWarehouses } from '../../../hooks/useData';
import useAction from '../../../hooks/useAction';
import { adjustStock, createProduct, deleteProduct, updateProduct } from '../services/productService';
import { ROLES } from '../../../utils/constants';
import { formatCurrency, formatDateTime, formatNumber, getStockStatus } from '../../../utils/format';

export default function Products() {
  const { profile } = useAuth();
  const products = useProducts();
  const wh = useWarehouses();
  const threshold = useLowStockThreshold();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [warehouse, setWarehouse] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const isSuper = profile.role === ROLES.SUPER_ADMIN;
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));
  const selectableWh = isSuper ? wh.data : wh.data.filter((w) => w.id === profile.warehouseId);
  const categories = [...new Set(products.data.map((p) => p.category).filter(Boolean))].sort();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.data
      .filter((p) => category === 'all' || p.category === category)
      .filter((p) => warehouse === 'all' || p.warehouseId === warehouse)
      .filter((p) => stockFilter === 'all' || getStockStatus(p.stockQuantity, threshold) === stockFilter)
      .filter((p) => !q || [p.name, p.code, p.category].some((v) => (v || '').toLowerCase().includes(q)));
  }, [products.data, search, category, warehouse, stockFilter, threshold]);

  const save = async (v) => {
    const ok = await run(
      () => (editing ? updateProduct(editing.id, v) : createProduct(v)),
      editing ? 'Product updated.' : 'Product created.'
    );
    if (ok) setFormOpen(false);
  };
  const saveStock = async (mode, amount, reason) => {
    const ok = await run(() => adjustStock(adjusting.id, mode, amount, reason), 'Stock updated.');
    if (ok) setAdjusting(null);
  };
  const remove = async () => {
    const ok = await run(() => deleteProduct(deleting.id), 'Product deleted.');
    if (ok) setDeleting(null);
  };

  const columns = [
    { key: 'name', label: 'Product', sortable: true, render: (p) => <div><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500">{p.code}</p></div> },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'warehouseId', label: 'Warehouse', sortable: true, sortValue: (p) => whMap[p.warehouseId] || '', render: (p) => whMap[p.warehouseId] || '-' },
    { key: 'price', label: 'Price', sortable: true, render: (p) => formatCurrency(p.price) },
    { key: 'stockQuantity', label: 'Stock', sortable: true, render: (p) => <div className="flex items-center gap-2"><span className="font-medium">{formatNumber(p.stockQuantity)}</span><Badge status={getStockStatus(p.stockQuantity, threshold)} /></div> },
    { key: 'status', label: 'Status', sortable: true, render: (p) => <Badge status={p.status} /> },
    {
      key: 'actions', label: 'Actions', render: (p) => (
        <div className="flex gap-1">
          <button className="btn-secondary btn-sm" title="View" onClick={() => setViewing(p)}><Eye className="h-3.5 w-3.5" /></button>
          <button className="btn-secondary btn-sm" title="Edit / change price" onClick={() => { setEditing(p); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
          <button className="btn-secondary btn-sm" title="Adjust stock" onClick={() => setAdjusting(p)}><SlidersHorizontal className="h-3.5 w-3.5" /></button>
          <button className="btn-secondary btn-sm text-red-600" title="Delete" onClick={() => setDeleting(p)}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ),
    },
  ];

  const detail = (label, value) => (
    <div className="flex justify-between gap-4 py-2 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{value || '-'}</span></div>
  );

  return (
    <>
      <PageHeader title="Product Management" subtitle="Manage products, prices and stock." action={<button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add Product</button>} />
      <ErrorState message={products.error || wh.error} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, ID or category..." />
        <Select className="lg:w-48" value={category} onChange={setCategory} aria-label="Filter by category" options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]} />
        {isSuper && <Select className="lg:w-48" value={warehouse} onChange={setWarehouse} aria-label="Filter by warehouse" options={[{ value: 'all', label: 'All warehouses' }, ...wh.data.map((w) => ({ value: w.id, label: w.name }))]} />}
        <Select className="lg:w-44" value={stockFilter} onChange={setStockFilter} aria-label="Filter by stock status" options={[{ value: 'all', label: 'All stock levels' }, { value: 'In Stock', label: 'In Stock' }, { value: 'Low Stock', label: 'Low Stock' }, { value: 'Out of Stock', label: 'Out of Stock' }]} />
      </div>
      <DataTable columns={columns} rows={rows} loading={products.loading} emptyTitle="No products found" emptyText="Add a product or change the filters." initialSort={{ key: 'name', dir: 'asc' }} />

      <ProductForm open={formOpen} onClose={() => setFormOpen(false)} product={editing} warehouses={selectableWh} onSave={save} busy={busy} />
      <StockAdjustModal product={adjusting} onClose={() => setAdjusting(null)} onSave={saveStock} busy={busy} />
      <ConfirmDialog open={!!deleting} danger busy={busy} title="Delete product?" confirmLabel="Delete product"
        message={`"${deleting?.name}" will be permanently deleted. Pending sales requests for it can then only be cancelled.`}
        onConfirm={remove} onCancel={() => setDeleting(null)} />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || ''}>
        {viewing && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {detail('Product ID', viewing.code)}
            {detail('Category', viewing.category)}
            {detail('Warehouse', whMap[viewing.warehouseId])}
            {detail('Price', formatCurrency(viewing.price))}
            {detail('Stock quantity', formatNumber(viewing.stockQuantity))}
            {detail('Stock status', <Badge status={getStockStatus(viewing.stockQuantity, threshold)} />)}
            {detail('Status', <Badge status={viewing.status} />)}
            {detail('Created', formatDateTime(viewing.createdAt))}
            {detail('Last updated', formatDateTime(viewing.updatedAt))}
            {viewing.description && <p className="pt-3 text-sm text-slate-600 dark:text-slate-300">{viewing.description}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
