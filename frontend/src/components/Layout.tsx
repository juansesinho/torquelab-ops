import { Car, ClipboardList, LayoutDashboard, LogOut, Package, Users } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { BrandLogo } from './ui/BrandLogo';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    ...(user?.role !== 'client'
      ? [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
      : []),
    { to: '/orders', label: user?.role === 'client' ? 'Mis Reparaciones' : 'Órdenes', icon: ClipboardList },
    { to: '/vehicles', label: user?.role === 'client' ? 'Mis Vehículos' : 'Vehículos', icon: Car },
    ...(user?.role !== 'client'
      ? [{ to: '/parts', label: 'Repuestos', icon: Package }]
      : []),
    ...(user?.role === 'admin'
      ? [{ to: '/mechanics', label: 'Equipo', icon: Users }]
      : []),
  ];

  const roleLabels = {
    admin: 'Jefe de Taller',
    mechanic: 'Mecánico',
    client: 'Cliente',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between print:hidden">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/15 border border-orange-500/40 flex items-center justify-center">
                <BrandLogo size={24} />
              </div>
              <div>
                <h1 className="font-bold tracking-tight text-white">TorqueLab Ops</h1>
                <p className="text-xs text-slate-400">Garage S.R.L.</p>
              </div>
            </Link>
            <NotificationBell />
          </div>

          <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition whitespace-nowrap ${
                    active
                      ? 'bg-orange-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-orange-400">
              {user ? roleLabels[user.role] : ''}
            </p>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
