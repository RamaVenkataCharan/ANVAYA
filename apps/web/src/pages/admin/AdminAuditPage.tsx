import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ActionBadge, RoleBadge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ScrollText,
  Filter,
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  Globe,
} from 'lucide-react';

export const AdminAuditPage: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'audit', selectedAction, fromDate, toDate, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedAction) params.append('action', selectedAction);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await api.get(`/admin/audit?${params.toString()}`);
      return res.data?.data;
    },
  });

  const resetFilters = () => {
    setSelectedAction('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const logs = data?.logs || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  const actionOptions = [
    { value: '', label: 'All Action Types' },
    { value: 'DOCTOR_VERIFIED', label: 'DOCTOR_VERIFIED (Approvals)' },
    { value: 'DOCTOR_REJECTED', label: 'DOCTOR_REJECTED (Rejections)' },
    { value: 'SHOP_VERIFIED', label: 'SHOP_VERIFIED (Approvals)' },
    { value: 'SHOP_REJECTED', label: 'SHOP_REJECTED (Rejections)' },
    { value: 'USER_SUSPENDED', label: 'USER_SUSPENDED' },
    { value: 'USER_REACTIVATED', label: 'USER_REACTIVATED' },
    { value: 'AUTH_LOGIN', label: 'AUTH_LOGIN' },
    { value: 'AUTH_LOGOUT', label: 'AUTH_LOGOUT' },
    { value: 'AUTH_REGISTER', label: 'AUTH_REGISTER' },
    { value: 'PRESCRIPTION_ISSUED', label: 'PRESCRIPTION_ISSUED' },
    { value: 'PRESCRIPTION_DISPENSED', label: 'PRESCRIPTION_DISPENSED' },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Immutable Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete compliance event log detailing who performed what action, on which resource, and when.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tamper-Evident System Audit Trail</span>
        </div>
      </div>

      {/* Filter Bar: Action Type & Date Range */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {actionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        {(selectedAction || fromDate || toDate) && (
          <button
            onClick={resetFilters}
            className="self-end md:self-auto px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
          </button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No Audit Records"
            description="No system audit logs matched the specified action type or date range filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor / User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Resource Target</th>
                  <th className="py-3.5 px-4">Metadata & Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log: any) => {
                  const meta = log.metadata || {};
                  let metaString = '';
                  if (meta.status) {
                    metaString += `Status: ${meta.status} `;
                  }
                  if (meta.rejectionReason) {
                    metaString += `• Reason: "${meta.rejectionReason}" `;
                  }
                  if (meta.reason) {
                    metaString += `• Reason: "${meta.reason}" `;
                  }
                  if (meta.role) {
                    metaString += `• Role: ${meta.role} `;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Time */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-slate-400">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        {log.user ? (
                          <div>
                            <div className="font-bold text-slate-900">{log.user.name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>{log.user.email}</span>
                              {log.user.role && <RoleBadge role={log.user.role} />}
                            </div>
                          </div>
                        ) : log.userId ? (
                          <div className="font-mono text-slate-500 text-[11px]">
                            ID: {log.userId.slice(0, 8)}...
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">System Process</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <ActionBadge action={log.action} />
                      </td>

                      {/* Resource */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">
                          {log.resource}
                        </div>
                        {log.resourceId && (
                          <div className="font-mono text-slate-400 text-[10px] truncate max-w-[140px]" title={log.resourceId}>
                            {log.resourceId}
                          </div>
                        )}
                      </td>

                      {/* Metadata */}
                      <td className="py-3.5 px-4 max-w-sm">
                        {metaString ? (
                          <div className="text-xs text-slate-800 font-medium leading-relaxed">
                            {metaString}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Standard audit event</span>
                        )}
                        {log.ipAddress && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Globe className="w-3 h-3" /> {log.ipAddress}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} logged entries)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
