import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '@anvaya/shared';
import { ShieldAlert } from 'lucide-react';

export const AdminGuard: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium text-emerald-400 mt-6 tracking-wide">
          Verifying security clearance...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user.role !== Role.ADMIN) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
          The ANVAYA administration console requires elevated <span className="text-rose-400 font-semibold">ADMIN</span> credentials. Your account is registered as <span className="text-slate-200 font-semibold">{user.role}</span>.
        </p>
        <div className="mt-6 flex gap-3">
          <Navigate to="/admin/login" replace />
        </div>
      </div>
    );
  }

  return <Outlet />;
};
