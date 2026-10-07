import { useMemo, useState } from 'react';
import { Pencil, Plus, Power, Trash2, Users as UsersIcon } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import SearchInput from '../../../components/ui/SearchInput';
import Select from '../../../components/ui/Select';
import Badge from '../../../components/ui/Badge';
import DataTable from '../../../components/ui/DataTable';
import ErrorState from '../../../components/ui/ErrorState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import UserForm from '../components/UserForm';
import { useAuth } from '../../../context/AuthContext';
import { useUsers, useWarehouses } from '../../../hooks/useData';
import useAction from '../../../hooks/useAction';
import { createUser, deleteUserProfile, setUserStatus, updateUser } from '../services/userService';
import { manageableRoles } from '../../../utils/permissions';
import { ROLE_LABELS, ROLES } from '../../../utils/constants';
import { formatDate } from '../../../utils/format';

export default function Users() {
  const { profile } = useAuth();
  const users = useUsers();
  const wh = useWarehouses();
  const { busy, run } = useAction();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [warehouse, setWarehouse] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const roles = manageableRoles(profile.role);
  const isSuper = profile.role === ROLES.SUPER_ADMIN;
  const whMap = Object.fromEntries(wh.data.map((w) => [w.id, w.name]));
  // Admin can only place users in their own warehouse.
  const selectableWarehouses = isSuper ? wh.data : wh.data.filter((w) => w.id === profile.warehouseId);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.data
      .filter((u) => role === 'all' || u.role === role)
      .filter((u) => warehouse === 'all' || u.warehouseId === warehouse)
      .filter((u) => !q || [u.name, u.email].some((v) => (v || '').toLowerCase().includes(q)));
  }, [users.data, search, role, warehouse]);

  // Admin cannot touch Admin / Super Admin accounts or themselves.
  const canEdit = (u) => roles.includes(u.role) && (isSuper || u.id !== profile.id);
  const isSelf = (u) => u.id === profile.id;

  const save = async (v) => {
    const ok = await run(
      () => (editing ? updateUser(editing.id, v) : createUser(v)),
      editing ? 'User updated.' : 'User created.'
    );
    if (ok) setFormOpen(false);
  };

  const toggle = (u) => run(() => setUserStatus(u.id, u.status === 'active' ? 'inactive' : 'active'), u.status === 'active' ? 'User deactivated.' : 'User activated.');
  const remove = async () => {
    const ok = await run(() => deleteUserProfile(deleting.id), 'User removed.');
    if (ok) setDeleting(null);
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (u) => <div><p className="font-medium">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div> },
    { key: 'id', label: 'User ID', render: (u) => <span className="font-mono text-xs text-slate-500">{u.id.slice(0, 8)}</span> },
    { key: 'role', label: 'Role', sortable: true, render: (u) => <Badge status={u.role} /> },
    { key: 'warehouseId', label: 'Warehouse', sortable: true, sortValue: (u) => whMap[u.warehouseId] || '', render: (u) => whMap[u.warehouseId] || '-' },
    { key: 'status', label: 'Status', sortable: true, render: (u) => <Badge status={u.status} /> },
    { key: 'createdAt', label: 'Created', sortable: true, render: (u) => formatDate(u.createdAt) },
    {
      key: 'actions', label: 'Actions', render: (u) =>
        canEdit(u) ? (
          <div className="flex gap-1">
            <button className="btn-secondary btn-sm" onClick={() => { setEditing(u); setFormOpen(true); }} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
            {!isSelf(u) && <button className="btn-secondary btn-sm" onClick={() => toggle(u)} disabled={busy} title={u.status === 'active' ? 'Deactivate' : 'Activate'}><Power className="h-3.5 w-3.5" /></button>}
            {!isSelf(u) && <button className="btn-secondary btn-sm text-red-600" onClick={() => setDeleting(u)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
          </div>
        ) : <span className="text-xs text-slate-400">No access</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle={isSuper ? 'Manage Admin, Manager and Sales users.' : 'Manage Manager and Sales users of your warehouse.'}
        action={<button className="btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add User</button>}
      />
      <ErrorState message={users.error} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email..." />
        <Select className="sm:w-44" value={role} onChange={setRole} aria-label="Filter by role"
          options={[{ value: 'all', label: 'All roles' }, ...Object.keys(ROLE_LABELS).map((r) => ({ value: r, label: ROLE_LABELS[r] }))]} />
        {isSuper && (
          <Select className="sm:w-52" value={warehouse} onChange={setWarehouse} aria-label="Filter by warehouse"
            options={[{ value: 'all', label: 'All warehouses' }, ...wh.data.map((w) => ({ value: w.id, label: w.name }))]} />
        )}
      </div>
      <DataTable columns={columns} rows={rows} loading={users.loading} emptyTitle="No users found" emptyText="Add a user or change the filters." initialSort={{ key: 'name', dir: 'asc' }} />

      <UserForm open={formOpen} onClose={() => setFormOpen(false)} user={editing} roles={roles}
        warehouses={selectableWarehouses} lockedWarehouseId={isSuper ? '' : profile.warehouseId}
        isSelf={editing ? isSelf(editing) : false} onSave={save} busy={busy} />
      <ConfirmDialog open={!!deleting} danger busy={busy} title="Remove user?" confirmLabel="Remove user"
        message={`"${deleting?.name}" will lose all access immediately. Their past sales requests stay in the reports. Tip: deactivate instead if you may need them again.`}
        onConfirm={remove} onCancel={() => setDeleting(null)} />
    </>
  );
}
