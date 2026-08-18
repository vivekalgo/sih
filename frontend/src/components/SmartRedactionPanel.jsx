import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Info, 
  Check
} from 'lucide-react';

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

  const getMaskPreviewLabel = (piiType) => {
    if (maskingMode === 'BLACKOUT') return '████████';
    if (maskingMode === 'HASH') return '[HASH_CODE]';
    if (maskingMode === 'SYNTHETIC') return `[SAFE_${piiType?.slice(0, 4) || 'DATA'}]`;
    return `[REDACTED_${piiType?.slice(0, 6) || 'PII'}]`;
  };

  if (!detectedPII || detectedPII.length === 0) {
    return (
      <div className="rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 text-center space-y-1.5 bg-slate-50/70 dark:bg-slate-900/50">
        <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto" />
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          No Sensitive Identifiers Detected
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          This document is safe to share as-is for purpose: <strong>{purpose}</strong>.
        </p>
      </div>
    );
  }

  const notRequiredCount = detectedPII.filter((i) => i.status === 'Not Required').length;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-white dark:bg-slate-900/70 space-y-0">
      
      {/* Clean Control Bar */}
      <div className="p-3 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Found <strong>{detectedPII.length}</strong> items</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-rose-600 dark:text-rose-400 font-bold">{selectedValues.length} Hidden</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handleSelectAllNotRequired}
            className="px-2 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/70 hover:bg-cyan-100 dark:hover:bg-cyan-900 border border-cyan-300 dark:border-cyan-700/60 text-[10px] sm:text-[11px] font-bold text-cyan-700 dark:text-cyan-300 transition-colors"
          >
            ✨ Recommended ({notRequiredCount})
          </button>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors"
          >
            Hide All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 transition-colors"
          >
            Keep All
          </button>
        </div>
      </div>

      {/* Compact Interactive Entity List */}
      <div className="p-2 sm:p-3 space-y-1.5 max-h-[280px] overflow-y-auto bg-slate-50/40 dark:bg-[#070a10]">
        {detectedPII.map((item, idx) => {
          const isSelected = selectedValues.includes(item.value);
          const isNotRequired = item.status === 'Not Required';

          return (
            <div
              key={`${item.value}_${idx}`}
              onClick={() => handleToggleValue(item.value)}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300/80 dark:border-rose-800/60'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Left: Checkbox + Type Badge + Raw Value */}
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div className="flex-shrink-0 text-cyan-600 dark:text-cyan-400">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[9.5px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 font-mono flex-shrink-0">
                    {formatEntityLabel(item.pii_type)}
                  </span>

                  <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[170px] sm:max-w-[260px]" title={item.value}>
                    {item.value}
                  </span>
                </div>
              </div>

              {/* Right: Hide Status Badge */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isSelected ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/50 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    <span>Hide ({getMaskPreviewLabel(item.pii_type)})</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Keep Visible
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
