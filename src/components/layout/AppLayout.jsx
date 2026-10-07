import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false); // desktop: icons only
  const [mobileOpen, setMobileOpen] = useState(false); // mobile/tablet: drawer

  // The menu button collapses the sidebar on desktop and opens the drawer on small screens.
  const onMenu = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((c) => !c);
    else setMobileOpen((o) => !o);
  };

  return (
    <div className="min-h-screen">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className={`transition-all duration-200 print:pl-0 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Header onMenu={onMenu} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
