import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'success';
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputErrorMessage?: string;
  inputMinLength?: number;
  isSubmitting?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  requiresInput = false,
  inputLabel = 'Reason',
  inputPlaceholder = 'Please enter a detailed reason...',
  inputErrorMessage = 'This field is required',
  inputMinLength = 5,
  isSubmitting = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);

  const handleConfirm = async () => {
    if (requiresInput && (!inputValue.trim() || inputValue.trim().length < inputMinLength)) {
      setError(true);
      return;
    }
    setError(false);
    await onConfirm(inputValue.trim());
    setInputValue('');
  };

  const handleClose = () => {
    setInputValue('');
    setError(false);
    onClose();
  };

  const variantStyles = {
    danger: {
      btn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-rose-200',
      iconBg: 'bg-rose-100 text-rose-600',
      icon: <AlertTriangle className="w-6 h-6" />,
    },
    primary: {
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-600',
      icon: <CheckCircle className="w-6 h-6" />,
    },
    success: {
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-600',
      icon: <CheckCircle className="w-6 h-6" />,
    },
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="flex gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}>
          {variantStyles.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>

          {requiresInput && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {inputLabel} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={inputPlaceholder}
                rows={3}
                className={`w-full px-3 py-2 text-sm rounded-xl border ${
                  error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
                } focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all`}
              />
              {error && <p className="text-xs text-rose-500 font-medium mt-1">{inputErrorMessage}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className={`px-5 py-2 text-sm font-semibold rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${variantStyles.btn}`}
        >
          {isSubmitting ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
