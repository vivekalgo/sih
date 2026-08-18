import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, CheckCircle2, Lock, Edit3, Send, ShieldCheck, Briefcase, Landmark, Home, Globe, HelpCircle, Loader2 } from 'lucide-react';

export default function Dropzone({
  onFileUpload,
  onTextSubmit,
  isProcessing,
  maskingMode,
  setMaskingMode,
  purpose,
  setPurpose
}) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' or 'paste'
  const [isDragOver, setIsDragOver] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const selectedPurpose = purpose || 'General Sharing';

  // Smooth realistic progress animation during document scanning/processing
  useEffect(() => {
    let interval = null;
    if (isProcessing) {
      setProgress(12);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + Math.floor(Math.random() * 5 + 3);
          if (prev < 65) return prev + Math.floor(Math.random() * 4 + 2);
          if (prev < 88) return prev + Math.floor(Math.random() * 2 + 1);
          if (prev < 96) return prev + 1;
          return prev;
        });
      }, 85);
    } else {
      setProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  const getStageDescription = (pct) => {
    if (pct < 25) return '1/4: Reading document & extracting text (OCR)...';
    if (pct < 55) return '2/4: Scanning & detecting sensitive PII (Aadhaar, PAN, Cards)...';
    if (pct < 80) return `3/4: Applying privacy policy for ${selectedPurpose}...`;
    return '4/4: Performing surgical masking & generating clean preview...';
  };

  const purposeOptions = [
    {
      id: 'General Sharing',
      label: 'General Sharing',
      icon: Globe,
      desc: 'Public or vendor sharing (Maximum privacy & PII minimization)'
    },
    {
      id: 'Bank KYC',
      label: 'Bank KYC',
      icon: Landmark,
      desc: 'Account opening & financial verification (PAN/Aadhaar required, hide secrets)'
    },
    {
      id: 'Job Application',
      label: 'Job Application',
      icon: Briefcase,
      desc: 'Resume & hiring submission (Hide PAN, Aadhaar, salary & financial details)'
    },
    {
      id: 'House Rent',
      label: 'House Rent',
      icon: Home,
      desc: 'Tenant agreement (Hide credit card, bank passwords, health records)'
    }
  ];

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onFileUpload(file, maskingMode, selectedPurpose);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileUpload(file, maskingMode, selectedPurpose);
    }
  };

  const handlePastedSubmit = (e) => {
    e.preventDefault();
    if (!pastedText.trim() || isProcessing) return;
    onTextSubmit(pastedText, maskingMode, selectedPurpose);
  };

  const maskingStrategies = [
    { id: 'TOKEN', label: 'Descriptive Tag', desc: '[REDACTED_PAN: XXXXX1234X]' },
    { id: 'BLACKOUT', label: 'Blackout Box', desc: '████████████' },
    { id: 'HASH', label: 'Scrambled Code', desc: '[HASH_CODE: 7f83b1]' },
    { id: 'SYNTHETIC', label: 'Fake Data', desc: '[SAFE_PERSON_1]' }
  ];

  return (
    <div className="space-y-4">
      
      {/* 1. SUBMISSION PURPOSE SELECTOR */}
      <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-slate-900/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Step 1: Why are you sharing this document?
              </span>
              <span className="text-[11px] text-cyan-600 dark:text-cyan-400 ml-2 font-medium">
                Smart Privacy Assistant
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            We automatically suggest what details are safe to keep vs hide
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {purposeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedPurpose === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPurpose && setPurpose(opt.id)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-500 text-cyan-950 dark:text-cyan-100 shadow-sm ring-1 ring-cyan-500/30'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. UPLOAD / PASTE MODE SWITCHER */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('file')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeTab === 'file'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paste')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all ${
            activeTab === 'paste'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Type or Paste Text</span>
        </button>
      </div>

      {activeTab === 'file' ? (
        /* File Upload Box */
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
            isProcessing
              ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/30 cursor-wait shadow-lg shadow-cyan-500/10'
              : isDragOver
                ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 scale-[1.01] shadow-lg shadow-cyan-500/20 cursor-pointer'
                : 'border-slate-300 dark:border-slate-700/80 bg-white/70 dark:bg-slate-900/40 hover:border-cyan-500/60 hover:bg-slate-50 dark:hover:bg-slate-900/70 shadow-sm cursor-pointer'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.bmp,.txt,.csv,.json,.doc,.docx"
            className="hidden"
            disabled={isProcessing}
            onChange={handleFileChange}
          />

          {isProcessing ? (
            /* Rich Percentage Progress Indicator */
            <div className="flex flex-col items-center justify-center space-y-4 py-2 w-full max-w-lg mx-auto">
              {/* Radial Progress Ring */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="text-slate-200 dark:text-slate-800"
                    strokeWidth="6"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="text-cyan-500 dark:text-cyan-400 transition-all duration-150 ease-out"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - progress / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black text-cyan-600 dark:text-cyan-400 font-mono tracking-tight">
                    {progress}%
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 w-full text-center px-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
                    <span>Scanning document and protecting your privacy...</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Checking for: <strong className="text-cyan-600 dark:text-cyan-300 font-semibold">{selectedPurpose}</strong> • Supports PDF, Images & Text
                  </p>
                </div>

                {/* Linear Progress Bar with glowing gradient */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner relative">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-150 ease-out shadow-sm shadow-cyan-500/50"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Step Description & Percentage readout */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                  <span className="text-cyan-700 dark:text-cyan-300 font-medium truncate">
                    {getStageDescription(progress)}
                  </span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 ml-2">
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Zero-leak security guarantee badge */}
              <div className="inline-flex items-center space-x-2 text-xs px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>100% Private: Runs on your device in temporary memory. Never saved to any server.</span>
              </div>
            </div>
          ) : (
            /* Idle File Upload State */
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-inner group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8 animate-bounce-subtle" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Drop your file here or click to browse
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Checking for: <strong className="text-cyan-600 dark:text-cyan-300 font-semibold">{selectedPurpose}</strong> • Supports PDF, Images & Text
                </p>
              </div>

              {/* Zero-leak security guarantee badge */}
              <div className="inline-flex items-center space-x-2 text-xs px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>100% Private: Runs on your device in temporary memory. Never saved to any server.</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Direct Text Paste Box */
        <form onSubmit={handlePastedSubmit} className="space-y-3">
          <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <textarea
              rows={6}
              value={pastedText}
              disabled={isProcessing}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste any text, application form, customer record, or notes here..."
              className="w-full bg-slate-50 dark:bg-[#080b12] border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y disabled:opacity-60"
            />

            {/* In-flight processing progress bar for pasted text */}
            {isProcessing && (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/40">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 text-[11px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />
                    {getStageDescription(progress)}
                  </span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-150 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {pastedText.length} characters • Selected: <strong>{selectedPurpose}</strong>
              </span>
              <button
                type="submit"
                disabled={!pastedText.trim() || isProcessing}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-40 shadow-md shadow-cyan-600/30"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Scan & Protect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Masking Mode Selector */}
      <div className="glass-card rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Choose How to Hide Information
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Select how sensitive details like PAN or Aadhaar will look in the clean document</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {maskingStrategies.map((strat) => (
            <button
              key={strat.id}
              type="button"
              onClick={() => setMaskingMode(strat.id)}
              className={`text-left p-3 rounded-xl border text-xs transition-all ${
                maskingMode === strat.id
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 shadow-sm shadow-cyan-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-xs flex items-center justify-between">
                <span>{strat.label}</span>
                {maskingMode === strat.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">{strat.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
