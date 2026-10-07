import { Mail, MapPin, Phone } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import { formatDate, formatNumber } from '../../../utils/format';

// productCount and totalStock are calculated by the API for every warehouse.
export default function WarehouseDetails({ warehouse, onClose }) {
  if (!warehouse) return null;
  const row = (label, value) => (
    <div className="flex justify-between gap-4 py-2 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{value || '-'}</span></div>
  );
  return (
    <Modal open={!!warehouse} onClose={onClose} title={warehouse.name}>
      <div className="mb-4 flex items-center gap-2"><Badge status={warehouse.status} /><span className="text-sm text-slate-500">{warehouse.code}</span></div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {row('Location', <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{warehouse.location}</span>)}
        {row('Phone', warehouse.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{warehouse.phone}</span>)}
        {row('Email', warehouse.email && <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{warehouse.email}</span>)}
        {row('Products', formatNumber(warehouse.productCount ?? 0))}
        {row('Total stock', formatNumber(warehouse.totalStock ?? 0))}
        {row('Created', formatDate(warehouse.createdAt))}
        {row('Last updated', formatDate(warehouse.updatedAt))}
      </div>
      {warehouse.description && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">{warehouse.description}</p>}
    </Modal>
  );
}
