import { useMemo, useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

// columns: [{ key, label, render?(row), sortable?, sortValue?(row), className? }]
// Sorting + pagination happen in the browser (fine for the data sizes of this project).
export default function DataTable({ columns, rows, loading, rowKey = 'id', pageSize = 10, emptyTitle = 'Nothing here yet', emptyText, emptyAction, initialSort }) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = (r) => {
      let v = col?.sortValue ? col.sortValue(r) : r[sort.key];
      if (col?.key && /At$/.test(col.key) && typeof v === 'string') v = Date.parse(v) || 0;
      if (typeof v === 'string') v = v.toLowerCase();
      return v ?? '';
    };
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x < y) return sort.dir === 'asc' ? -1 : 1;
      if (x > y) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const toggleSort = (key) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`th ${c.className || ''}`}>
                  {c.sortable ? (
                    <button className="inline-flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100" onClick={() => toggleSort(c.key)}>
                      {c.label} <ArrowUpDown className={`h-3 w-3 ${sort?.key === c.key ? 'text-teal-600' : 'opacity-40'}`} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((row) => (
              <tr key={row[rowKey]} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                {columns.map((c) => (
                  <td key={c.key} className={`td ${c.className || ''}`}>{c.render ? c.render(row) : row[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}
      {!loading && rows.length === 0 && <EmptyState title={emptyTitle} text={emptyText} action={emptyAction} />}

      {!loading && rows.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 sm:flex-row print:hidden">
          <span>
            Showing {start + 1}-{Math.min(start + pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary btn-sm" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>Page {current} of {pages}</span>
            <button className="btn-secondary btn-sm" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
