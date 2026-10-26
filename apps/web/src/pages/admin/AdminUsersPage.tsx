import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Role } from '@anvaya/shared';
import {
  Search,
  Filter,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Users,
  EyeOff,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const limit = 15;

  const queryClient = useQueryClient();
  const toast = useToast();

  // Dialog State
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    action: 'suspend' | 'reactivate';
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    action: 'suspend',
  });

  // Query users
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', searchTerm, selectedRole, selectedStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Suspend/Reactivate Mutation
  const statusMutation = useMutation({
    mutationFn: async ({
      userId,
      action,
      reason,
    }: {
      userId: string;
      action: 'suspend' | 'reactivate';
      reason?: string;
    }) => {
      const url = `/admin/users/${userId}/${action}`;
      const res = await api.post(url, { reason });
      return res.data;
    },
    onSuccess: (_, variables) => {
      const actionText = variables.action === 'suspend' ? 'suspended' : 'reactivated';
      toast.success(`User account has been ${actionText}.`, 'Status Updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      setStatusDialog((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update user status';
      toast.error(msg, 'Action Error');
    },
  });

  const handleConfirmStatus = async (reason?: string) => {
    await statusMutation.mutateAsync({
      userId: statusDialog.userId,
      action: statusDialog.action,
      reason,
    });
  };

  const users = data?.users || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Page Title & Privacy Guarantee Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Directory & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, filter, and manage platform user credentials and active suspension states.
          </p>
        </div>

        {/* Medical Isolation Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80 text-xs font-semibold self-start sm:self-auto">
          <EyeOff className="w-4 h-4 text-purple-600" />
          <span>Strict Privacy Guard: Medical Content Hidden</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Role:
            </span>
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-auto"
            >
              <option value="ALL">All Roles</option>
              <option value={Role.DOCTOR}>Doctors</option>
              <option value={Role.SHOP}>Pharmacies</option>
              <option value={Role.PATIENT}>Patients</option>
              <option value={Role.ADMIN}>Administrators</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-auto"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Users Found"
            description="No user accounts match the current filter criteria or search query."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">User Details</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Profile Reference</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Member Since</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u: any) => {
                  let profileDetail = '—';
                  if (u.role === Role.DOCTOR && u.doctorProfile) {
                    profileDetail = `${u.doctorProfile.specialization} • Reg: ${u.doctorProfile.registrationNo}`;
                  } else if (u.role === Role.SHOP && u.shopProfile) {
                    profileDetail = `${u.shopProfile.shopName} • Lic: ${u.shopProfile.licenseNo}`;
                  } else if (u.role === Role.PATIENT && u.patientProfile) {
                    profileDetail = `Gender: ${u.patientProfile.gender || 'N/A'}`;
                  }

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200/60">
                            {u.name ? u.name[0].toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{u.name}</div>
                            <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                              <span>{u.email}</span>
                              <span>•</span>
                              <span>{u.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Profile details */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        <span className="font-medium">{profileDetail}</span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={u.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                      </td>

                      {/* Member Since */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {u.role !== Role.ADMIN && (
                          <>
                            {u.isActive ? (
                              <button
                                onClick={() =>
                                  setStatusDialog({
                                    isOpen: true,
                                    userId: u.id,
                                    userName: u.name,
                                    action: 'suspend',
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors inline-flex items-center gap-1.5"
                              >
                                <UserX className="w-3.5 h-3.5" /> Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setStatusDialog({
                                    isOpen: true,
                                    userId: u.id,
                                    userName: u.name,
                                    action: 'reactivate',
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors inline-flex items-center gap-1.5"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Reactivate
                              </button>
                            )}
                          </>
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
            Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} total accounts)
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

      {/* Confirmation Dialog for Suspend / Reactivate */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        onClose={() => setStatusDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmStatus}
        title={statusDialog.action === 'suspend' ? 'Suspend Account' : 'Reactivate Account'}
        message={
          statusDialog.action === 'suspend'
            ? `Are you sure you want to suspend ${statusDialog.userName}? The user will be blocked from logging into the mobile or web portals.`
            : `Are you sure you want to reactivate ${statusDialog.userName}? This will restore their active platform capabilities.`
        }
        confirmLabel={statusDialog.action === 'suspend' ? 'Suspend User' : 'Reactivate User'}
        variant={statusDialog.action === 'suspend' ? 'danger' : 'primary'}
        requiresInput={statusDialog.action === 'suspend'}
        inputLabel="Administrative Reason"
        inputPlaceholder="e.g. Terms violation, failed re-verification, suspicious activity..."
        isSubmitting={statusMutation.isPending}
      />
    </div>
  );
};
