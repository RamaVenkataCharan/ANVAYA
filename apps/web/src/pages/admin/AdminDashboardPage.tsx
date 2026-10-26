import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AdminStatsModel } from '@anvaya/shared';
import { LoadingSpinner } from '../../components/ui/LoadingState';
import { Link } from 'react-router-dom';
import {
  Users,
  ShieldAlert,
  FileText,
  Receipt,
  Stethoscope,
  Store,
  UserCheck,
  Calendar,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useQuery<AdminStatsModel>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data?.data;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading platform metrics..." size="lg" />;
  }

  if (isError || !stats) {
    return (
      <div className="p-8 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-rose-900">Failed to load platform statistics</h3>
        <p className="text-xs text-rose-700 leading-relaxed">
          {(error as any)?.message || 'Could not connect to the ANVAYA metrics endpoint.'}
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Request
        </button>
      </div>
    );
  }

  const pendingTotal = (stats.pendingDoctorApprovals || 0) + (stats.pendingShopApprovals || 0);
  const dispenseRate =
    stats.totalPrescriptions > 0
      ? Math.round((stats.dispensedPrescriptions / stats.totalPrescriptions) * 100)
      : 0;

  return (
    <div className="space-y-8">
      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Platform Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time telemetry, credential verifications, and compliance monitoring
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-600' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh Telemetry'}
        </button>
      </div>

      {/* Alert Banner for Pending Approvals */}
      {pendingTotal > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {pendingTotal} Provider Credentials Awaiting Verification
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {stats.pendingDoctorApprovals} doctor{stats.pendingDoctorApprovals !== 1 ? 's' : ''} and{' '}
                {stats.pendingShopApprovals} pharmac{stats.pendingShopApprovals !== 1 ? 'ies' : 'y'} require licensing approval.
              </p>
            </div>
          </div>
          <Link
            to="/admin/verifications"
            className="shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-950 bg-amber-300 hover:bg-amber-200 rounded-xl transition-colors shadow-sm"
          >
            Review Queue
          </Link>
        </div>
      )}

      {/* 4 Primary Stats Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Platform Users */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalUsers}</div>
            <div className="text-xs text-slate-500 mt-1">Platform Registrations</div>
          </div>
          {/* Breakdown Pills */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[11px] text-center font-semibold">
            <div className="bg-sky-50 text-sky-700 p-1 rounded-lg">
              <div>{stats.totalDoctors}</div>
              <div className="text-[10px] text-slate-400 font-normal">Docs</div>
            </div>
            <div className="bg-emerald-50 text-emerald-700 p-1 rounded-lg">
              <div>{stats.totalShops}</div>
              <div className="text-[10px] text-slate-400 font-normal">Shops</div>
            </div>
            <div className="bg-amber-50 text-amber-700 p-1 rounded-lg">
              <div>{stats.totalPatients}</div>
              <div className="text-[10px] text-slate-400 font-normal">Patients</div>
            </div>
          </div>
        </div>

        {/* Metric 2: Pending Verifications */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Verification
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-600 tracking-tight">{pendingTotal}</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting Licensure Review</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Doctors: <strong>{stats.pendingDoctorApprovals}</strong></span>
            <span>Pharmacies: <strong>{stats.pendingShopApprovals}</strong></span>
          </div>
        </div>

        {/* Metric 3: Prescriptions Issued & Dispensed */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Prescriptions
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalPrescriptions}
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              {stats.dispensedPrescriptions} Dispensed ({dispenseRate}%)
            </div>
          </div>
          {/* Progress bar */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, dispenseRate))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 4: Bills & Appointments */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Bills & Consults
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalBills}</div>
            <div className="text-xs text-slate-500 mt-1">Pharmacy Invoices Generated</div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Appointments: <strong>{stats.totalAppointments}</strong></span>
            <span className="text-teal-600 font-semibold">Active Cycle</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/verifications"
          className="p-6 rounded-3xl bg-gradient-to-br from-white to-amber-50/50 border border-slate-200/90 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Credential Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review submitted medical registration numbers and pharmacy drug licenses with approve or reject workflows.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
            <span>{pendingTotal} pending review</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="p-6 rounded-3xl bg-gradient-to-br from-white to-sky-50/50 border border-slate-200/90 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Account Directory & Status</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Search and filter users by role and active status. Suspend or reactivate accounts without exposing patient medical data.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-700">
            <span>{stats.totalUsers} registered accounts</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/admin/audit"
          className="p-6 rounded-3xl bg-gradient-to-br from-white to-emerald-50/50 border border-slate-200/90 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Compliance Audit Trail</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Inspect immutable audit records of all actions, logins, provider credential verifications, and resource updates.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Inspect security logs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
};
