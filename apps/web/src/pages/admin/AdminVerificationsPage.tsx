import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Stethoscope,
  Store,
  History,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export const AdminVerificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'doctors' | 'shops' | 'history'>('doctors');
  const queryClient = useQueryClient();
  const toast = useToast();

  // Pending Verifications Query
  const {
    data: pendingData,
    isLoading: isPendingLoading,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['admin', 'pending-verifications'],
    queryFn: async () => {
      const res = await api.get('/admin/pending-verifications');
      return res.data?.data;
    },
  });

  // Verification History Query (shows who approved what and when)
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['admin', 'verifications-history'],
    queryFn: async () => {
      const res = await api.get('/admin/verifications/history');
      return res.data?.data;
    },
  });

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'doctor' | 'shop';
    action: 'APPROVED' | 'REJECTED';
    id: string;
    title: string;
    message: string;
    targetName: string;
    regOrLicense: string;
  }>({
    isOpen: false,
    type: 'doctor',
    action: 'APPROVED',
    id: '',
    title: '',
    message: '',
    targetName: '',
    regOrLicense: '',
  });

  // Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: async ({
      type,
      id,
      status,
      reason,
    }: {
      type: 'doctor' | 'shop';
      id: string;
      status: 'APPROVED' | 'REJECTED';
      reason?: string;
    }) => {
      const url = `/admin/verify/${type}/${id}`;
      const res = await api.post(url, { status, reason });
      return res.data;
    },
    onSuccess: (_, variables) => {
      const actionText = variables.status === 'APPROVED' ? 'approved' : 'rejected';
      toast.success(
        `Healthcare provider successfully ${actionText}. Audit record generated.`,
        'Verification Updated'
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'verifications-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Verification action failed';
      toast.error(msg, 'Action Failed');
    },
  });

  const openApproveModal = (type: 'doctor' | 'shop', id: string, name: string, regOrLicense: string) => {
    setConfirmModal({
      isOpen: true,
      type,
      action: 'APPROVED',
      id,
      targetName: name,
      regOrLicense,
      title: `Approve ${type === 'doctor' ? 'Doctor' : 'Pharmacy'} Credentials`,
      message: `Confirm credential approval for ${name} (${regOrLicense})? This will immediately activate full prescribing/dispensing privileges on the platform.`,
    });
  };

  const openRejectModal = (type: 'doctor' | 'shop', id: string, name: string, regOrLicense: string) => {
    setConfirmModal({
      isOpen: true,
      type,
      action: 'REJECTED',
      id,
      targetName: name,
      regOrLicense,
      title: `Reject ${type === 'doctor' ? 'Doctor' : 'Pharmacy'} Submission`,
      message: `You are rejecting the application for ${name} (${regOrLicense}). A clear reason is required and will be logged to the immutable audit trail.`,
    });
  };

  const handleConfirmAction = async (reasonInput?: string) => {
    await verifyMutation.mutateAsync({
      type: confirmModal.type,
      id: confirmModal.id,
      status: confirmModal.action,
      reason: reasonInput,
    });
  };

  const pendingDoctors = pendingData?.doctors || [];
  const pendingShops = pendingData?.shops || [];
  const historyList = historyData || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Credential Verifications
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review state medical council registration numbers and retail drug licenses before granting platform authorization.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'doctors'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Pending Doctors</span>
          {pendingDoctors.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
              {pendingDoctors.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('shops')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'shops'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Pending Pharmacies</span>
          {pendingShops.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800">
              {pendingShops.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Verification History</span>
          <span className="text-xs text-slate-400 font-normal">
            (Who approved what & when)
          </span>
        </button>
      </div>

      {/* Tab 1: Pending Doctors */}
      {activeTab === 'doctors' && (
        <div>
          {isPendingLoading ? (
            <LoadingSpinner message="Checking pending doctor verifications..." />
          ) : pendingDoctors.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="All Doctors Verified"
              description="There are currently no doctor credential applications awaiting administrative review."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingDoctors.map((doc: any) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    {/* Top doctor header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-lg shrink-0">
                          <Stethoscope className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {doc.user?.name || 'Dr. Practitioner'}
                          </h3>
                          <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                            {doc.specialization}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={doc.verificationStatus} />
                    </div>

                    {/* Registration details */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Medical Registration No:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {doc.registrationNo}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-600 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{doc.clinicAddress}</span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{doc.user?.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{doc.user?.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>Applied: {new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                    <button
                      onClick={() =>
                        openRejectModal('doctor', doc.id, doc.user?.name, doc.registrationNo)
                      }
                      className="flex-1 py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() =>
                        openApproveModal('doctor', doc.id, doc.user?.name, doc.registrationNo)
                      }
                      className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pending Shops */}
      {activeTab === 'shops' && (
        <div>
          {isPendingLoading ? (
            <LoadingSpinner message="Checking pending pharmacy verifications..." />
          ) : pendingShops.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="All Pharmacies Verified"
              description="There are currently no pharmacy drug license submissions awaiting review."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingShops.map((shop: any) => (
                <div
                  key={shop.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
                          <Store className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {shop.shopName}
                          </h3>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Operator: {shop.user?.name}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={shop.verificationStatus} />
                    </div>

                    {/* License details */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Drug License Number:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {shop.licenseNo}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-600 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{shop.address}</span>
                      </div>
                    </div>

                    {/* Contact & Timings */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{shop.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{shop.timings}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>Submitted: {new Date(shop.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                    <button
                      onClick={() =>
                        openRejectModal('shop', shop.id, shop.shopName, shop.licenseNo)
                      }
                      className="flex-1 py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() =>
                        openApproveModal('shop', shop.id, shop.shopName, shop.licenseNo)
                      }
                      className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Verification History (Shows who approved what and when) */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Verification Decision Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full accountability log indicating which administrator approved or rejected each provider license and at what exact time.
              </p>
            </div>
          </div>

          {isHistoryLoading ? (
            <LoadingSpinner message="Fetching verification decision history..." />
          ) : historyList.length === 0 ? (
            <EmptyState
              icon={History}
              title="No Past Decisions"
              description="No providers have been approved or rejected in this environment yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Provider / Resource</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Decision</th>
                    <th className="py-3 px-4">Decision Details / Reason</th>
                    <th className="py-3 px-4">Verified By (Admin)</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {historyList.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.targetName || item.metadata?.doctorUserId || item.resourceId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {item.resource}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                        {item.rejectionReason ? (
                          <span className="text-rose-600 font-medium">{item.rejectionReason}</span>
                        ) : (
                          <span className="text-slate-400 italic">Credentials verified & approved</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {item.verifiedBy ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{item.verifiedBy.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">System Admin</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(item.verifiedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation & Rejection Dialog */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.action === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
        variant={confirmModal.action === 'APPROVED' ? 'primary' : 'danger'}
        requiresInput={confirmModal.action === 'REJECTED'}
        inputLabel="Reason for Rejection"
        inputErrorMessage="A rejection reason of at least 5 characters is required for administrative compliance"
        inputMinLength={5}
        isSubmitting={verifyMutation.isPending}
      />
    </div>
  );
};
