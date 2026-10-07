import { NavLink } from 'react-router-dom';
import { LogOut, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../utils/permissions';
import { NAV_ITEMS } from '../../utils/navigation';
import { ROLE_LABELS } from '../../utils/constants';
import { initials } from '../../utils/format';

export default function Sidebar({ collapsed, mobileOpen, onClose }) {
  const { profile, logout } = useAuth();
  // Only the pages this role may open are shown.
  const items = NAV_ITEMS.filter((i) => can(profile.role, i.perm));

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 animate-fade-in bg-slate-900/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 print:hidden
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-sm font-bold leading-tight">Intero Packtech Pvt. Ltd.</p>
            <p className="text-xs text-slate-500">Inventory Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${collapsed ? 'lg:justify-center' : ''}
                ${isActive
                  ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className={`flex items-center gap-3 rounded-xl p-2 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
              {initials(profile.name)}
            </div>
            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-sm font-semibold">{profile.name}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[profile.role]}</p>
            </div>
            <button onClick={logout} title="Log out" aria-label="Log out" className={`rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 ${collapsed ? 'lg:hidden' : ''}`}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          {collapsed && (
            <button onClick={logout} title="Log out" aria-label="Log out" className="mt-1 hidden w-full justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 lg:flex dark:hover:bg-slate-800">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
