const TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
};

const MAP = {
  active: ['green', 'Active'],
  inactive: ['gray', 'Inactive'],
  Pending: ['amber', 'Pending'],
  Approved: ['green', 'Approved'],
  Cancelled: ['red', 'Cancelled'],
  'In Stock': ['green', 'In Stock'],
  'Low Stock': ['orange', 'Low Stock'],
  'Out of Stock': ['red', 'Out of Stock'],
  super_admin: ['purple', 'Super Admin'],
  admin: ['blue', 'Admin'],
  manager: ['teal', 'Manager'],
  sales: ['amber', 'Sales'],
  SALE: ['red', 'Sale'],
  INITIAL: ['blue', 'Opening'],
  ADJUSTMENT: ['purple', 'Adjustment'],
};

// <Badge status="Pending" />  -> picks colour + label from the table above
export default function Badge({ status }) {
  const [tone, label] = MAP[status] || ['gray', String(status)];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {label}
    </span>
  );
}
