import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RoleBadge } from '../ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  ScrollText,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Activity,
  Bell,
  ChevronRight,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  // Poll pending count for the badge
  const { data: pendingData } = useQuery({
    queryKey: ['admin', 'pending-count'],
    queryFn: async () => {
      const res = await api.get('/admin/pending-verifications');
      return res.data?.data;
    },
    refetchInterval: 30000,
  });

  const totalPending = pendingData?.totalPending || 0;

  const handleLogout = async () => {
    await logout();
    toast.info('You have been logged out of the admin console.');
    navigate('/admin/login');
  };

  const navItems = [
    {
      to: '/admin',
      label: 'Dashboard',
      icon: LayoutDashboard,
      end: true,
    },
    {
      to: '/admin/verifications',
      label: 'Verifications',
      icon: ShieldCheck,
      badge: totalPending > 0 ? totalPending : undefined,
    },
    {
      to: '/admin/users',
      label: 'Users Directory',
      icon: Users,
    },
    {
      to: '/admin/audit',
      label: 'Audit Trail',
      icon: ScrollText,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header Bar */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white">ANVAYA ADMIN</span>
        </div>
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 md:translate-x-0 md:static ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-white block">ANVAYA</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Admin Terminal
                </span>
              </div>
            </Link>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer in sidebar with Admin profile & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-sm">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex-1 py-2 px-3 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              Public Site <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={() => setLogoutModalOpen(true)}
              className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Administration</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-bold capitalize">Console</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </div>
            {user?.role && <RoleBadge role={user.role} />}
          </div>
        </div>

        {/* Child Page Outlet */}
        <div className="p-6 sm:p-8 flex-1 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Sign Out of Admin Console"
        message="Are you sure you want to end your administrative session? All uncommitted temporary filters will be reset."
        confirmLabel="Logout"
        variant="danger"
      />
    </div>
  );
};
