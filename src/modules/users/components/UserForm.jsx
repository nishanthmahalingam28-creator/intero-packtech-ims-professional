import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import Select from '../../../components/ui/Select';
import Spinner from '../../../components/ui/Spinner';
import { ROLE_LABELS } from '../../../utils/constants';
import { isEmail, required } from '../../../utils/validators';

const EMPTY = { name: '', email: '', password: '', role: 'sales', warehouseId: '', status: 'active' };

export default function UserForm({ open, onClose, user, roles, warehouses, lockedWarehouseId, isSelf, onSave, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const editing = !!user;

  useEffect(() => {
    if (open) {
      setForm(user ? { ...EMPTY, ...user, warehouseId: user.warehouseId || '' } : { ...EMPTY, role: roles[roles.length - 1], warehouseId: lockedWarehouseId || '' });
      setErrors({});
    }
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });
  const needsWarehouse = form.role !== 'super_admin';

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!required(form.name)) err.name = 'Name is required.';
    if (!editing) {
      if (!required(form.email)) err.email = 'Email is required.';
      else if (!isEmail(form.email)) err.email = 'Enter a valid email address.';
      if (form.password.length < 8) err.password = 'Password must be at least 8 characters.';
    } else if (form.password && form.password.length < 8) {
      err.password = 'Password must be at least 8 characters.';
    }
    if (needsWarehouse && !form.warehouseId) err.warehouseId = 'Select a warehouse for this role.';
    setErrors(err);
    if (Object.keys(err).length) return;
    onSave({ ...form, warehouseId: needsWarehouse ? form.warehouseId : '' });
  };

  const roleOptions = roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  const whOptions = [{ value: '', label: 'Select warehouse' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))];

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit user' : 'Add user'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" required error={errors.name}>
          <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" required error={errors.email} hint={editing ? 'Email cannot be changed after creation.' : undefined}>
          <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} disabled={editing} />
        </Field>
        {!editing && (
          <Field label="Temporary password" required error={errors.password} hint="At least 8 characters. Share it with the user securely.">
            <input type="text" autoComplete="off" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} />
          </Field>
        )}
        {editing && (
          <Field label="Reset password (optional)" error={errors.password} hint="Leave empty to keep the current password. At least 8 characters.">
            <input type="text" autoComplete="off" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" required hint={isSelf ? 'You cannot change your own role.' : undefined}>
            <Select value={form.role} onChange={set('role')} options={roleOptions} disabled={isSelf} />
          </Field>
          <Field label="Warehouse" required={needsWarehouse} error={errors.warehouseId}>
            <Select value={needsWarehouse ? form.warehouseId : ''} onChange={set('warehouseId')} options={whOptions} disabled={!needsWarehouse || !!lockedWarehouseId} />
          </Field>
        </div>
        {editing && (
          <Field label="Status" hint={isSelf ? 'You cannot deactivate your own account.' : undefined}>
            <Select value={form.status} onChange={set('status')} disabled={isSelf} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner size="sm" />} {editing ? 'Save changes' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  );
}
