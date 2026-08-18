import React from 'react';
import { Target, UploadCloud, EyeOff, FileCheck2, Check } from 'lucide-react';

export default function StepProgress({ currentStep = 1, onStepClick, maxUnlockedStep = 1 }) {
  const steps = [
    {
      id: 1,
      title: 'Select Purpose',
      subtitle: 'KYC, Job, Rent, Sharing',
      icon: Target,
    },
    {
      id: 2,
      title: 'Upload Document',
      subtitle: 'PDF, Images, Text',
      icon: UploadCloud,
    },
    {
      id: 3,
      title: 'Choose Masking',
      subtitle: 'Tags, Blackout, Code',
      icon: EyeOff,
    },
    {
      id: 4,
      title: 'Final Clean Output',
      subtitle: 'Preview & Download',
      icon: FileCheck2,
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-[#0c101a] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-sm">
      {/* Mobile Step Header with Progress Line */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs shadow-sm shadow-cyan-600/30">
              {currentStep}
            </span>
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              {steps[currentStep - 1]?.title}
            </span>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
            Step {currentStep} of {steps.length}
          </span>
        </div>

        {/* Mobile Mini Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 rounded-full"
            style={{ width: `${((currentStep) / steps.length) * 100}%` }}
          />
        </div>

        {/* Mobile Step Badges */}
        <div className="flex items-center justify-between pt-1">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = step.id <= maxUnlockedStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => isClickable && onStepClick && onStepClick(step.id)}
                disabled={!isClickable}
                className={`text-[10px] font-medium transition-all ${
                  isCurrent
                    ? 'text-cyan-600 dark:text-cyan-400 font-bold underline underline-offset-4 decoration-2'
                    : isCompleted
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-600 opacity-60'
                }`}
              >
                {step.id}. {step.title.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop / Tablet Stepper Flow */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-2 relative">
        {steps.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = step.id <= maxUnlockedStep;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => isClickable && onStepClick && onStepClick(step.id)}
              disabled={!isClickable}
              className={`group flex items-center space-x-3 p-2.5 rounded-xl text-left transition-all relative ${
                isCurrent
                  ? 'bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-500/60 shadow-sm ring-1 ring-cyan-500/20'
                  : isCompleted
                  ? 'bg-slate-50 dark:bg-slate-900/50 border border-emerald-500/30 hover:border-emerald-500/60'
                  : 'bg-transparent border border-transparent opacity-60 hover:opacity-80'
              } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            >
              {/* Step Circle Indicator */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 font-bold'
                    : isCompleted
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 font-semibold'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              {/* Step Text Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                      isCurrent
                        ? 'text-cyan-600 dark:text-cyan-400'
                        : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    Step {step.id}
                  </span>
                  {isCompleted && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                      Done
                    </span>
                  )}
                </div>
                <div
                  className={`text-xs font-bold truncate leading-tight mt-0.5 ${
                    isCurrent
                      ? 'text-slate-900 dark:text-white'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {step.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
