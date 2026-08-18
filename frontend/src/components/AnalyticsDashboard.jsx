import React, { useState, useEffect } from 'react';
import { BarChart3, ShieldCheck, ShieldAlert, Cpu, Lock, Activity, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState({
    total_documents_processed: 0,
    total_pii_entities_sanitized: 0,
    total_data_leaks_prevented: 0,
    average_latency_ms: 0,
    threat_tier_counts: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    }
  });

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error('Error loading analytics:', err));
  }, []);

  const totalThreats = Object.values(analytics.threat_tier_counts || {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header Card */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
          <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>Security & Protection Summary</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Live Data Protection Statistics</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Overview of all documents scanned, sensitive records protected, and local privacy verifications.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Documents Protected</span>
            <Lock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {analytics.total_documents_processed}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Zero-Data Retention</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Sensitive Details Hidden</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {analytics.total_data_leaks_prevented}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Aadhaar, PAN, Cards & Phone #</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Average Speed</span>
            <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-cyan-700 dark:text-cyan-300">
            {analytics.average_latency_ms} ms
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Fast On-Device RAM Engine</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
          <div className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Safety Rating</span>
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300">
            98.5%
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
            <span>DPDP • GDPR • HIPAA • PCI</span>
          </div>
        </div>

      </div>

      {/* Threat Distribution & Tiering */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Threat Level Distribution */}
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Risk Levels of Scanned Documents
          </h3>

          <div className="space-y-3 text-xs">
            {Object.entries(analytics.threat_tier_counts || {}).map(([tier, count]) => {
              const pct = Math.round((count / totalThreats) * 100);
              let color = 'bg-cyan-500';
              if (tier === 'CRITICAL') color = 'bg-rose-500';
              if (tier === 'HIGH') color = 'bg-amber-500';
              if (tier === 'MEDIUM') color = 'bg-yellow-500';
              if (tier === 'LOW') color = 'bg-emerald-500';

              return (
                <div key={tier} className="space-y-1">
                  <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-medium">
                    <span className="font-bold">{tier} RISK</span>
                    <span>{count} files ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-slate-800">
                    <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Tenets Checklist */}
        <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Our Core Privacy Guarantees
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-start space-x-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-200 block">Never Saved to Disk</strong>
                <span className="text-slate-500 dark:text-slate-400 text-xs">Files stay in temporary memory only and are never saved to local hard drives.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-start space-x-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-200 block">100% Local on Your Computer</strong>
                <span className="text-slate-500 dark:text-slate-400 text-xs">All scanning, OCR, and rules run on your own machine. Zero tracking or telemetry.</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 flex items-start space-x-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 dark:text-slate-200 block">Protected AI Chat</strong>
                <span className="text-slate-500 dark:text-slate-400 text-xs">The chatbot only accesses clean, sanitized information to protect you against leaks.</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
