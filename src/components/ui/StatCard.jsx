import { Link } from 'react-router-dom';

const TONES = {
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-300',
  blue: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
  purple: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'teal', to }) {
  const content = (
    <>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </>
  );

  if (!to) {
    return <div className="card p-5 transition hover:shadow-md">{content}</div>;
  }

  return (
    <Link to={to} className="card block p-5 transition hover:cursor-pointer hover:shadow-md" aria-label={`Open ${label}`} title={`Open ${label}`}>
      {content}
    </Link>
  );
}
