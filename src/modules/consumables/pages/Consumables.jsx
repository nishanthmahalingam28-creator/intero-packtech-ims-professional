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
import { useAuth } from '../../../context/AuthContext';
import { useConsumables, useWarehouses } from '../../../hooks/useData';
import useAction from '../../../hooks/useAction';
import { createConsumable, deleteConsumable, updateConsumable } from '../services/consumableService';
import { ROLES } from '../../../utils/constants';
import { formatCurrency, formatNumber } from '../../../utils/format';
import { isNonNegativeInt, isNonNegativeNumber, required } from '../../../utils/validators';

const EMPTY = { name: '', quantity: '0', price: '0', warehouseId: '', description: '', status: 'active' };

function ConsumableForm({ open, onClose, item, warehouses, onSave, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (open) {
      setForm(item ? { ...EMPTY, ...item, quantity: String(item.quantity), price: String(item.price) } : { ...EMPTY, warehouseId: warehouses.length === 1 ? warehouses[0].id : '' });
      setErrors({});
    }
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!required(form.name)) err.name = 'Name is required.';
    if (!isNonNegativeInt(form.quantity)) err.quantity = 'Quantity must be a whole number, 0 or more.';
    if (!isNonNegativeNumber(form.price)) err.price = 'Price must be 0 or more.';
    if (!form.warehouseId) err.warehouseId = 'Select a warehouse.';
    setErrors(err);
    if (!Object.keys(err).length) onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Edit consumable' : 'Add consumable'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" required error={errors.name}><input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" required error={errors.quantity}><input type="number" min="0" step="1" className={`input ${errors.quantity ? 'input-error' : ''}`} value={form.quantity} onChange={set('quantity')} /></Field>
          <Field label="Price (INR)" error={errors.price} hint="Optional, per unit"><input type="number" min="0" step="0.01" className={`input ${errors.price ? 'input-error' : ''}`} value={form.price} onChange={set('price')} /></Field>
        </div>
        <Field label="Warehouse" required error={errors.warehouseId}>
          <Select value={form.warehouseId} onChange={set('warehouseId')} options={[{ value: '', label: 'Select warehouse' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))]} />
        </Field>
        <Field label="Description"><textarea rows={3} className="input" value={form.description} onChange={set('description')} /></Field>
        <Field label="Status"><Select value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner size="sm" />} {item ? 'Save changes' : 'Create consumable'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Consumables() {
  const { profile } = useAuth();
  const items = useConsumables();
  const wh = useWarehouses();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const isSuper = profile.role === ROLES.SUPER_ADMIN;
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));
  const selectableWh = isSuper ? wh.data : wh.data.filter((w) => w.id === profile.warehouseId);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.data
      .filter((c) => status === 'all' || c.status === status)
      .filter((c) => !q || [c.name, c.description].some((v) => (v || '').toLowerCase().includes(q)));
  }, [items.data, search, status]);

  const save = async (v) => {
    const ok = await run(() => (editing ? updateConsumable(editing.id, v) : createConsumable(v)), editing ? 'Consumable updated.' : 'Consumable created.');
    if (ok) setFormOpen(false);
  };
  const remove = async () => {
    const ok = await run(() => deleteConsumable(deleting.id), 'Consumable deleted.');
    if (ok) setDeleting(null);
  };

  const columns = [
    { key: 'name', label: 'Consumable', sortable: true, render: (c) => <div><p className="font-medium">{c.name}</p>{c.description && <p className="max-w-xs truncate text-xs text-slate-500">{c.description}</p>}</div> },
    { key: 'quantity', label: 'Quantity', sortable: true, render: (c) => formatNumber(c.quantity) },
    { key: 'price', label: 'Price', sortable: true, render: (c) => (c.price ? formatCurrency(c.price) : '-') },
    { key: 'warehouseId', label: 'Warehouse', render: (c) => whMap[c.warehouseId] || '-' },
    { key: 'status', label: 'Status', render: (c) => <Badge status={c.status} /> },
    { key: 'actions', label: 'Actions', render: (c) => (
      <div className="flex gap-1">
        <button className="btn-secondary btn-sm" title="Edit" onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></button>
        <button className="btn-secondary btn-sm text-red-600" title="Delete" onClick={() => setDeleting(c)}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Consumables" subtitle="Glue, strapping, tools and other items used in operations." action={<button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add Consumable</button>} />
      <ErrorState message={items.error} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search consumables..." />
        <Select className="sm:w-44" value={status} onChange={setStatus} aria-label="Filter by status" options={[{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
      </div>
      <DataTable columns={columns} rows={rows} loading={items.loading} emptyTitle="No consumables found" emptyText="Add a consumable to start tracking it." initialSort={{ key: 'name', dir: 'asc' }} />
      <ConsumableForm open={formOpen} onClose={() => setFormOpen(false)} item={editing} warehouses={selectableWh} onSave={save} busy={busy} />
      <ConfirmDialog open={!!deleting} danger busy={busy} title="Delete consumable?" confirmLabel="Delete consumable" message={`"${deleting?.name}" will be permanently deleted.`} onConfirm={remove} onCancel={() => setDeleting(null)} />
    </>
  );
}
