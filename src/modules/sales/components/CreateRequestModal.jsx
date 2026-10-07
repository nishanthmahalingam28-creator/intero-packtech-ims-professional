import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import Select from '../../../components/ui/Select';
import Spinner from '../../../components/ui/Spinner';
import { isPositiveInt } from '../../../utils/validators';
import { formatCurrency, formatNumber } from '../../../utils/format';

export default function CreateRequestModal({ open, onClose, products, onSave, busy }) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) { setProductId(''); setQuantity(''); setNotes(''); setErrors({}); }
  }, [open]);

  const product = products.find((p) => p.id === productId);
  const total = product && isPositiveInt(quantity) ? product.price * Number(quantity) : 0;

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!product) err.productId = 'Select a product.';
    if (!isPositiveInt(quantity)) err.quantity = 'Quantity must be a whole number greater than 0.';
    else if (product && Number(quantity) > product.stockQuantity) err.quantity = 'Insufficient stock available.';
    setErrors(err);
    if (!Object.keys(err).length) onSave(product, quantity, notes);
  };

  return (
    <Modal open={open} onClose={onClose} title="Create sales request">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Product" required error={errors.productId}>
          <Select value={productId} onChange={setProductId}
            options={[{ value: '', label: products.length ? 'Select product' : 'No products with stock' }, ...products.map((p) => ({ value: p.id, label: `${p.name} - ${formatNumber(p.stockQuantity)} available` }))]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity" required error={errors.quantity} hint={product ? `Up to ${formatNumber(product.stockQuantity)} available` : undefined}>
            <input type="number" min="1" step="1" className={`input ${errors.quantity ? 'input-error' : ''}`} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Unit price"><input className="input" disabled value={product ? formatCurrency(product.price) : '-'} /></Field>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
          <span className="text-slate-500">Total amount</span>
          <span className="text-lg font-bold">{formatCurrency(total)}</span>
        </div>
        <Field label="Notes"><textarea rows={3} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Customer name, delivery details..." /></Field>
        <p className="text-xs text-slate-500">Your request is sent as <b>Pending</b>. Stock is only reduced after an Admin or Manager approves it.</p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner size="sm" />} Create request</button>
        </div>
      </form>
    </Modal>
  );
}
