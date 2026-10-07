import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Field from '../../../components/ui/Field';
import Select from '../../../components/ui/Select';
import Spinner from '../../../components/ui/Spinner';
import { isNonNegativeInt, isPositiveInt } from '../../../utils/validators';
import { formatNumber } from '../../../utils/format';

// Manual stock changes (Super Admin / Admin only). Every change is logged in stockTransactions.
export default function StockAdjustModal({ product, onClose, onSave, busy }) {
  const [mode, setMode] = useState('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) { setMode('add'); setAmount(''); setReason(''); setError(''); }
  }, [product]);

  if (!product) return null;
  const qty = Number(amount);
  const preview = mode === 'add' ? product.stockQuantity + qty : mode === 'remove' ? product.stockQuantity - qty : qty;
  const valid = amount !== '' && !Number.isNaN(preview);

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'set' ? !isNonNegativeInt(amount) : !isPositiveInt(amount)) {
      setError(mode === 'set' ? 'Enter a whole number, 0 or more.' : 'Enter a whole number greater than 0.');
      return;
    }
    if (preview < 0) { setError('Stock cannot become negative.'); return; }
    setError('');
    onSave(mode, amount, reason);
  };

  return (
    <Modal open={!!product} onClose={onClose} title="Adjust stock" size="sm">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <p className="font-medium">{product.name}</p>
          <p className="text-slate-500">Current stock: {formatNumber(product.stockQuantity)}</p>
        </div>
        <Field label="Action">
          <Select value={mode} onChange={setMode} options={[{ value: 'add', label: 'Add stock' }, { value: 'remove', label: 'Remove stock' }, { value: 'set', label: 'Set exact quantity' }]} />
        </Field>
        <Field label={mode === 'set' ? 'New quantity' : 'Quantity'} required error={error}>
          <input type="number" min="0" step="1" className={`input ${error ? 'input-error' : ''}`} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Reason"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New delivery, damaged goods, stock count" /></Field>
        {valid && <p className="text-sm text-slate-500">New stock will be <span className="font-semibold text-slate-800 dark:text-slate-100">{formatNumber(preview)}</span></p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy && <Spinner size="sm" />} Update stock</button>
        </div>
      </form>
    </Modal>
  );
}
