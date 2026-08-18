import React, { useState } from 'react';
import Navbar from './components/Navbar';
import DocumentStudio from './components/DocumentStudio';
import DocumentChatbot from './components/DocumentChatbot';
import RAGSandbox from './components/RAGSandbox';
import ComplianceView from './components/ComplianceView';
import LLMFirewallSimulator from './components/LLMFirewallSimulator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ZeroRetentionModal from './components/ZeroRetentionModal';
import FloatingChatWidget from './components/FloatingChatWidget';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio', 'chat', 'compliance', 'firewall', 'analytics'
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [maskingMode, setMaskingMode] = useState('TOKEN');
  const [purpose, setPurpose] = useState('General Sharing');
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isZeroModalOpen, setIsZeroModalOpen] = useState(false);
  const [purgeToast, setPurgeToast] = useState(null);

  // Theme Management (Dark / Light) with persistence
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('privacyguard_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  React.useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
      localStorage.setItem('privacyguard_theme', theme);
    } catch (e) {
      console.error('Theme sync error:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Upload handler for real files (PDF / Image / TXT)
  const handleFileUpload = async (file, currentMaskMode = maskingMode, currentPurpose = purpose) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setUploadedFile(file);

    const modeToUse = currentMaskMode || maskingMode || 'TOKEN';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('masking_mode', modeToUse);
    formData.append('purpose', currentPurpose);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed with status code ${response.status}`);
      }

      const data = await response.json();
      setUploadResult(data);
      if (data.masking_mode) {
        setMaskingMode(data.masking_mode);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Failed to process document locally.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct text paste handler
  const handleTextSubmit = async (rawText, currentMaskMode = maskingMode, currentPurpose = purpose) => {
    const blob = new Blob([rawText], { type: 'text/plain' });
    const file = new File([blob], 'custom_pasted_text.txt', { type: 'text/plain' });
    await handleFileUpload(file, currentMaskMode, currentPurpose);
  };

  // Smart Redaction Handler (called when user clicks "Apply Redaction" or switches mode)
  const handleApplySmartRedaction = async (selectedStrings = [], currentMaskMode = maskingMode, shouldDownload = true) => {
    if (!uploadResult) return;
    setIsRedacting(true);
    setErrorMsg(null);

    const modeToUse = currentMaskMode || maskingMode || 'TOKEN';

    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }
      formData.append('filename', uploadResult.filename || 'document.pdf');
      formData.append('redact_strings', JSON.stringify(selectedStrings));
      formData.append('masking_mode', modeToUse);

      // 1 single fast trip to /api/redact?return_json=true returns both preview & PDF binary base64
      const res = await fetch('/api/redact?return_json=true', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Redaction failed with status ${res.status}`);
      }

      const data = await res.json();
      
      // Update preview and masking mode immediately
      if (data.preview_image || data.preview_images) {
        setUploadResult((prev) => ({
          ...prev,
          preview_image: data.preview_image || prev?.preview_image,
          preview_images: data.preview_images || (data.preview_image ? [data.preview_image] : prev?.preview_images),
          masking_mode: modeToUse
        }));
      }

      // Instant file download in browser if requested
      if (shouldDownload) {
        if (data.pdf_base64) {
          const downloadName = data.filename || `masked_${uploadResult.filename || 'document.pdf'}`;
          const base64Content = data.pdf_base64.includes(',') ? data.pdf_base64.split(',')[1] : data.pdf_base64;
          const byteCharacters = atob(base64Content);
          const byteNumbers = new Uint8Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const blob = new Blob([byteNumbers], { type: 'application/pdf' });
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = downloadName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          setPurgeToast(`Downloaded: ${downloadName}`);
          setTimeout(() => setPurgeToast(null), 3500);
        } else if (data.masked_text || uploadResult.masked_text) {
          const textContent = data.masked_text || uploadResult.masked_text;
          const downloadName = `masked_${uploadResult.filename || 'document.txt'}`;
          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = downloadName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          setPurgeToast(`Downloaded: ${downloadName}`);
          setTimeout(() => setPurgeToast(null), 3500);
        }
      }
    } catch (err) {
      console.error('Smart redaction error:', err);
      setErrorMsg(`Redaction error: ${err.message}`);
    } finally {
      setIsRedacting(false);
    }
  };

  // Custom keywords & selective unmasking handler
  const handleApplyCustomRules = async (customKeywords = [], disabledEntityIds = [], currentMode = maskingMode) => {
    if (!uploadResult || !uploadResult.original_text) return;

    const modeToUse = currentMode || maskingMode || 'TOKEN';

    try {
      const res = await fetch('/api/redact/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: uploadResult.original_text,
          custom_keywords: customKeywords,
          disabled_entity_ids: disabledEntityIds,
          masking_mode: modeToUse
        })
      });

      if (res.ok) {
        const data = await res.json();
        setUploadResult((prev) => ({
          ...prev,
          masked_text: data.masked_text,
          masking_mode: modeToUse,
          risk_assessment: data.risk_assessment,
          compliance_report: data.compliance_report,
          sanitization_hash: data.sanitization_hash,
          zero_leak_verified: data.zero_leak_verified,
          preview_image: data.preview_image || prev?.preview_image,
          preview_images: data.preview_images || prev?.preview_images
        }));
      }
    } catch (err) {
      console.error('Error applying custom rules:', err);
    }
  };

  // Change masking strategy mode
  const handleMaskingModeChange = (mode) => {
    setMaskingMode(mode);
    if (uploadResult) {
      const notReqStrings = uploadResult.detected_pii
        ? uploadResult.detected_pii.filter(i => i.status === 'Not Required').map(i => i.value)
        : [];
      handleApplySmartRedaction(notReqStrings, mode, false);
      handleApplyCustomRules([], [], mode);
    }
  };

  // Purge memory
  const handlePurgeMemory = async () => {
    setIsPurging(true);
    try {
      await fetch('/api/purge', { method: 'POST' });
      setUploadResult(null);
      setUploadedFile(null);
      setPurgeToast('Session cleared. All uploaded data has been wiped from memory.');
      setTimeout(() => setPurgeToast(null), 4000);
    } catch (err) {
      console.error('Purge error:', err);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-[#07090e] text-slate-800 dark:text-slate-100 flex flex-col font-sans relative scanline transition-colors duration-200 overflow-hidden">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onPurgeMemory={handlePurgeMemory}
        isPurging={isPurging}
        onOpenZeroModal={() => setIsZeroModalOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
        hasDocument={!!uploadResult}
      />

      {/* Zero Retention Privacy Promise Modal */}
      <ZeroRetentionModal
        isOpen={isZeroModalOpen}
        onClose={() => setIsZeroModalOpen(false)}
      />

      {/* Purge Toast Notification */}
      {purgeToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{purgeToast}</span>
        </div>
      )}

      {/* Main Content Area (Flex container fitting exactly inside viewport) */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col overflow-hidden">
        
        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0" />
            <div>
              <span className="font-bold">Notice:</span> {errorMsg}
            </div>
          </div>
        )}

        {/* Tab 1: Protect Documents & Contextual Copilot */}
        {activeTab === 'studio' && (
          <DocumentStudio
            uploadResult={uploadResult}
            uploadedFile={uploadedFile}
            isProcessing={isProcessing}
            isRedacting={isRedacting}
            maskingMode={maskingMode}
            setMaskingMode={handleMaskingModeChange}
            purpose={purpose}
            setPurpose={setPurpose}
            onFileUpload={handleFileUpload}
            onTextSubmit={handleTextSubmit}
            onApplyCustomRules={handleApplyCustomRules}
            onApplySmartRedaction={handleApplySmartRedaction}
          />
        )}

        {/* Tab 2: Document Chatbot (Gemini 1.5 Flash Grounded) */}
        {activeTab === 'rag' && (
          <div className="grid grid-cols-1 gap-6">
            <DocumentChatbot
              hasDocument={!!uploadResult}
              filename={uploadResult?.filename || "document.pdf"}
              uploadedFile={uploadedFile}
            />
          </div>
        )}

        {/* Tab 3: Compliance & Safety Check */}
        {activeTab === 'compliance' && (
          <ComplianceView
            complianceReport={uploadResult?.compliance_report}
            filename={uploadResult?.filename || "document"}
          />
        )}

        {/* Tab 4: Safe AI Prompt Shield */}
        {activeTab === 'firewall' && (
          <LLMFirewallSimulator />
        )}

        {/* Tab 5: Security Dashboard */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}

      </main>

      {/* Floating Bottom AI Document Assistant Widget */}
      <FloatingChatWidget
        hasDocument={!!uploadResult}
        filename={uploadResult?.filename || "document.pdf"}
        uploadedFile={uploadedFile}
      />

      {/* Footer (Hidden on mobile for native app screen-fit experience) */}
      <footer className="hidden sm:block border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090c14] py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">PrivacyGuard AI • Simple & Safe Document Protection</span>
          </div>
          <div className="text-slate-500 dark:text-slate-500 font-medium">
            100% Private on Your Device • Never Saved to Any Server
          </div>
        </div>
      </footer>

    </div>
  );
}
