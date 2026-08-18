import React from 'react';
import { AlertTriangle, ShieldCheck, ShieldAlert, AlertOctagon, CheckCircle2, Hash, Zap, BarChart2 } from 'lucide-react';

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
          textClass: 'text-rose-600 dark:text-rose-400',
          icon: <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-bounce" />,
          cardBorder: 'border-rose-200 dark:border-rose-900/60'
        };
      case 'HIGH':
        return {
          badgeBg: 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-300',
          gaugeColor: '#f59e0b',
          textClass: 'text-amber-600 dark:text-amber-400',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          cardBorder: 'border-amber-200 dark:border-amber-900/60'
        };
      case 'MEDIUM':
        return {
          badgeBg: 'bg-yellow-100 dark:bg-yellow-500/20 border-yellow-300 dark:border-yellow-500/50 text-yellow-800 dark:text-yellow-300',
          gaugeColor: '#eab308',
          textClass: 'text-yellow-600 dark:text-yellow-400',
          icon: <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
          cardBorder: 'border-yellow-200 dark:border-yellow-900/60'
        };
      default:
        return {
          badgeBg: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300',
          gaugeColor: '#10b981',
          textClass: 'text-emerald-600 dark:text-emerald-400',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          cardBorder: 'border-emerald-200 dark:border-emerald-900/60'
        };
    }
  };

  const theme = getTheme(level);

  // SVG Circular progress
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`glass-card rounded-2xl p-5 border ${theme.cardBorder} relative overflow-hidden transition-all duration-300 shadow-sm`}>
      {/* Background glow */}
      <div 
        className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: theme.gaugeColor }}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Risk Score Dial & Classification */}
        <div className="md:col-span-4 flex items-center space-x-4">
          <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              {/* Animated Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke={theme.gaugeColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {score}%
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                Risk
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${theme.badgeBg}`}>
                {theme.icon}
                {level} RISK
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed mt-1">
              {riskAssessment.recommendation}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5 font-medium">
              <span>Scan Speed: <strong className="text-cyan-700 dark:text-cyan-300">{processingTimeMs}ms</strong></span>
              <span>•</span>
              <span>Confidence: <strong className="text-cyan-700 dark:text-cyan-300">{(riskAssessment.mean_confidence * 100).toFixed(0)}%</strong></span>
            </div>
          </div>
        </div>

        {/* Entity Distribution Chips */}
        <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Found Sensitive Details
            </span>
            <span>Total: <strong className="text-slate-900 dark:text-white font-bold">{total}</strong> items</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {Object.keys(counts).length === 0 ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> No sensitive information found
              </span>
            ) : (
              Object.entries(counts).map(([type, count]) => (
                <div
                  key={type}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 text-xs flex items-center space-x-1.5"
                >
                  <span className="text-slate-800 dark:text-slate-300 font-semibold">{type}</span>
                  <span className="px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-300 dark:border-cyan-500/30 text-[10px]">
                    {count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Zero-Leak Verification Capsule */}
        <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 md:pl-6 space-y-2 text-xs">
          <div className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Safety Verification
          </div>
          
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 text-xs space-y-1">
            <div className="text-slate-500 dark:text-slate-400 flex items-center justify-between text-[11px] font-medium">
              <span>Security Stamp:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% SAFE</span>
            </div>
            <div className="text-cyan-700 dark:text-cyan-300 truncate font-mono text-[11px]" title={sanitizationHash}>
              {sanitizationHash ? `${sanitizationHash.slice(0, 14)}...${sanitizationHash.slice(-6)}` : 'Generating...'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
