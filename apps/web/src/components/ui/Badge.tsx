import React from 'react';
import { Role, VerificationStatus } from '@anvaya/shared';

interface RoleBadgeProps {
  role: Role | string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const config = {
    [Role.ADMIN]: 'bg-purple-100 text-purple-700 border-purple-200',
    [Role.DOCTOR]: 'bg-sky-100 text-sky-700 border-sky-200',
    [Role.SHOP]: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    [Role.PATIENT]: 'bg-amber-100 text-amber-700 border-amber-200',
  }[role as Role] || 'bg-slate-100 text-slate-700 border-slate-200';

  const label = {
    [Role.ADMIN]: 'Admin',
    [Role.DOCTOR]: 'Doctor',
    [Role.SHOP]: 'Pharmacy',
    [Role.PATIENT]: 'Patient',
  }[role as Role] || role;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config}`}
    >
      {label}
    </span>
  );
};

interface StatusBadgeProps {
  status: VerificationStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toUpperCase();
  const config = {
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/80',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200/80',
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200/80',
  }[normalized] || 'bg-slate-50 text-slate-700 border-slate-200/80';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          normalized === 'APPROVED' || normalized === 'ACTIVE'
            ? 'bg-emerald-500'
            : normalized === 'PENDING'
            ? 'bg-amber-500'
            : 'bg-rose-500'
        }`}
      />
      {status}
    </span>
  );
};

interface ActionBadgeProps {
  action: string;
}

export const ActionBadge: React.FC<ActionBadgeProps> = ({ action }) => {
  let color = 'bg-slate-100 text-slate-700 border-slate-200';

  if (action.includes('VERIFIED') || action.includes('APPROVED')) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (action.includes('REJECTED') || action.includes('SUSPENDED')) {
    color = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (action.includes('LOGIN') || action.includes('REGISTER')) {
    color = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (action.includes('DISPENSED')) {
    color = 'bg-teal-50 text-teal-700 border-teal-200';
  } else if (action.includes('ISSUED')) {
    color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  return (
    <span className={`inline-block font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md border ${color}`}>
      {action}
    </span>
  );
};
