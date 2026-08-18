import React from 'react';
import { X, ShieldCheck, Lock, Cpu, Database, CheckCircle2, FileCheck } from 'lucide-react';

export default function ZeroRetentionModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-750 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-slate-800 dark:text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-500/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Our 100% Privacy & Zero-Data Promise</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">How your personal files and data stay completely safe</p>
          </div>
        </div>

        {/* Core Tenets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center space-x-2 text-cyan-700 dark:text-cyan-300 font-bold">
              <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Never Saved to Disk</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Your files exist only in temporary computer memory while this page is open. No raw or sensitive data is ever written to hard drives.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-300 font-bold">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Local on Your Computer</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Document scanning, OCR text reading, and privacy filters execute directly on your machine without sending files to any outside server.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-bold">
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Clean AI Chat Answers</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Only sanitized, safe text is referenced when you chat with your document. The AI assistant never sees or leaks your real passwords or PAN numbers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold">
              <FileCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Instant Memory Wipe</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
              Clicking "Clear Memory" or refreshing your browser immediately and permanently erases all active document data.
            </p>
          </div>

        </div>

        {/* Regulatory Badges */}
        <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> India DPDP Act Compliant
          </span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> GDPR Privacy-by-Design
          </span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> PCI-DSS Card Protection
          </span>
        </div>

        <div className="text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-cyan-600/30"
          >
            Got It, Close
          </button>
        </div>

      </div>
    </div>
  );
}
