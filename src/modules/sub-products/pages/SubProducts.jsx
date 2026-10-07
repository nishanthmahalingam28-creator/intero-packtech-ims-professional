import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import Spinner from '../../../components/ui/Spinner';
import DataTable from '../../../components/ui/DataTable';
import ErrorState from '../../../components/ui/ErrorState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { useProducts, useSubProducts, useWarehouses } from '../../../hooks/useData';
import useAction from '../../../hooks/useAction';
import { createSubProduct, deleteSubProduct, updateSubProduct } from '../services/subProductService';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { isNonNegativeInt, isNonNegativeNumber, required } from '../../../utils/validators';

const EMPTY = { name: '', parentProductId: '', quantity: '0', price: '0', description: '', status: 'active' };

function SubProductForm({ open, onClose, item, products, onSave, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (open) { setForm(item ? { ...EMPTY, ...item, quantity: String(item.quantity), price: String(item.price) } : EMPTY); setErrors({}); }
  }, [open, item]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!required(form.name)) err.name = 'Name is required.';
    if (!form.parentProductId) err.parentProductId = 'Select the parent product.';
    if (!isNonNegativeInt(form.quantity)) err.quantity = 'Quantity must be a whole number, 0 or more.';
    if (!isNonNegativeNumber(form.price)) err.price = 'Price must be 0 or more.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const parent = products.find((p) => p.id === form.parentProductId);
    onSave({ ...form, parentProductName: parent.name, warehouseId: parent.warehouseId });
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit sub-product' : 'Add sub-product'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Sub-product name" required error={errors.name}><input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} /></Field>
        <Field label="Parent product" required error={errors.parentProductId} hint="The sub-product belongs to the same warehouse as its parent.">
          <Select value={form.parentProductId} onChange={set('parentProductId')} options={[{ value: '', label: 'Select parent product' }, ...products.map((p) => ({ value: p.id, label: p.name }))]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" required error={errors.quantity}><input type="number" min="0" step="1" className={`input ${errors.quantity ? 'input-error' : ''}`} value={form.quantity} onChange={set('quantity')} /></Field>
          <Field label="Price (INR)" required error={errors.price}><input type="number" min="0" step="0.01" className={`input ${errors.price ? 'input-error' : ''}`} value={form.price} onChange={set('price')} /></Field>
        </div>
        <Field label="Description"><textarea rows={3} className="input" value={form.description} onChange={set('description')} /></Field>
        <Field label="Status"><Select value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner size="sm" />} {item ? 'Save changes' : 'Create sub-product'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function SubProducts() {
  const subs = useSubProducts();
  const products = useProducts();
  const wh = useWarehouses();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [parent, setParent] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subs.data
      .filter((s) => parent === 'all' || s.parentProductId === parent)
      .filter((s) => !q || [s.name, s.parentProductName].some((v) => (v || '').toLowerCase().includes(q)));
  }, [subs.data, search, parent]);

  const save = async (v) => {
    const ok = await run(() => (editing ? updateSubProduct(editing.id, v) : createSubProduct(v)), editing ? 'Sub-product updated.' : 'Sub-product created.');
    if (ok) setFormOpen(false);
  };
  const remove = async () => {
    const ok = await run(() => deleteSubProduct(deleting.id), 'Sub-product deleted.');
    if (ok) setDeleting(null);
  };

  const columns = [
    { key: 'name', label: 'Sub-product', sortable: true, render: (s) => <span className="font-medium">{s.name}</span> },
    { key: 'parentProductName', label: 'Parent product', sortable: true },
    { key: 'warehouseId', label: 'Warehouse', render: (s) => whMap[s.warehouseId] || '-' },
    { key: 'quantity', label: 'Quantity', sortable: true, render: (s) => formatNumber(s.quantity) },
    { key: 'price', label: 'Price', sortable: true, render: (s) => formatCurrency(s.price) },
    { key: 'status', label: 'Status', render: (s) => <Badge status={s.status} /> },
    { key: 'actions', label: 'Actions', render: (s) => (
      <div className="flex gap-1">
        <button className="btn-secondary btn-sm" title="Edit" onClick={() => { setEditing(s); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
        <button className="btn-secondary btn-sm text-red-600" title="Delete" onClick={() => setDeleting(s)}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Sub-product Management" subtitle="Parts and variants that belong to a product." action={<button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add Sub-product</button>} />
      <ErrorState message={subs.error || products.error} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search sub-products..." />
        <Select className="sm:w-60" value={parent} onChange={setParent} aria-label="Filter by parent product" options={[{ value: 'all', label: 'All parent products' }, ...products.data.map((p) => ({ value: p.id, label: p.name }))]} />
      </div>
      <DataTable columns={columns} rows={rows} loading={subs.loading} emptyTitle="No sub-products found" emptyText="Add a sub-product and link it to a parent product." initialSort={{ key: 'name', dir: 'asc' }} />
      <SubProductForm open={formOpen} onClose={() => setFormOpen(false)} item={editing} products={products.data} onSave={save} busy={busy} />
      <ConfirmDialog open={!!deleting} danger busy={busy} title="Delete sub-product?" confirmLabel="Delete sub-product" message={`"${deleting?.name}" will be permanently deleted.`} onConfirm={remove} onCancel={() => setDeleting(null)} />
    </>
  );
}
