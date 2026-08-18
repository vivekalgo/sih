import React, { useState, useRef, useEffect } from 'react';
import StepProgress from './StepProgress';
import SmartRedactionPanel from './SmartRedactionPanel';
import DocumentChatbot from './DocumentChatbot';
import RiskIndicator from './RiskIndicator';
import { 
  Sparkles, 
  Plus, 
  X, 
  Check, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  FileText, 
  Bot, 
  ShieldCheck, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  ArrowRight, 
  ArrowLeft, 
  UploadCloud, 
  FileCode, 
  RotateCcw, 
  SlidersHorizontal,
  Landmark,
  Briefcase,
  Home,
  Globe,
  HeartPulse,
  Scale,
  Loader2,
  FileCheck2
} from 'lucide-react';

export default function DocumentStudio({
  uploadResult,
  uploadedFile,
  isProcessing,
  isRedacting,
  maskingMode,
  setMaskingMode,
  purpose,
  setPurpose,
  onFileUpload,
  onTextSubmit,
  onApplyCustomRules,
  onApplySmartRedaction
}) {
  // Stepper State: 1 = Purpose, 2 = Upload, 3 = Masking Options, 4 = Final Output
  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);

  const [activeUploadTab, setActiveUploadTab] = useState('file'); // 'file' or 'paste'
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Preview / Chat / Risk Tabs inside Step 4
  const [outputTab, setOutputTab] = useState('preview'); // 'preview', 'chat', 'risk'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customKeywords, setCustomKeywords] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [disabledEntityIds, setDisabledEntityIds] = useState([]);
  const [selectedPIIValues, setSelectedPIIValues] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const scrollContainerRef = useRef(null);

  // Scanning progress simulation
  const [scanProgress, setScanProgress] = useState(0);

  // Purpose options for Step 1
  const purposeOptions = [
    {
      id: 'General Sharing',
      label: 'General Sharing',
      icon: Globe,
      desc: 'Public or vendor sharing',
      detail: 'Hides all Aadhaar, PAN, SSN, phone numbers, and financial details for maximum privacy.'
    },
    {
      id: 'Bank KYC',
      label: 'Bank KYC',
      icon: Landmark,
      desc: 'Account opening & verification',
      detail: 'Keeps name and verified ID types required for KYC, but masks secret numbers & passwords.'
    },
    {
      id: 'Job Application',
      label: 'Job Application',
      icon: Briefcase,
      desc: 'Resume & hiring submission',
      detail: 'Hides Aadhaar, PAN, salary history, home address, and financial records from recruiters.'
    },
    {
      id: 'House Rent',
      label: 'House Rent',
      icon: Home,
      desc: 'Tenant & lease agreement',
      detail: 'Hides credit cards, bank account details, and private identifiers while keeping essential ID.'
    },
    {
      id: 'Medical Records',
      label: 'Medical & Healthcare',
      icon: HeartPulse,
      desc: 'Insurance claims & health consultations',
      detail: 'Masks patient Aadhaar/SSN, full residential address, and confidential diagnostic tags.'
    },
    {
      id: 'Legal & Property',
      label: 'Legal & Property',
      icon: Scale,
      desc: 'Affidavits & property registry',
      detail: 'Redacts sensitive personal account credentials, signature images, and private mobile numbers.'
    }
  ];

  // Masking Strategies for Step 3
  const maskingStrategies = [
    { 
      id: 'TOKEN', 
      label: 'Descriptive Tag', 
      desc: '[REDACTED_PAN: XXXXX1234X]',
      info: 'Clean replacement tags preserving document readability'
    },
    { 
      id: 'BLACKOUT', 
      label: 'Blackout Box', 
      desc: '████████████',
      info: 'Solid black redaction boxes covering sensitive regions'
    },
    { 
      id: 'HASH', 
      label: 'Scrambled Code', 
      desc: '[HASH_CODE: 7f83b1]',
      info: 'Cryptographic salted token preventing identity tracing'
    },
    { 
      id: 'SYNTHETIC', 
      label: 'Fake Data', 
      desc: '[SAFE_PERSON_1]',
      info: 'Realistic synthetic placeholder for AI prompt privacy'
    }
  ];

  // Sync steps when uploadResult arrives
  useEffect(() => {
    if (uploadResult) {
      if (currentStep < 3) {
        setCurrentStep(3);
      }
      setMaxUnlockedStep(4);
    }
  }, [uploadResult]);

  // Smooth realistic progress animation during upload/scan
  useEffect(() => {
    let interval = null;
    if (isProcessing) {
      setScanProgress(15);
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev < 40) return prev + Math.floor(Math.random() * 6 + 3);
          if (prev < 70) return prev + Math.floor(Math.random() * 4 + 2);
          if (prev < 90) return prev + Math.floor(Math.random() * 2 + 1);
          if (prev < 97) return prev + 1;
          return prev;
        });
      }, 75);
    } else {
      setScanProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  // Custom keywords handlers
  const handleAddKeyword = (e) => {
    e.preventDefault();
    const clean = newKeywordInput.trim();
    if (!clean || customKeywords.includes(clean)) return;

    const updatedKeywords = [...customKeywords, clean];
    setCustomKeywords(updatedKeywords);
    setNewKeywordInput('');
    if (uploadResult) {
      onApplyCustomRules(updatedKeywords, disabledEntityIds, maskingMode);
    }
  };

  const handleRemoveKeyword = (kw) => {
    const updatedKeywords = customKeywords.filter((k) => k !== kw);
    setCustomKeywords(updatedKeywords);
    if (uploadResult) {
      onApplyCustomRules(updatedKeywords, disabledEntityIds, maskingMode);
    }
  };

  // Drag & drop handlers for Step 2
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
      onFileUpload(file, maskingMode, purpose);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileUpload(file, maskingMode, purpose);
    }
  };

  const handlePastedSubmit = (e) => {
    e.preventDefault();
    if (!pastedText.trim() || isProcessing) return;
    onTextSubmit(pastedText, maskingMode, purpose);
  };

  // Sample demo document loader
  const handleLoadSample = () => {
    const sampleText = `VERIFICATION & KYC DETAILS
Applicant Name: Rahul Sharma
Father Name: Suresh Sharma
PAN Card: ABCDE1234F
Aadhaar Number: 5432 9876 1234
Date of Birth: 14-08-1992
Mobile Phone: +91 9876543210
Email Address: rahul.sharma@example.in
Current Address: Flat 402, Green Valley Apartments, Indiranagar, Bengaluru, 560038
Bank Account: 50100234567890 (HDFC Bank, IFSC: HDFC0000128)
Monthly Salary: INR 1,25,000 / month
Confidential Note: Cleared background verification for rental lease.`;

    onTextSubmit(sampleText, maskingMode, purpose);
  };

  // Step 3 to Step 4 action: Apply Redaction and advance
  const handleGenerateFinalOutput = () => {
    const targets = selectedPIIValues && selectedPIIValues.length > 0
      ? selectedPIIValues
      : (uploadResult?.detected_pii?.map(i => i.value).filter(Boolean) || []);
    
    onApplySmartRedaction(targets, maskingMode, false);
    setCurrentStep(4);
  };

  // Resolve all preview pages
  const previewPages = (uploadResult?.preview_images && uploadResult.preview_images.length > 0)
    ? uploadResult.preview_images
    : (uploadResult?.preview_image ? [uploadResult.preview_image] : []);

  const totalPages = previewPages.length || uploadResult?.page_count || 1;

  const scrollToPage = (pageIdx) => {
    if (pageIdx < 0 || pageIdx >= previewPages.length) return;
    setActivePageIndex(pageIdx);
    const target = document.getElementById(`doc-page-${pageIdx}`);
    if (target && scrollContainerRef.current) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleContainerScroll = () => {
    if (!scrollContainerRef.current || previewPages.length <= 1) return;
    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const itemHeight = container.scrollHeight / previewPages.length;
    const currentIdx = Math.min(previewPages.length - 1, Math.max(0, Math.floor((scrollTop + 100) / itemHeight)));
    if (currentIdx !== activePageIndex) {
      setActivePageIndex(currentIdx);
    }
  };

  const handleStartOver = () => {
    window.location.reload();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2 sm:space-y-3.5 animate-fade-in max-w-6xl mx-auto w-full overflow-hidden">
      
      {/* 1. TOP PROCESS STEPPER BAR (Fixed at top) */}
      <div className="flex-shrink-0">
        <StepProgress
          currentStep={currentStep}
          maxUnlockedStep={maxUnlockedStep}
          onStepClick={(stepId) => setCurrentStep(stepId)}
        />
      </div>

      {/* =========================================================================
          STEP 1: SELECT PURPOSE / USE CASE
          ========================================================================= */}
      {currentStep === 1 && (
        <div className="glass-card rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white/95 dark:bg-[#0b0f19]/90 overflow-hidden flex flex-col flex-1 min-h-0 animate-fade-in">
          
          {/* Step Header (Fixed at top of card) */}
          <div className="flex-shrink-0 p-3 sm:p-4 pb-2 sm:pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-0.5">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[10px] sm:text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>Step 1: Intelligent Privacy Engine</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Tailored for Global & Indian PII Regulations
              </span>
            </div>
            <h2 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Why are you sharing this document?
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              Select your use case. We automatically customize what data is safe to keep.
            </p>
          </div>

          {/* Scrollable Purpose Grid Container (Middle flex area - Only this scrolls!) */}
          <div className="flex-1 min-h-0 p-2.5 sm:p-4 overflow-y-auto space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
              {purposeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = (purpose || 'General Sharing') === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => setPurpose(opt.id)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left cursor-pointer transition-all duration-150 relative flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-50 to-blue-50/80 dark:from-cyan-950/70 dark:to-slate-900 border-cyan-500 text-slate-900 dark:text-white shadow-sm ring-2 ring-cyan-500/40'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-cyan-500'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        {isSelected ? (
                          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-600 text-white text-[9px] font-bold">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>Selected</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium group-hover:text-cyan-500 transition-colors">
                            Select
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {opt.label}
                        </h3>
                        <p className="text-[10px] font-medium text-cyan-700 dark:text-cyan-300">
                          {opt.desc}
                        </p>
                      </div>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {opt.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DOCKED BOTTOM ACTION BAR (Directly inside card layout - Always 100% visible on screen!) */}
          <div className="flex-shrink-0 p-3 sm:p-3.5 bg-slate-50/95 dark:bg-[#0c101a]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 hidden sm:flex items-center gap-1.5">
              <span>Selected Purpose:</span>
              <strong className="text-cyan-600 dark:text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-700/50">
                {purpose || 'General Sharing'}
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-full sm:w-auto ml-auto px-6 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-600/25 flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <span>Next: Upload Document</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* =========================================================================
          STEP 2: UPLOAD DOCUMENT / TEXT
          ========================================================================= */}
      {currentStep === 2 && (
        <div className="glass-card rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white/95 dark:bg-[#0b0f19]/90 overflow-hidden flex flex-col flex-1 min-h-0 animate-fade-in max-w-4xl mx-auto w-full">
          
          {/* Step Header */}
          <div className="flex-shrink-0 p-3 sm:p-4 pb-2 sm:pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Step 2: Ingestion</span>
              <h2 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white">
                Upload or Paste Document
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Lock className="w-3 h-3" />
                100% Device-Only (RAM)
              </span>
            </div>
          </div>

          {/* Upload Area Scroll Container */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-3">
            
            {/* Mode Switcher */}
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit shadow-sm">
              <button
                type="button"
                onClick={() => setActiveUploadTab('file')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeUploadTab === 'file'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveUploadTab('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  activeUploadTab === 'paste'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Paste Text</span>
              </button>
            </div>

            {/* Dropzone File Box */}
            {activeUploadTab === 'file' && (
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center cursor-pointer transition-all duration-150 relative group ${
                  isDragOver
                    ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30'
                    : 'border-slate-300 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-900/40 hover:border-cyan-500/70 hover:bg-cyan-50/20'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  className="hidden"
                  disabled={isProcessing}
                />

                <div className="space-y-2 max-w-sm mx-auto">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {isProcessing ? 'Scanning & Detecting PII...' : 'Tap or drop your document here'}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                      PDF, PNG, JPG, JPEG or TXT
                    </p>
                  </div>

                  {isProcessing && (
                    <div className="space-y-1 pt-1 max-w-xs mx-auto">
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-200 rounded-full"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                        Scanning: {scanProgress}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paste Box */}
            {activeUploadTab === 'paste' && (
              <form onSubmit={handlePastedSubmit} className="space-y-2">
                <textarea
                  rows={4}
                  placeholder="Paste text containing Aadhaar, PAN, SSN, phone numbers, or credit card details here..."
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={!pastedText.trim() || isProcessing}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-1.5 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Scan & Redact Pasted Text</span>
                </button>
              </form>
            )}

            {/* Demo Sample Quick Action */}
            <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[10.5px] sm:text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center sm:text-left">
              <span>Don't have a document handy?</span>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline"
              >
                ⚡ Test with Sample ID Proof
              </button>
            </div>

          </div>

          {/* DOCKED BOTTOM ACTION BAR */}
          <div className="flex-shrink-0 p-3 sm:p-3.5 bg-slate-50/95 dark:bg-[#0c101a]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              Step 2 of 4: Select document to proceed
            </span>
          </div>

        </div>
      )}

      {/* =========================================================================
          STEP 3: CHOOSE REDACTION & MASKING OPTIONS
          ========================================================================= */}
      {currentStep === 3 && uploadResult && (
        <div className="glass-card rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl bg-white/95 dark:bg-[#0b0f19]/90 overflow-hidden flex flex-col flex-1 min-h-0 animate-fade-in max-w-5xl mx-auto w-full">
          
          {/* Step Header */}
          <div className="flex-shrink-0 p-3 sm:p-4 pb-2 sm:pb-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Step 3: Redaction Strategy</span>
              <h2 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                <span className="truncate">{uploadResult.filename}</span>
              </h2>
            </div>

            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-700/50 w-fit">
              Policy: {purpose || 'General Sharing'}
            </span>
          </div>

          {/* Masking Options Scroll Container */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-3">
            
            {/* 1. Masking Strategy Selector */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                Choose How to Hide Information
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {maskingStrategies.map((strat) => {
                  const isSelected = maskingMode === strat.id;
                  return (
                    <button
                      key={strat.id}
                      type="button"
                      onClick={() => {
                        setMaskingMode(strat.id);
                        if (uploadResult) {
                          const notReqStrings = uploadResult.detected_pii
                            ? uploadResult.detected_pii.filter(i => i.status === 'Not Required').map(i => i.value)
                            : [];
                          onApplySmartRedaction(notReqStrings, strat.id, false);
                        }
                      }}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/70 text-cyan-950 dark:text-cyan-100 shadow-xs ring-1 ring-cyan-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[11px] flex items-center justify-between mb-0.5">
                          <span>{strat.label}</span>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
                        </div>
                        <div className="text-[9.5px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold bg-white/70 dark:bg-black/40 px-1 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60 truncate">
                          {strat.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Detected PII List */}
            <SmartRedactionPanel
              detectedPII={uploadResult.detected_pii || []}
              purpose={purpose || uploadResult.purpose || 'General Sharing'}
              onApplyRedaction={onApplySmartRedaction}
              onSelectionChange={(vals) => setSelectedPIIValues(vals)}
              isRedacting={isRedacting}
              maskingMode={maskingMode}
              filename={uploadResult.filename}
              isPdf={uploadResult.is_pdf || uploadResult.format === 'PDF' || (uploadResult.filename && uploadResult.filename.toLowerCase().endsWith('.pdf'))}
            />

            {/* 3. Custom Keywords */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-white dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300"
              >
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <span>Add Custom Secret Words / Phrases</span>
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400">
                  {showAdvanced ? 'Hide ▲' : 'Add ▼'}
                </span>
              </button>

              {showAdvanced && (
                <div className="p-3 space-y-2.5 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <form onSubmit={handleAddKeyword} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Type custom secret word (e.g. Project Apollo)..."
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={!newKeywordInput.trim()}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </form>

                  {customKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {customKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-[11px] font-semibold"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="hover:text-rose-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* DOCKED BOTTOM ACTION BAR */}
          <div className="flex-shrink-0 p-3 sm:p-3.5 bg-slate-50/95 dark:bg-[#0c101a]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateFinalOutput}
              disabled={isRedacting}
              className="px-5 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-600/25 flex items-center justify-center space-x-1.5 transition-all active:scale-95"
            >
              {isRedacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              <span>Generate Clean Document</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

      {/* =========================================================================
          STEP 4: FINAL CLEAN OUTPUT & DOWNLOAD
          ========================================================================= */}
      {currentStep === 4 && uploadResult && (
        <div className="flex-1 min-h-0 flex flex-col space-y-2 sm:space-y-3 animate-fade-in overflow-hidden">
          
          {/* Top Document Header Bar */}
          <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                <FileCheck2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="truncate">{uploadResult.filename}</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>For: <strong className="text-cyan-700 dark:text-cyan-300 font-semibold">{purpose || uploadResult.purpose || 'General Sharing'}</strong></span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Style: <strong className="text-cyan-700 dark:text-cyan-300 font-semibold">{maskingMode}</strong></span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors flex items-center space-x-1"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Tweak</span>
              </button>

              <button
                type="button"
                onClick={handleStartOver}
                className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Start Over</span>
              </button>
            </div>
          </div>

          {/* 2-Column Split Workspace */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto">
            
            {/* Left Column: Multi-page Visual Document Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="glass-card rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 space-y-2 shadow-md bg-white dark:bg-slate-900/80">
                
                {/* Header with Page Jump & Zoom Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium pb-1.5 border-b border-slate-200 dark:border-slate-800/80">
                  <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Clean Preview ({totalPages} {totalPages > 1 ? 'Pages' : 'Page'})
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {previewPages.length > 1 && (
                      <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => scrollToPage(activePageIndex - 1)}
                          disabled={activePageIndex === 0}
                          className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-700 dark:text-slate-300"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <span className="px-1.5 text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">
                          {activePageIndex + 1} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => scrollToPage(activePageIndex + 1)}
                          disabled={activePageIndex === previewPages.length - 1}
                          className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors text-slate-700 dark:text-slate-300"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                        className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        <ZoomOut className="w-3 h-3" />
                      </button>
                      <span className="px-1 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {zoomLevel}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
                        className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                      >
                        <ZoomIn className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Render High-Res Visual Document */}
                {previewPages.length > 0 ? (
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleContainerScroll}
                    className="rounded-xl overflow-y-auto max-h-[380px] p-2 space-y-2.5 bg-slate-100/70 dark:bg-[#07090f] border border-slate-200 dark:border-slate-800 shadow-inner"
                  >
                    {previewPages.map((imgSrc, idx) => (
                      <div
                        key={`preview_page_${idx}`}
                        id={`doc-page-${idx}`}
                        className="space-y-1 flex flex-col items-center"
                      >
                        {previewPages.length > 1 && (
                          <div className="flex items-center justify-between w-full px-1 text-[9px] text-slate-500 dark:text-slate-400 font-semibold font-mono">
                            <span className="px-1.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs">
                              📄 Page {idx + 1} of {totalPages}
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans font-bold">
                              <ShieldCheck className="w-3 h-3" /> Zero Leak Verified
                            </span>
                          </div>
                        )}
                        <div className="w-full flex items-center justify-center">
                          <img
                            src={imgSrc}
                            alt={`Masked Document Page ${idx + 1}`}
                            style={{ width: `${zoomLevel}%` }}
                            className="h-auto object-contain rounded-lg shadow-sm border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900 transition-all duration-150"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-[350px] overflow-y-auto">
                    {uploadResult.masked_text || 'No preview available.'}
                  </div>
                )}

                {/* Primary Download Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-500">
                    Surgically redacted with style <strong>{maskingMode}</strong>.
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const targets = selectedPIIValues && selectedPIIValues.length > 0
                        ? selectedPIIValues
                        : (uploadResult.detected_pii?.map(i => i.value).filter(Boolean) || []);
                      onApplySmartRedaction(targets, maskingMode, true);
                    }}
                    disabled={isRedacting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Clean Document</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Right Column: AI Assistant & Security Verification (5 cols) */}
            <div className="lg:col-span-5 space-y-2.5">
              
              <div className="flex items-center space-x-1 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOutputTab('preview')}
                  className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    outputTab === 'preview'
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Security Badge</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputTab('chat')}
                  className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    outputTab === 'chat'
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Ask Copilot</span>
                </button>
              </div>

              {outputTab === 'preview' && (
                <div className="space-y-2">
                  <RiskIndicator
                    riskAssessment={uploadResult.risk_assessment}
                    processingTimeMs={uploadResult.processing_time_ms}
                    sanitizationHash={uploadResult.sanitization_hash}
                    zeroLeakVerified={uploadResult.zero_leak_verified}
                  />

                  <div className="glass-card rounded-2xl p-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      Sanitization Summary
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[10.5px]">
                      Total <strong>{uploadResult.detected_pii?.length || 0}</strong> sensitive identifiers detected. Applied <strong>{maskingMode}</strong> masking in memory with 0ms disk retention.
                    </p>
                  </div>
                </div>
              )}

              {outputTab === 'chat' && (
                <DocumentChatbot
                  hasDocument={!!uploadResult}
                  filename={uploadResult.filename}
                  uploadedFile={uploadedFile}
                />
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
