import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import {
  Stethoscope,
  Store,
  HeartPulse,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  FileText,
  Clock,
  Sparkles,
  Smartphone,
  EyeOff,
  History,
  FileCheck,
  ArrowUpRight,
  AlertTriangle,
  Receipt,
  BellRing,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [simulatedDispensed, setSimulatedDispensed] = useState(false);

  const steps = [
    {
      id: 'issue',
      number: '01',
      title: 'Issue',
      subtitle: 'Doctor writes digital Rx',
      desc: 'Doctor examines the patient, selects medicines from the structured catalog with frequencies and dosage, and signs the prescription. A unique readable code (ANV-XXXX-XXXX) and cryptographic QR hash are generated.',
      icon: Stethoscope,
      badge: 'Step 1: Clinical Consultation',
      color: 'from-sky-500 to-blue-600',
    },
    {
      id: 'wallet',
      number: '02',
      title: 'Wallet / QR',
      subtitle: 'Patient receives in app',
      desc: 'The prescription lands in the patient’s ANVAYA digital wallet instantly with push notification. The cryptographic QR is accessible offline, preventing reliance on patchy cellular connectivity.',
      icon: Smartphone,
      badge: 'Step 2: Instant Delivery',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'scan',
      number: '03',
      title: 'Scan',
      subtitle: 'Pharmacy scans & validates',
      desc: 'The pharmacist scans the QR code or enters the prescription code. ANVAYA’s verification engine instantly cross-references the ledger, verifying authenticity and checking active status.',
      icon: QrCode,
      badge: 'Step 3: Verification',
      color: 'from-teal-500 to-cyan-600',
    },
    {
      id: 'dispense',
      number: '04',
      title: 'Dispense',
      subtitle: 'Atomic lock & billing',
      desc: 'Pharmacist dispenses the medication. The prescription status atomically transitions to DISPENSED in the database. Any subsequent attempt to scan or reuse the prescription is immediately flagged as fraud.',
      icon: FileCheck,
      badge: 'Step 4: Fulfillment & Khata',
      color: 'from-indigo-500 to-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white">
        {/* Subtle background ambient lights */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-emerald-200/40 via-teal-100/30 to-sky-200/20 blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/60 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Next-Generation Healthtech Ecosystem
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Paperless healthcare for{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  doctors, pharmacies
                </span>{' '}
                and patients
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Eliminating paper prescriptions, pharmacy queues, and medication errors through cryptographically verifiable, consent-driven digital healthcare. Single-dispense guarantee with atomic anti-fraud protection.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <a
                  href="#step-flow"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02]"
                >
                  Explore Prescription Flow
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200/90 shadow-sm transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Admin Console
                </Link>
              </div>

              {/* Trust badges */}
              <div className="pt-6 border-t border-slate-200/60 grid grid-cols-3 gap-4 text-center lg:text-left">
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Atomic Dispense Lock</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">Zero</div>
                  <div className="text-xs text-slate-500 font-medium">Admin Medical Visibility</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">&lt; 30s</div>
                  <div className="text-xs text-slate-500 font-medium">Verification & Billing</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup / Prescription Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                {/* Glow aura */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur-xl opacity-20 -z-10" />

                {/* Prescription Card Mockup */}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
                  {/* Card Header */}
                  <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Digital E-Prescription
                        </div>
                        <div className="text-sm font-bold font-mono">ANV-8942-7193</div>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        simulatedDispensed
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {simulatedDispensed ? 'DISPENSED' : 'ISSUED (VALID)'}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-5">
                    {/* Doctor Info */}
                    <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">Prescribing Physician</div>
                        <div className="text-sm font-bold text-slate-800">Dr. Sarah Sharma, MD</div>
                        <div className="text-xs text-emerald-600 font-medium">Cardiology • Reg: MCI-884920</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-medium">Patient Details</div>
                        <div className="text-sm font-bold text-slate-800">Ravi Kumar (38y)</div>
                        <div className="text-xs text-slate-500">Gender: Male • O+</div>
                      </div>
                    </div>

                    {/* Prescribed Items */}
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Prescribed Medication
                      </div>
                      <div className="space-y-2">
                        <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-800">Amoxicillin 500mg</span>
                            <span className="text-slate-500 ml-2">1-0-1 after food</span>
                          </div>
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Qty: 10
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100">
                          <div>
                            <span className="font-bold text-slate-800">Paracetamol 650mg</span>
                            <span className="text-slate-500 ml-2">SOS for fever</span>
                          </div>
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            Qty: 6
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cryptographic QR Representation */}
                    <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100/80 flex items-center gap-4">
                      <div className="w-16 h-16 bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center shrink-0">
                        <QrCode className="w-14 h-14 text-slate-800" />
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          Cryptographically Signed
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                          Tamper-proof SHA256 signature guarantees zero counterfeit or double-dispense.
                        </p>
                      </div>
                    </div>

                    {/* Interactive Dispense Simulation Toggle */}
                    <div className="pt-2">
                      <button
                        onClick={() => setSimulatedDispensed(!simulatedDispensed)}
                        className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                          simulatedDispensed
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                        }`}
                      >
                        {simulatedDispensed ? (
                          <>
                            <History className="w-4 h-4" /> Reset Simulation
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Simulate Pharmacy Scan & Dispense
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Sections: Doctor, Medical Shop, Patient */}
      <section id="roles" className="py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Complete Healthcare Triad
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Purpose-built tools for each participant
            </h2>
            <p className="text-base text-slate-600">
              Connecting doctors, pharmacies, and patients into a unified ecosystem where prescriptions cannot be lost, forged, or altered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Role 1: Doctor */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group flex flex-col justify-between">
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Practitioners</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">For Doctors</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Streamline consultations with rapid, structured digital prescriptions. Zero illegible handwriting and instant medication lookup.
                </p>

                <ul className="space-y-3 pt-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Sub-Minute Rx:</strong> Fast medicine autocomplete with dosage and duration.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Phone-Based Patient Lookup:</strong> Instant patient search showing only name & age to preserve confidentiality.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Cryptographic Signing:</strong> Anti-tamper digital signature on every issued prescription.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Verified Credentials:</strong> Medical council registration verified by admin before issuance.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/60">
                <span className="text-xs font-semibold text-sky-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Verified practitioner network <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Role 2: Medical Shop */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-500/5 transition-all group flex flex-col justify-between">
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <Store className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Pharmacies</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">For Medical Shops</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Eliminate duplicate claims and counter errors with camera QR scanning, automated invoicing, and credit Khata ledgers.
                </p>

                <ul className="space-y-3 pt-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Instant QR Verification:</strong> Scan customer phone to verify prescription validity in milliseconds.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Atomic Single-Dispense Guard:</strong> Hard block on already-dispensed prescriptions prevents duplicate claims.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Smart Khata Credit Ledger:</strong> Manage customer credit with automated balances and repayment tracking.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Auto Refill Notifications:</strong> System triggers patient reminders when medication is nearing completion.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/60">
                <span className="text-xs font-semibold text-teal-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Licensed pharmacy workflow <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Role 3: Patient */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group flex flex-col justify-between">
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                  <HeartPulse className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Individuals & Families</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">For Patients</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your complete healthcare history in your pocket. Offline-accessible prescriptions, secure record vault, and total consent sovereignty.
                </p>

                <ul className="space-y-3 pt-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Offline Digital Wallet:</strong> Carry high-resolution QR codes accessible without mobile data.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Granular Consent Gates:</strong> Explicitly grant or revoke doctor access to your lab reports at any time.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Health History Timeline:</strong> Never lose past prescriptions, diagnoses, or dosage instructions.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Medication Reminders:</strong> Automated alerts notify you when maintenance medicines are due for refill.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/60">
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Patient privacy sovereignty <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step Flow: How a prescription moves (issue -> wallet/QR -> scan -> dispense) */}
      <section id="step-flow" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Subtle decorative mesh background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              The E-Prescription Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How a prescription moves in ANVAYA
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Follow the end-to-end atomic loop from clinical consultation to pharmacy verification and tamper-proof dispensation.
            </p>
          </div>

          {/* Interactive Step Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isSelected = activeStep === idx;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg shadow-emerald-500/10 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">{s.number}</span>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                  </div>
                  <div className="font-bold text-sm text-slate-100">{s.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{s.subtitle}</div>
                </button>
              );
            })}
          </div>

          {/* Active Step Showcase Card */}
          <div className="max-w-4xl mx-auto bg-slate-800/80 rounded-3xl p-8 sm:p-10 border border-slate-700/80 backdrop-blur-sm shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  {steps[activeStep].badge}
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {steps[activeStep].number}. {steps[activeStep].title}: {steps[activeStep].subtitle}
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                  {steps[activeStep].desc}
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => setActiveStep((prev) => (prev + 1) % steps.length)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-400/20"
                  >
                    Next Phase <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="md:col-span-4 flex justify-center">
                <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-sky-500/20 border border-emerald-500/30 flex flex-col items-center justify-center p-6 text-center shadow-xl">
                  {React.createElement(steps[activeStep].icon, {
                    className: 'w-16 h-16 text-emerald-400 mb-2 animate-bounce',
                  })}
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {steps[activeStep].title}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy Section: Consent, Audit logs, Verified professionals, Zero Admin Medical Exposure */}
      <section id="security" className="py-24 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Uncompromising Trust Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Security, privacy and compliance by design
            </h2>
            <p className="text-base text-slate-600">
              Health records demand military-grade privacy. ANVAYA implements zero-knowledge administrative boundaries and cryptographic verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: Consent */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Consent-Driven Access</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Doctors cannot view patient reports without explicit patient consent. Patients retain total sovereignty to revoke practitioner access instantly.
              </p>
            </div>

            {/* Feature 2: Audit Logs */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <History className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Immutable Audit Trail</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every login, prescription issue, QR verification, and medication dispense is stamped with IP address, user agent, and timestamp for strict accountability.
              </p>
            </div>

            {/* Feature 3: Verified Professionals */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Verified Providers</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Medical council registration (MCI/NMC) and government pharmacy drug licenses are verified by administrators before prescribing or dispensing capabilities are activated.
              </p>
            </div>

            {/* Feature 4: Zero Admin Medical Exposure */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <EyeOff className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Zero Admin Medical Visibility</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Platform administrators never see patient diagnoses, lab report files, or clinical notes. Administrative access is strictly limited to metadata and licensing compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Admin Link */}
      <Footer />
    </div>
  );
};
