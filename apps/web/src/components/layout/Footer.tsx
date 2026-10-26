import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Heart, Lock, FileCheck2, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <Activity className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">ANVAYA</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Paperless healthcare for doctors, pharmacies and patients. Built with consent-based access and audit logging; not certified or reviewed for regulatory compliance.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Consent-Based Access & Audit Logging
            </div>
          </div>

          {/* Role Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Healthcare Network
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#roles" className="hover:text-emerald-400 transition-colors">
                  For Medical Practitioners
                </a>
              </li>
              <li>
                <a href="#roles" className="hover:text-emerald-400 transition-colors">
                  For Retail & Hospital Pharmacies
                </a>
              </li>
              <li>
                <a href="#roles" className="hover:text-emerald-400 transition-colors">
                  For Patients & Families
                </a>
              </li>
              <li>
                <a href="#step-flow" className="hover:text-emerald-400 transition-colors">
                  E-Prescription Verification Loop
                </a>
              </li>
            </ul>
          </div>

          {/* Privacy & Trust */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Security & Privacy
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Zero Admin Medical Visibility
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Tamper-Evident Audit Log
              </li>
              <li className="flex items-center gap-2">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                Single-Dispense Prevention
              </li>
              <li className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Doctor Verification Protocol
              </li>
            </ul>
          </div>

          {/* Administration Access */}
          <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Administrative Operations
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authorized compliance officers and platform administrators can inspect licenses, audit logs, and user access.
            </p>
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-400/20"
            >
              <Lock className="w-3.5 h-3.5" />
              Admin Login
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ANVAYA Healthcare Ecosystem. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for modern healthcare
            </span>
            <Link
              to="/admin/login"
              className="text-slate-400 hover:text-emerald-400 transition-colors font-medium flex items-center gap-1"
            >
              Admin Portal <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
