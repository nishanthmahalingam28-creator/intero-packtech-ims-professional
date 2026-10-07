import { useMemo, useState } from 'react';
import { Mail, MapPin, Phone, Plus, Warehouse as WarehouseIcon } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Spinner from '../../../components/ui/Spinner';
import WarehouseForm from '../components/WarehouseForm';
import WarehouseDetails from '../components/WarehouseDetails';
import { useWarehouses } from '../../../hooks/useData';
import useAction from '../../../hooks/useAction';
import { createWarehouse, deleteWarehouse, setWarehouseStatus, updateWarehouse } from '../services/warehouseService';

export default function Warehouses() {
  const { data, loading, error } = useWarehouses();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data
      .filter((w) => status === 'all' || w.status === status)
      .filter((w) => !q || [w.name, w.code, w.location].some((v) => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search, status]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (w) => { setEditing(w); setFormOpen(true); };

  const save = async (values) => {
    const ok = await run(
      () => (editing ? updateWarehouse(editing.id, values) : createWarehouse(values)),
      editing ? 'Warehouse updated.' : 'Warehouse created.'
    );
    if (ok) setFormOpen(false);
  };

  const toggle = (w) =>
    run(() => setWarehouseStatus(w.id, w.status === 'active' ? 'inactive' : 'active'),
      w.status === 'active' ? 'Warehouse deactivated.' : 'Warehouse activated.');

  const remove = async () => {
    const ok = await run(() => deleteWarehouse(deleting.id), 'Warehouse deleted.');
    if (ok) setDeleting(null);
  };

  return (
    <>
      <PageHeader
        title="Warehouse Management"
        subtitle="Create and manage warehouses."
        action={<button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add Warehouse</button>}
      />
      <ErrorState message={error} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, ID or location..." />
        <Select className="sm:w-44" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} aria-label="Filter by status" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={WarehouseIcon} title={data.length ? 'No warehouses match your filters' : 'No warehouses yet'} text={data.length ? 'Try a different search or status.' : 'Add your first warehouse to start managing stock.'}
            action={!data.length && <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add Warehouse</button>} />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((w) => (
            <div key={w.id} className="card flex flex-col p-5 transition hover:shadow-md">
              <button className="flex items-start gap-3 text-left" onClick={() => setViewing(w)}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300">
                  <WarehouseIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold">{w.name}</p>
                    <Badge status={w.status} />
                  </div>
                  <p className="text-sm text-slate-500">{w.code}</p>
                </div>
              </button>
              <div className="mt-4 flex-1 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" /> {w.location}</p>
                {w.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" /> {w.phone}</p>}
                {w.email && <p className="flex items-center gap-2 break-all"><Mail className="h-4 w-4 shrink-0 text-slate-400" /> {w.email}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-medium dark:border-slate-800">
                <button className="text-slate-600 hover:text-teal-600 dark:text-slate-300" onClick={() => openEdit(w)}>Edit</button>
                <button className="text-slate-600 hover:text-amber-600 dark:text-slate-300" onClick={() => toggle(w)} disabled={busy}>
                  {w.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button className="text-red-600 hover:text-red-700" onClick={() => setDeleting(w)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WarehouseForm open={formOpen} onClose={() => setFormOpen(false)} warehouse={editing} onSave={save} busy={busy} />
      <WarehouseDetails warehouse={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog open={!!deleting} danger busy={busy} title="Delete warehouse?" confirmLabel="Delete warehouse"
        message={`"${deleting?.name}" will be permanently deleted. This cannot be undone. A warehouse that still has products cannot be deleted.`}
        onConfirm={remove} onCancel={() => setDeleting(null)} />
    </>
  );
}
