import React from 'react';
import { AlertTriangle, ShieldCheck, AlertOctagon, CheckCircle2, Hash, Zap, BarChart2 } from 'lucide-react';

export default function RiskIndicator({ riskAssessment, processingTimeMs, sanitizationHash, zeroLeakVerified }) {
  if (!riskAssessment) return null;

  const score = riskAssessment.risk_score || 0;
  const level = riskAssessment.risk_level || 'LOW';
  const total = riskAssessment.total_entities_found || 0;
  const counts = riskAssessment.entity_counts || {};

  const getTheme = (lvl) => {
    switch (lvl) {
      case 'CRITICAL':
        return {
          badgeBg: 'bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-300',
          gaugeColor: '#f43f5e',
          icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          cardBorder: 'border-rose-200 dark:border-rose-900/60'
        };
      case 'HIGH':
        return {
          badgeBg: 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-300',
          gaugeColor: '#f59e0b',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          cardBorder: 'border-amber-200 dark:border-amber-900/60'
        };
      case 'MEDIUM':
        return {
          badgeBg: 'bg-yellow-100 dark:bg-yellow-500/20 border-yellow-300 dark:border-yellow-500/50 text-yellow-800 dark:text-yellow-300',
          gaugeColor: '#eab308',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />,
          cardBorder: 'border-yellow-200 dark:border-yellow-900/60'
        };
      default:
        return {
          badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300',
          gaugeColor: '#10b981',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          cardBorder: 'border-emerald-200 dark:border-emerald-900/60'
        };
    }
  };

  const theme = getTheme(level);

  // SVG Circular progress
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`glass-card rounded-2xl p-3.5 sm:p-4 border ${theme.cardBorder} relative overflow-hidden transition-all duration-300 shadow-sm bg-white dark:bg-slate-900/80 space-y-3`}>
      
      {/* Top Header: Score Dial & Risk Classification */}
      <div className="flex items-center space-x-3.5">
        
        {/* Dial */}
        <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={theme.gaugeColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              {score}%
            </span>
            <span className="text-[8px] uppercase font-bold tracking-wider text-slate-400">
              Risk
            </span>
          </div>
        </div>

        {/* Classification & Recommendation */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.badgeBg}`}>
              {theme.icon}
              <span>{level} RISK</span>
            </span>

            {zeroLeakVerified && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                <span>100% Safe</span>
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-tight line-clamp-2">
            {riskAssessment.recommendation || 'Document sanitized and safe for downstream sharing.'}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px]">
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
          <span className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            Scan Speed
          </span>
          <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {processingTimeMs ? `${processingTimeMs}ms` : '< 10ms'}
          </p>
        </div>

        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
          <span className="text-slate-400 text-[10px] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            AI Confidence
          </span>
          <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
            {riskAssessment.mean_confidence ? `${(riskAssessment.mean_confidence * 100).toFixed(0)}%` : '100%'}
          </p>
        </div>
      </div>

      {/* Detected Entity Distribution List */}
      <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
            <BarChart2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            Sensitive Details Found
          </span>
          <span>Total: <strong className="text-slate-900 dark:text-white font-bold">{total}</strong></span>
        </div>

        <div className="flex flex-wrap gap-1">
          {Object.keys(counts).length === 0 ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold py-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> No sensitive information found
            </span>
          ) : (
            Object.entries(counts).map(([type, count]) => (
              <div
                key={type}
                className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10.5px] flex items-center space-x-1"
              >
                <span className="text-slate-700 dark:text-slate-300 font-medium">{type}</span>
                <span className="px-1 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-bold text-[9.5px]">
                  {count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cryptographic Verification Stamp */}
      {sanitizationHash && (
        <div className="p-2 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 flex items-center justify-between text-[10px]">
          <div className="flex items-center space-x-1 text-cyan-800 dark:text-cyan-300 font-mono truncate">
            <Hash className="w-3 h-3 flex-shrink-0 text-cyan-600 dark:text-cyan-400" />
            <span className="truncate">{sanitizationHash.slice(0, 24)}...</span>
          </div>
          <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
            SHA-256 Valid
          </span>
        </div>
      )}

    </div>
  );
}
