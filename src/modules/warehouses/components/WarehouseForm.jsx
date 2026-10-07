import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import Select from '../../../components/ui/Select';
import Spinner from '../../../components/ui/Spinner';
import { isEmail, required } from '../../../utils/validators';

const EMPTY = { code: '', name: '', location: '', phone: '', email: '', description: '', status: 'active' };

export default function WarehouseForm({ open, onClose, warehouse, onSave, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(warehouse ? { ...EMPTY, ...warehouse } : EMPTY);
      setErrors({});
    }
  }, [open, warehouse]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!required(form.name)) err.name = 'Warehouse name is required.';
    if (!required(form.code)) err.code = 'Warehouse ID is required.';
    if (!required(form.location)) err.location = 'Location is required.';
    if (required(form.email) && !isEmail(form.email)) err.email = 'Enter a valid email address.';
    setErrors(err);
    if (Object.keys(err).length) return;
    onSave({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      location: form.location.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      description: form.description.trim(),
      status: form.status,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={warehouse ? 'Edit warehouse' : 'Add warehouse'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Warehouse name" required error={errors.name}>
            <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Coimbatore Main" />
          </Field>
          <Field label="Warehouse ID" required error={errors.code}>
            <input className={`input ${errors.code ? 'input-error' : ''}`} value={form.code} onChange={set('code')} placeholder="WH-01" />
          </Field>
        </div>
        <Field label="Location" required error={errors.location}>
          <input className={`input ${errors.location ? 'input-error' : ''}`} value={form.location} onChange={set('location')} placeholder="Area, City" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" /></Field>
          <Field label="Email" error={errors.email}>
            <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} placeholder="warehouse@example.com" />
          </Field>
        </div>
        <Field label="Description">
          <textarea className="input" rows={3} value={form.description} onChange={set('description')} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy && <Spinner size="sm" />} {warehouse ? 'Save changes' : 'Create warehouse'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
