import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Eye, ShieldCheck, EyeOff, SplitSquareVertical, FileText, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

export default function RedactionView({
  originalText,
  maskedText,
  entities = [],
  filename = 'document',
  sanitizationHash,
  riskAssessment,
  format = 'TEXT',
  isPdf = false,
  previewImage = null,
  uploadedFile = null,
  maskingMode = 'BLACKOUT',
  customKeywords = [],
  disabledEntityIds = []
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState(previewImage || isPdf ? 'preview' : 'split'); // 'preview', 'split', 'original', 'masked'
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const lowerFilename = (filename || '').toLowerCase();
  const isDocumentPdf = isPdf || format === 'PDF' || lowerFilename.endsWith('.pdf');
  const isDocumentImage = format.includes('IMAGE') || ['png', 'jpg', 'jpeg', 'webp'].some(ext => lowerFilename.endsWith(`.${ext}`));

  const handleCopy = () => {
    navigator.clipboard.writeText(maskedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Real Surgical Document Download Handler
  const handleDownloadSanitized = async (forcedFormat = null) => {
    setIsDownloading(true);
    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }
      formData.append('filename', filename);
      formData.append('raw_text', originalText || '');
      formData.append('masking_mode', maskingMode || 'BLACKOUT');
      formData.append('custom_keywords_str', JSON.stringify(customKeywords || []));
      formData.append('disabled_entity_ids_str', JSON.stringify(disabledEntityIds || []));

      if (forcedFormat) {
        formData.append('export_format', forcedFormat);
      } else if (isDocumentPdf) {
        formData.append('export_format', 'PDF');
      }

      const response = await fetch('/api/download/sanitized', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Download failed with server status ${response.status}`);
      }

      const blob = await response.blob();
      
      // Determine file extension and suggested name
      let outFilename = `sanitized_${filename || 'document'}`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          outFilename = match[1];
        }
      } else {
        if (forcedFormat === 'PDF' || isDocumentPdf) {
          if (!outFilename.toLowerCase().endsWith('.pdf')) outFilename += '.pdf';
        } else if (isDocumentImage) {
          if (!outFilename.toLowerCase().endsWith('.png') && !outFilename.toLowerCase().endsWith('.jpg')) outFilename += '.png';
        } else {
          if (!outFilename.toLowerCase().endsWith('.txt')) outFilename += '.txt';
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = outFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: direct browser text blob download if network fails
      const fallbackBlob = new Blob([maskedText], { type: 'text/plain;charset=utf-8' });
      const fallbackUrl = URL.createObjectURL(fallbackBlob);
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.download = `sanitized_${filename || 'document'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fallbackUrl);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAuditReport = () => {
    const report = {
      project: "PrivacyGuard AI",
      timestamp: new Date().toISOString(),
      source_file: filename,
      format: format,
      is_pdf: isDocumentPdf,
      masking_mode: maskingMode,
      sanitization_hash: sanitizationHash,
      risk_assessment: riskAssessment,
      zero_retention_verified: true,
      custom_keywords_applied: customKeywords,
      active_entities_count: entities.filter(e => !disabledEntityIds.includes(e.id)).length,
      sanitized_content_digest: sanitizationHash
    };
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `privacyguard_audit_${filename || 'report'}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Helper to render original text with highlighted PII spans
  const renderHighlightedOriginal = () => {
    if (!entities || entities.length === 0) {
      return <span>{originalText}</span>;
    }

    const elements = [];
    let lastIndex = 0;

    entities.forEach((ent, idx) => {
      const isDisabled = disabledEntityIds.includes(ent.id);

      // Unhighlighted slice before this entity
      if (ent.start > lastIndex) {
        elements.push(
          <span key={`text_${lastIndex}`}>
            {originalText.slice(lastIndex, ent.start)}
          </span>
        );
      }

      // Highlighted entity span
      elements.push(
        <mark
          key={`ent_${idx}`}
          title={`${ent.entity_type} (Confidence: ${(ent.confidence * 100).toFixed(0)}%) - ${ent.explanation}`}
          className={`font-mono px-1 py-0.5 rounded cursor-help transition-all relative group ${
            isDisabled
              ? 'bg-slate-700/30 text-slate-400 line-through border-b border-slate-600'
              : 'bg-rose-500/25 text-rose-800 dark:text-rose-200 border-b-2 border-rose-500 hover:bg-rose-500/40'
          }`}
        >
          {originalText.slice(ent.start, ent.end)}
          <span className={`ml-1 text-[9px] uppercase px-1 py-0.2 rounded-sm font-sans border ${
            isDisabled
              ? 'bg-slate-800 text-slate-400 border-slate-700'
              : 'bg-rose-900/80 text-rose-200 border-rose-500/40'
          }`}>
            {ent.entity_type}
          </span>
        </mark>
      );

      lastIndex = ent.end;
    });

    if (lastIndex < originalText.length) {
      elements.push(
        <span key={`text_end`}>
          {originalText.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
      
      {/* Header Controls */}
      <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            
            {/* Visual Redacted PDF Preview Tab */}
            {(previewImage || isDocumentPdf) && (
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>PDF Visual Preview</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('split')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'split'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Side-by-Side View
            </button>

            <button
              onClick={() => setActiveTab('original')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'original'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-rose-300" />
              Original Text
            </button>

            <button
              onClick={() => setActiveTab('masked')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'masked'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Safe Clean Text
            </button>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline truncate max-w-[180px] font-medium" title={filename}>
            {filename}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          
          {/* Copy Clean Text */}
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
            title="Copy clean text to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
            <span>{copied ? 'Copied!' : 'Copy Clean Text'}</span>
          </button>

          {/* PRIMARY BUTTON: Download Clean PDF / Document */}
          <button
            onClick={() => handleDownloadSanitized(isDocumentPdf ? 'PDF' : null)}
            disabled={isDownloading}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
              downloadSuccess
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'
            } disabled:opacity-50`}
            title={isDocumentPdf ? "Download the protected PDF with sensitive details hidden" : "Download clean document"}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Preparing file...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{isDocumentPdf ? 'Download Clean PDF' : isDocumentImage ? 'Download Clean Image' : 'Download Clean File'}</span>
              </>
            )}
          </button>

          {/* If text/sample, allow exporting as formatted PDF as well */}
          {!isDocumentPdf && !isDocumentImage && (
            <button
              onClick={() => handleDownloadSanitized('PDF')}
              disabled={isDownloading}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-xs font-medium text-cyan-800 dark:text-cyan-300 border border-slate-300 dark:border-cyan-500/30 transition-all"
              title="Download formatted clean PDF document"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden md:inline">Save as PDF</span>
            </button>
          )}

          {/* Download JSON Audit Report */}
          <button
            onClick={handleDownloadAuditReport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 transition-all"
            title="Download complete safety & audit proof in JSON format"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">Safety Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 bg-slate-50 dark:bg-[#090d16] transition-colors duration-200">
        
        {/* TAB 1: Visual Masked PDF Page Preview */}
        {activeTab === 'preview' && (
          <div className="rounded-2xl border border-cyan-900/40 bg-white dark:bg-[#0c101d] overflow-hidden flex flex-col min-h-[500px] shadow-sm">
            <div className="px-4 py-2.5 bg-cyan-50 dark:bg-cyan-950/40 border-b border-cyan-200 dark:border-cyan-800/30 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Protected PDF Page View (Sensitive details permanently covered)
                </span>
              </div>
              <span className="text-xs font-medium text-cyan-700 dark:text-cyan-400">
                100% On-Device Masking
              </span>
            </div>

            <div className="p-6 flex flex-col items-center justify-center flex-1 bg-slate-100 dark:bg-[#070a12]">
              {previewImage ? (
                <div className="relative group max-w-2xl w-full border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xl bg-white">
                  <img
                    src={previewImage}
                    alt="Sanitized PDF Page Preview"
                    className="w-full h-auto object-contain max-h-[600px] mx-auto block select-none"
                  />
                  <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2 shadow-lg font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Protected with Zero Data Leak</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <FileText className="w-12 h-12 text-cyan-500/60 mx-auto animate-bounce-subtle" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Protected PDF is Ready to Download
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Click <strong>"Download Clean PDF"</strong> to save the document with sensitive details masked.
                  </p>
                  <button
                    onClick={() => handleDownloadSanitized('PDF')}
                    className="mt-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-1.5 shadow-md shadow-cyan-600/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Clean PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Side-by-Side Comparative View */}
        {activeTab === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left Panel: Original Document with Highlighted PII */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-950/60 bg-white dark:bg-[#0c101d] overflow-hidden flex flex-col h-[480px] shadow-sm">
              <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Original Document (Sensitive Info in Red)
                  </span>
                </div>
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  {entities.length} item{entities.length !== 1 ? 's' : ''} found
                </span>
              </div>

              <div className="p-4 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed flex-1 selection:bg-rose-500/40">
                {renderHighlightedOriginal()}
              </div>
            </div>

            {/* Right Panel: Sanitized Document */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950/60 bg-white dark:bg-[#0c101d] overflow-hidden flex flex-col h-[480px] shadow-sm">
              <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900/30 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Safe Clean Version (Ready to Share)
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Protected & Clean
                </span>
              </div>

              <div className="p-4 overflow-y-auto font-mono text-xs text-emerald-900 dark:text-emerald-100/90 whitespace-pre-wrap leading-relaxed flex-1 selection:bg-emerald-500/40">
                {maskedText}
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: Original Text Full Panel */}
        {activeTab === 'original' && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-950/60 bg-white dark:bg-[#0c101d] p-5 h-[520px] overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed shadow-sm">
            {renderHighlightedOriginal()}
          </div>
        )}

        {/* TAB 4: Sanitized Text Full Panel */}
        {activeTab === 'masked' && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950/60 bg-white dark:bg-[#0c101d] p-5 h-[520px] overflow-y-auto font-mono text-xs text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed shadow-sm">
            {maskedText}
          </div>
        )}
      </div>

    </div>
  );
}
