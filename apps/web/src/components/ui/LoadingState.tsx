import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...', size = 'md' }) => {
  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
      <Loader2 className={`${iconSize} animate-spin text-emerald-600`} />
      {message && <p className="text-sm font-medium text-slate-500 animate-pulse">{message}</p>}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full animate-pulse space-y-3 p-4">
      {/* Table header skeleton */}
      <div className="h-10 bg-slate-100 rounded-lg w-full mb-4" />
      {/* Table row skeletons */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 items-center py-3 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-slate-200/70 rounded"
              style={{ width: `${Math.max(20, 100 / cols - (cIdx % 2) * 5)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
