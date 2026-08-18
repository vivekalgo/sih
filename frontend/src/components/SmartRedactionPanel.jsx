import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, CheckSquare, Square, Download, Loader2, Info, ArrowRight, Eye, RefreshCw, FileText } from 'lucide-react';

const formatEntityLabel = (type) => {
  switch (type) {
    case 'AADHAAR': return 'Aadhaar UID';
    case 'AADHAAR_VID': return 'Aadhaar Virtual ID (VID)';
    case 'CREDIT_CARD': return 'Credit / Debit Card';
    case 'PAN': return 'PAN Card';
    case 'PHONE_NUMBER': return 'Phone Number';
    case 'DATE_OF_BIRTH': return 'Date of Birth';
    case 'EMAIL': return 'Email Address';
    case 'PASSPORT': return 'Passport Number';
    case 'DRIVING_LICENSE': return 'Driving License';
    case 'VOTER_ID': return 'Voter ID (EPIC)';
    case 'IFSC_CODE': return 'Bank IFSC Code';
    default: return type.replace(/_/g, ' ');
  }
};

export default function SmartRedactionPanel({
  detectedPII = [],
  purpose = 'General Sharing',
  onApplyRedaction,
  onSelectionChange,
  isRedacting = false,
  maskingMode = 'TOKEN',
  filename = 'document.pdf',
  isPdf = true
}) {
  // Set of selected string values to redact (auto-checks 'Not Required' items)
  const [selectedValues, setSelectedValues] = useState([]);

  // Auto-check all items where status is "Not Required" on load or when detectedPII changes
  useEffect(() => {
    if (detectedPII && detectedPII.length > 0) {
      const notReq = detectedPII.filter((item) => item.status === 'Not Required' && item.value).map((item) => item.value);
      // If none marked "Not Required", default-check all items so user gets protected document by default
      const autoChecked = notReq.length > 0 ? notReq : detectedPII.map((item) => item.value).filter(Boolean);
      setSelectedValues(autoChecked);
      if (onSelectionChange) onSelectionChange(autoChecked);
    } else {
      setSelectedValues([]);
      if (onSelectionChange) onSelectionChange([]);
    }
  }, [detectedPII]);

  const handleToggleValue = (val) => {
    if (!val) return;
    const updated = selectedValues.includes(val)
      ? selectedValues.filter((v) => v !== val)
      : [...selectedValues, val];
    setSelectedValues(updated);
    if (onSelectionChange) onSelectionChange(updated);
    if (onApplyRedaction) {
      onApplyRedaction(updated, maskingMode, false);
    }
  };

  const handleSelectAllNotRequired = () => {
    const notReq = detectedPII
      .filter((item) => item.status === 'Not Required' && item.value)
      .map((item) => item.value);
    setSelectedValues(notReq);
    if (onSelectionChange) onSelectionChange(notReq);
    if (onApplyRedaction) {
      onApplyRedaction(notReq, maskingMode, false);
    }
  };

  const handleSelectAll = () => {
    const all = detectedPII.map((item) => item.value).filter(Boolean);
    setSelectedValues(all);
    if (onSelectionChange) onSelectionChange(all);
    if (onApplyRedaction) {
      onApplyRedaction(all, maskingMode, false);
    }
  };

  const handleClearAll = () => {
    setSelectedValues([]);
    if (onSelectionChange) onSelectionChange([]);
    if (onApplyRedaction) {
      onApplyRedaction([], maskingMode, false);
    }
  };

  const handleApply = () => {
    if (onApplyRedaction) {
      onApplyRedaction(selectedValues, maskingMode, true);
    }
  };

  const getMaskPreviewLabel = (piiType) => {
    if (maskingMode === 'BLACKOUT') return '████████';
    if (maskingMode === 'HASH') return '[HASH_CODE]';
    if (maskingMode === 'SYNTHETIC') return `[SAFE_${piiType?.slice(0, 4) || 'DATA'}]`;
    return `[REDACTED_${piiType?.slice(0, 6) || 'PII'}]`;
  };

  if (!detectedPII || detectedPII.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2 shadow-sm">
        <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No Sensitive Identifiers Detected
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Verified that this document contains no unnecessary sensitive data for purpose: <strong>{purpose}</strong>.
        </p>
      </div>
    );
  }

  const notRequiredCount = detectedPII.filter((i) => i.status === 'Not Required').length;
  const requiredCount = detectedPII.filter((i) => i.status === 'Required').length;

  const modeLabels = {
    TOKEN: 'Descriptive Tag',
    BLACKOUT: 'Blackout Box',
    HASH: 'Scrambled Code',
    SYNTHETIC: 'Fake Data'
  };

  return (
    <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg space-y-0">
      
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border-b border-slate-200 dark:border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Privacy Recommendations
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span>Purpose: <strong className="text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">{purpose}</strong></span>
            <span>•</span>
            <span>Masking Style: <strong className="text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">{modeLabels[maskingMode] || maskingMode}</strong></span>
          </div>
        </div>

        {/* Action Button Right inside the header for instant 1-click access */}
        <button
          type="button"
          onClick={handleApply}
          disabled={isRedacting || selectedValues.length === 0}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-600/30 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isRedacting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Creating Clean File...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>⚡ Download Clean File ({selectedValues.length} hidden)</span>
            </>
          )}
        </button>
      </div>

      {/* Control Bar */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 font-medium">
          <span>Found <strong>{detectedPII.length}</strong> items • <span className="text-rose-600 dark:text-rose-400 font-semibold">{notRequiredCount} Recommended to Hide</span></span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleSelectAllNotRequired}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px] font-semibold text-cyan-600 dark:text-cyan-300 transition-colors shadow-sm"
          >
            Recommended ({notRequiredCount})
          </button>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
          >
            Hide All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px] font-semibold text-slate-500 dark:text-slate-400 transition-colors"
          >
            Show All
          </button>
        </div>
      </div>

      {/* Interactive Entity List */}
      <div className="p-3 sm:p-4 space-y-2 max-h-[380px] overflow-y-auto bg-slate-50/50 dark:bg-[#070a10]">
        {detectedPII.map((item, idx) => {
          const isSelected = selectedValues.includes(item.value);
          const isNotRequired = item.status === 'Not Required';

          return (
            <div
              key={`${item.value}_${idx}`}
              onClick={() => handleToggleValue(item.value)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start sm:items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60 shadow-sm'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Left: Checkbox, Badge, Value, Reason */}
              <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
                <button
                  type="button"
                  className="mt-0.5 sm:mt-0 flex-shrink-0 text-cyan-600 dark:text-cyan-400 focus:outline-none"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                  )}
                </button>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 font-mono">
                      {formatEntityLabel(item.pii_type)}
                    </span>

                    <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]" title={item.value}>
                      {item.value}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isNotRequired
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                          : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                      }`}
                    >
                      {isNotRequired ? (
                        <>
                          <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>Recommended to Hide</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Needed for {purpose}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Reason */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 leading-snug">
                    <Info className="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span>{item.reason}</span>
                  </p>
                </div>
              </div>

              {/* Right Action Hint & Mask Preview */}
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 text-xs font-semibold self-center flex-shrink-0">
                {isSelected ? (
                  <>
                    <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/50 font-mono">
                      {getMaskPreviewLabel(item.pii_type)}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30">
                      Hide
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    Keep Visible
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Bottom Bar with Prominent Button */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <strong>{selectedValues.length}</strong> sensitive details selected to hide in your clean document with <strong>{modeLabels[maskingMode] || maskingMode}</strong> style.
        </div>

        <button
          type="button"
          onClick={handleApply}
          disabled={isRedacting || selectedValues.length === 0}
          className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-cyan-600/30 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isRedacting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Creating Clean File...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>⚡ Download Clean File</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
