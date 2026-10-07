import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import Select from '../../../components/ui/Select';
import Spinner from '../../../components/ui/Spinner';
import { PRODUCT_CATEGORIES } from '../../../utils/constants';
import { isNonNegativeInt, isNonNegativeNumber, required } from '../../../utils/validators';

const EMPTY = { name: '', category: '', description: '', price: '', stockQuantity: '0', warehouseId: '', status: 'active' };

export default function ProductForm({ open, onClose, product, warehouses, onSave, busy }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const editing = !!product;

  useEffect(() => {
    if (open) {
      setForm(product ? { ...EMPTY, ...product, price: String(product.price), stockQuantity: String(product.stockQuantity) } : { ...EMPTY, warehouseId: warehouses.length === 1 ? warehouses[0].id : '' });
      setErrors({});
    }
  }, [open, product]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!required(form.name)) err.name = 'Product name is required.';
    if (!required(form.category)) err.category = 'Category is required.';
    if (!isNonNegativeNumber(form.price)) err.price = 'Price must be 0 or more.';
    if (!editing && !isNonNegativeInt(form.stockQuantity)) err.stockQuantity = 'Stock must be a whole number, 0 or more.';
    if (!form.warehouseId) err.warehouseId = 'Select a warehouse.';
    setErrors(err);
    if (!Object.keys(err).length) onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit product' : 'Add product'}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Product name" required error={errors.name}>
          <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required error={errors.category}>
            <input list="product-categories" className={`input ${errors.category ? 'input-error' : ''}`} value={form.category} onChange={set('category')} />
            <datalist id="product-categories">{PRODUCT_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Price (INR)" required error={errors.price}>
            <input type="number" min="0" step="0.01" className={`input ${errors.price ? 'input-error' : ''}`} value={form.price} onChange={set('price')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Warehouse" required error={errors.warehouseId}>
            <Select value={form.warehouseId} onChange={set('warehouseId')} options={[{ value: '', label: 'Select warehouse' }, ...warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))]} />
          </Field>
          {!editing ? (
            <Field label="Opening stock" required error={errors.stockQuantity}>
              <input type="number" min="0" step="1" className={`input ${errors.stockQuantity ? 'input-error' : ''}`} value={form.stockQuantity} onChange={set('stockQuantity')} />
            </Field>
          ) : (
            <Field label="Current stock" hint="Use the Adjust stock action to change it.">
              <input className="input" value={form.stockQuantity} disabled />
            </Field>
          )}
        </div>
        <Field label="Description"><textarea rows={3} className="input" value={form.description} onChange={set('description')} /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner size="sm" />} {editing ? 'Save changes' : 'Create product'}</button>
        </div>
      </form>
    </Modal>
  );
}
