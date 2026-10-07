import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../utils/constants';
import { initials } from '../../utils/format';
import Badge from '../ui/Badge';

export default function Header({ onMenu }) {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6 print:hidden">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle menu">
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{ROLE_LABELS[profile.role]} workspace</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden sm:block"><Badge status={profile.role} /></span>
        <button onClick={toggleTheme} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle dark mode">
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-haspopup="menu" aria-expanded={open}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">{initials(profile.name)}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {open && (
            <div className="card absolute right-0 mt-2 w-64 animate-pop p-2 shadow-lg" role="menu">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold">{profile.name}</p>
                <p className="truncate text-xs text-slate-500">{profile.email}</p>
              </div>
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
