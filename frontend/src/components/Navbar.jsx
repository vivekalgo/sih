import React from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  HelpCircle, 
  Layers, 
  FileText, 
  Zap, 
  BarChart3, 
  Sun, 
  Moon
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onPurgeMemory,
  isPurging,
  onOpenZeroModal,
  theme,
  toggleTheme
}) {
  const navTabs = [
    { id: 'studio', label: 'Protect Documents', icon: <Layers className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance Check', icon: <FileText className="w-4 h-4" /> },
    { id: 'firewall', label: 'AI Prompt Shield', icon: <Zap className="w-4 h-4" /> },
    { id: 'analytics', label: 'Security Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#090d16]/95 backdrop-blur-xl sticky top-0 z-40 transition-colors duration-200 shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-2">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('studio')}
            className="flex items-center space-x-3 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  PrivacyGuard<span className="text-cyan-600 dark:text-cyan-400 font-mono ml-1 text-xs px-1.5 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-500/30">AI</span>
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"></span>
                  Safe Mode Active
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <div className="hidden lg:flex items-center space-x-2">
            <nav className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950/70 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900/60'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-2">

            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-amber-300 border border-slate-200 dark:border-slate-750 transition-all duration-200 shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Policy Modal Trigger */}
            <button
              onClick={onOpenZeroModal}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-xl transition-all"
              title="How your privacy is guaranteed"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">Privacy Promise</span>
            </button>

            {/* Clear Session / Memory Button */}
            <button
              onClick={onPurgeMemory}
              disabled={isPurging}
              className="flex items-center space-x-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800/50 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
              title="Instantly wipe all files and data from active memory"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isPurging ? 'Clearing...' : 'Clear Memory'}</span>
            </button>

          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-200 dark:border-slate-850">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center space-x-1 flex-shrink-0 transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

      </div>
    </header>
  );
}
