import React, { useState, useRef } from 'react';
import Dropzone from './Dropzone';
import SmartRedactionPanel from './SmartRedactionPanel';
import DocumentChatbot from './DocumentChatbot';
import RiskIndicator from './RiskIndicator';
import { Sparkles, Plus, X, SlidersHorizontal, Check, CheckCircle2, RefreshCw, Lock, Cpu, Eye, EyeOff, FileText, Bot, ShieldCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Layers } from 'lucide-react';

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
  const [rightTab, setRightTab] = useState('preview'); // 'preview', 'chat', 'risk'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customKeywords, setCustomKeywords] = useState([]);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [disabledEntityIds, setDisabledEntityIds] = useState([]);
  const [selectedPIIValues, setSelectedPIIValues] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const scrollContainerRef = useRef(null);

  const maskingStrategies = [
    { id: 'TOKEN', label: 'Descriptive Tag', desc: '[REDACTED_PAN: XXXXX1234X]' },
    { id: 'BLACKOUT', label: 'Blackout Box', desc: '████████████' },
    { id: 'HASH', label: 'Scrambled Code', desc: '[HASH_CODE: 7f83b1]' },
    { id: 'SYNTHETIC', label: 'Fake Data', desc: '[SAFE_PERSON_1]' }
  ];

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

  const handleToggleEntity = (entityId) => {
    let updatedDisabled;
    if (disabledEntityIds.includes(entityId)) {
      updatedDisabled = disabledEntityIds.filter((id) => id !== entityId);
    } else {
      updatedDisabled = [...disabledEntityIds, entityId];
    }
    setDisabledEntityIds(updatedDisabled);
    onApplyCustomRules(customKeywords, updatedDisabled, maskingMode);
  };

  // Resolve all preview pages (multi-page list or fallback to single page)
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

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Upload Zone (shown cleanly when no document is loaded) */}
      {!uploadResult ? (
        <div className="max-w-4xl mx-auto">
          <Dropzone
            onFileUpload={onFileUpload}
            onTextSubmit={onTextSubmit}
            isProcessing={isProcessing}
            maskingMode={maskingMode}
            setMaskingMode={setMaskingMode}
            purpose={purpose}
            setPurpose={setPurpose}
          />
        </div>
      ) : null}

      {/* When a document is loaded: Clean, Focused 2-Column Split Studio */}
      {uploadResult && (
        <div className="space-y-4">
          
          {/* Top Document Header Bar with Re-Upload Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                {uploadResult.filename}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Sharing For: <strong className="text-cyan-700 dark:text-cyan-300 font-semibold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700/50">{purpose || uploadResult.purpose || 'General Sharing'}</strong></span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>{(uploadResult.byte_size / 1024).toFixed(1)} KB</span>
              {uploadResult.page_count && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{uploadResult.page_count} Page{uploadResult.page_count > 1 ? 's' : ''}</span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                100% Private (Memory Only)
              </span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                Upload New File
              </button>
            </div>
          </div>

          {/* 2-Column Split Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Smart Redaction Panel & Action Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* 1. Masking Strategy Selector Card */}
              <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-cyan-950/20 via-slate-900/40 to-slate-900/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    Choose How to Hide Information
                  </span>
                  <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">Click to change masking style instantly</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {maskingStrategies.map((strat) => {
                    const isSelected = maskingMode === strat.id;
                    return (
                      <button
                        key={strat.id}
                        type="button"
                        onClick={() => setMaskingMode(strat.id)}
                        className={`text-left p-3 rounded-xl border text-xs transition-all relative ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-100 shadow-sm ring-1 ring-cyan-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{strat.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 truncate">{strat.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Primary Action: Smart Redaction Copilot Box */}
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

              {/* 3. Collapsible Advanced Tools (Custom Words, Entity Toggle, Risk) */}
              <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Add Custom Words & Secret Keywords to Hide</span>
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvanced && (
                  <div className="p-4 space-y-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs">
                    
                    {/* Add Custom Word Form */}
                    <form onSubmit={handleAddKeyword} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Hide custom word (e.g. Project Apollo, Secret)..."
                        value={newKeywordInput}
                        onChange={(e) => setNewKeywordInput(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        type="submit"
                        disabled={!newKeywordInput.trim()}
                        className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </form>

                    {/* Active Custom Word Chips */}
                    {customKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {customKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-xs font-semibold"
                          >
                            <span>{kw}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(kw)}
                              className="hover:text-rose-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Risk Indicator Inside Advanced */}
                    <div className="pt-2">
                      <RiskIndicator
                        riskAssessment={uploadResult.risk_assessment}
                        processingTimeMs={uploadResult.processing_time_ms}
                        sanitizationHash={uploadResult.sanitization_hash}
                        zeroLeakVerified={uploadResult.zero_leak_verified}
                      />
                    </div>

                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Visual PDF Preview & Chatbot Tabbed Workspace (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              
              {/* Workspace Navigation Tabs */}
              <div className="flex items-center space-x-1 bg-slate-200/70 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRightTab('preview')}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    rightTab === 'preview'
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>📄 Clean Document Preview ({totalPages} {totalPages > 1 ? 'Pages' : 'Page'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('chat')}
                  className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                    rightTab === 'chat'
                      ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>💬 Ask Questions</span>
                </button>
              </div>

              {/* Tab 1: Live Visual PDF Multi-Page Preview */}
              {rightTab === 'preview' && (
                <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 shadow-lg">
                  
                  {/* Top Bar with Page Navigator & Zoom Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium pb-1 border-b border-slate-200 dark:border-slate-800/80">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Clean Document Preview
                    </span>

                    <div className="flex items-center space-x-2">
                      {/* Page Jump / Prev Next Controls */}
                      {previewPages.length > 1 && (
                        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => scrollToPage(activePageIndex - 1)}
                            disabled={activePageIndex === 0}
                            title="Previous Page"
                            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-700 dark:text-slate-300"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                            {activePageIndex + 1} / {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => scrollToPage(activePageIndex + 1)}
                            disabled={activePageIndex === previewPages.length - 1}
                            title="Next Page"
                            className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors text-slate-700 dark:text-slate-300"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Zoom Controls */}
                      <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                          title="Zoom Out"
                          className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel(100)}
                          title="Reset Zoom (100%)"
                          className="px-1 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400 hover:text-cyan-500"
                        >
                          {zoomLevel}%
                        </button>
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
                          title="Zoom In"
                          className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Render High-Res PDF Multi-Page Scrollable Preview */}
                  {previewPages.length > 0 ? (
                    <div
                      ref={scrollContainerRef}
                      onScroll={handleContainerScroll}
                      className="rounded-xl overflow-y-auto max-h-[540px] p-3 space-y-4 bg-slate-100/70 dark:bg-[#07090f] border border-slate-200 dark:border-slate-800 shadow-inner"
                    >
                      {previewPages.map((imgSrc, idx) => (
                        <div
                          key={`preview_page_${idx}`}
                          id={`doc-page-${idx}`}
                          className="space-y-1.5 flex flex-col items-center"
                        >
                          {previewPages.length > 1 && (
                            <div className="flex items-center justify-between w-full px-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-mono">
                              <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs">
                                📄 Page {idx + 1} of {totalPages}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-sans">
                                <ShieldCheck className="w-3 h-3" /> Zero Leak Sanitized
                              </span>
                            </div>
                          )}
                          <div className="w-full flex items-center justify-center">
                            <img
                              src={imgSrc}
                              alt={`Masked Document Page ${idx + 1}`}
                              style={{ width: `${zoomLevel}%` }}
                              className="h-auto object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900 transition-all duration-150"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <FileText className="w-10 h-10 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        Preview will update when you hide sensitive items.
                      </p>
                    </div>
                  )}

                  {/* Quick Action in Preview */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Scroll to review all <strong>{totalPages}</strong> clean pages.
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
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Download Clean PDF ({totalPages} {totalPages > 1 ? 'Pages' : 'Page'})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Document-Restricted Chatbot */}
              {rightTab === 'chat' && (
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
