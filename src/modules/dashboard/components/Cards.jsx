import { Link } from 'react-router-dom';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { formatCurrency, formatDateTime, formatNumber } from '../../../utils/format';

export function Section({ title, link, linkLabel = 'View all', children }) {
  const content = (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-base font-semibold">{title}</h2>
        {link && <span className="text-sm font-medium text-teal-600">{linkLabel}</span>}
      </div>
      {children}
    </>
  );

  return link ? (
    <Link to={link} className="card block transition hover:shadow-md hover:cursor-pointer" aria-label={`Open ${title}`} title={`Open ${title}`}>
      {content}
    </Link>
  ) : (
    <div className="card">{content}</div>
  );
}

const byNewest = (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);

export function RecentRequests({ requests, title = 'Recent sales requests', link = '/sales-requests', showUser = true, limit = 5 }) {
  const rows = [...requests].sort(byNewest).slice(0, limit);
  return (
    <Section title={title} link={link}>
      {rows.length === 0 ? (
        <EmptyState title="No sales requests yet" text="New requests will appear here." />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.productName} <span className="text-slate-400">x {formatNumber(r.quantity)}</span></p>
                <p className="truncate text-xs text-slate-500">{r.requestNo}{showUser ? ` - ${r.salesUserName}` : ''} - {formatDateTime(r.createdAt)}</p>
              </div>
              <div className="shrink-0 text-right">
                <Badge status={r.status} />
                <p className="mt-1 text-xs text-slate-500">{formatCurrency(r.totalAmount)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function LowStockList({ products, threshold, warehouses = {}, limit = 6 }) {
  const rows = products.filter((p) => p.stockQuantity <= threshold).sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, limit);
  return (
    <Section title="Low stock alerts" link="/inventory" linkLabel="Open inventory">
      {rows.length === 0 ? (
        <EmptyState title="All stock levels look healthy" text={`No product is at or below ${threshold} units.`} />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-slate-500">{warehouses[p.warehouseId] || '-'}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">{formatNumber(p.stockQuantity)}</p>
                <Badge status={p.stockQuantity <= 0 ? 'Out of Stock' : 'Low Stock'} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function RecentTransactions({ transactions, limit = 6 }) {
  const rows = [...transactions].sort(byNewest).slice(0, limit);
  return (
    <Section title="Recent stock activity" link="/inventory" linkLabel="Open inventory">
      {rows.length === 0 ? (
        <EmptyState title="No stock activity yet" />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.productName}</p>
                <p className="truncate text-xs text-slate-500">{t.reason} - {formatDateTime(t.createdAt)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold ${t.quantityChange < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {t.quantityChange > 0 ? '+' : ''}{formatNumber(t.quantityChange)}
                </p>
                <p className="text-xs text-slate-500">Balance {formatNumber(t.balanceAfter)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// Simple horizontal bars (no chart library needed)
export function BarList({ title, items, format = formatNumber, link }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <Section title={title} link={link}>
      {items.length === 0 ? (
        <EmptyState title="No data yet" />
      ) : (
        <div className="space-y-4 p-5">
          {items.map((i) => (
            <div key={i.label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="truncate">{i.label}</span>
                <span className="font-medium">{format(i.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-2 rounded-full ${i.color || 'bg-teal-500'}`} style={{ width: `${(i.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
