import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/format';

export default function RequestDetails({ request, onClose }) {
  if (!request) return null;
  const row = (label, value) => (
    <div className="flex justify-between gap-4 py-2 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{value || '-'}</span></div>
  );
  const done = request.status !== 'Pending';
  return (
    <Modal open={!!request} onClose={onClose} title={`Request ${request.requestNo}`}>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {row('Status', <Badge status={request.status} />)}
        {row('Sales user', request.salesUserName)}
        {row('Warehouse', request.warehouseName)}
        {row('Product', request.productName)}
        {row('Quantity', formatNumber(request.quantity))}
        {row('Unit price', formatCurrency(request.price))}
        {row('Total amount', formatCurrency(request.totalAmount))}
        {row('Request date', formatDateTime(request.createdAt))}
        {done && row(request.status === 'Approved' ? 'Approved by' : 'Cancelled by', request.processedByName)}
        {done && row(request.status === 'Approved' ? 'Approval date' : 'Cancellation date', formatDateTime(request.processedAt))}
      </div>
      {request.notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">{request.notes}</p>}
    </Modal>
  );
}
