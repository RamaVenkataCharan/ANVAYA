import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Role } from '@anvaya/shared';
import { ShieldCheck, Lock, Mail, ArrowRight, Loader2, KeyRound, AlertCircle, ArrowLeft } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your identifier and password');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const user = await login(identifier.trim(), password);

      if (user.role !== Role.ADMIN) {
        setErrorMsg('Access denied. Your account does not have administrative privileges.');
        toast.error('Only administrators can access the admin console.', 'Access Denied');
        return;
      }

      toast.success(`Welcome back, ${user.name}`, 'Admin Authenticated');
      navigate(from, { replace: true });
    } catch (err: any) {
      const serverMessage =
        err.response?.data?.message || err.response?.data?.error || 'Invalid credentials or connection error';
      setErrorMsg(serverMessage);
      toast.error(serverMessage, 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-600/15 via-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Back to website link */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-slate-800/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Public Site
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Header Icon & Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white items-center justify-center shadow-lg shadow-emerald-500/20 mb-1">
            <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ANVAYA Administration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Secure compliance, verification and audit terminal
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-slate-800/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-700/70">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Identifier Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Admin Email / Phone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@organization.health"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Authorization Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-wider text-emerald-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all shadow-lg shadow-emerald-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Access Admin Console
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill (Development Only - Excluded from Production Builds) */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-6 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setIdentifier('admin@anvaya.health');
                  setPassword('Password123');
                  setErrorMsg(null);
                }}
                className="w-full py-2 px-3 text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-700/30 rounded-xl transition-colors border border-dashed border-slate-700 flex items-center justify-center gap-2"
              >
                <span>Auto-fill Demo Admin Credentials</span>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                  admin@anvaya.health
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
