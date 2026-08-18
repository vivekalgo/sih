import React from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, AlertTriangle, Download, FileText, Lock, Globe } from 'lucide-react';

export default function ComplianceView({ complianceReport, filename }) {
  if (!complianceReport) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4 max-w-xl mx-auto my-8 animate-fade-in shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mx-auto">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Document Uploaded Yet</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Upload a file in the "Protect Documents" tab to view your live privacy safety score and legal rules check.
        </p>
      </div>
    );
  }

  const standards = complianceReport.standards || {};
  const score = complianceReport.overall_compliance_score || 0;
  const grade = complianceReport.compliance_grade || 'B';

  const handleDownloadCertificate = () => {
    const cert = {
      certificate_title: "PrivacyGuard AI Official Compliance & Data Protection Certificate",
      timestamp: new Date().toISOString(),
      document_name: filename || "document",
      safety_score: `${score}%`,
      grade: grade,
      ready_for_sharing: complianceReport.is_safe_for_cloud_llm,
      regulations_verified: [
        "India Digital Personal Data Protection (DPDP) Act 2023",
        "EU General Data Protection Regulation (GDPR)",
        "PCI-DSS Card Security Standards",
        "HIPAA Healthcare Privacy Standard"
      ],
      audit_findings: standards,
      privacy_guarantee: "100% On-Device Processing with Zero Data Retention"
    };

    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob);
    el.download = `safety_certificate_${filename || 'audit'}.json`;
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  const getStatusBadge = (status, severity) => {
    if (status === 'COMPLIANT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PASSED (100% Safe)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
        <AlertOctagon className="w-3.5 h-3.5" />
        {severity} RISK (Action Needed)
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Overview Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-bold">
                Automatic Privacy Audit
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">File: {filename}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Privacy & Legal Rules Safety Check</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              {complianceReport.summary}
            </p>
          </div>

          {/* Grade & Score Dial */}
          <div className="flex items-center space-x-4 bg-slate-100 dark:bg-slate-950/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-shrink-0 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{score}%</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Safety Score</div>
            </div>
            <div className="w-[1px] h-10 bg-slate-300 dark:bg-slate-800" />
            <div className="text-center">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{grade}</div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Safety Grade</div>
            </div>
            <button
              onClick={handleDownloadCertificate}
              className="ml-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Certificate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Regulatory Standards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(standards).map(([key, item]) => (
          <div
            key={key}
            className={`glass-card rounded-2xl p-5 border transition-all shadow-sm ${
              item.status === 'COMPLIANT' 
                ? 'border-emerald-200 dark:border-emerald-900/60' 
                : 'border-rose-200 dark:border-rose-900/60'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.regulation_name}</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{key}</span>
              </div>
              {getStatusBadge(item.status, item.severity)}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              {item.summary}
            </p>

            {item.violated_clauses && item.violated_clauses.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-200 space-y-1 mb-3">
                <div className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Flagged Rule Items:
                </div>
                {item.violated_clauses.map((clause, cIdx) => (
                  <div key={cIdx} className="pl-4 relative before:content-['•'] before:absolute before:left-1">
                    {clause}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs flex items-center justify-between text-slate-500 dark:text-slate-400 font-medium">
              <span>Recommendation:</span>
              <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{item.remediation_advice}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
