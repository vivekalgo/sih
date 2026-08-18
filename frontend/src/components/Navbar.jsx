import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Trash2, 
  HelpCircle, 
  Layers, 
  FileText, 
  Zap, 
  BarChart3, 
  Sun, 
  Moon,
  Menu,
  X,
  Lock,
  ChevronRight
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onPurgeMemory,
  isPurging,
  onOpenZeroModal,
  theme,
  toggleTheme,
  hasDocument
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navTabs = [
    { id: 'studio', label: 'Protect Documents', icon: Layers, desc: '4-Step Redaction & Sanitization' },
    { id: 'compliance', label: 'Compliance Check', icon: FileText, desc: 'DPDP & GDPR Audit Report' },
    { id: 'firewall', label: 'AI Prompt Shield', icon: Zap, desc: 'Test LLM Data Leak Prevention' },
    { id: 'analytics', label: 'Security Dashboard', icon: BarChart3, desc: 'Telemetry & PII Statistics' },
  ];

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#090d16]/95 backdrop-blur-xl sticky top-0 z-40 transition-colors duration-200 shadow-sm dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-2">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => handleTabClick('studio')}
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
                  Safe Mode
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <div className="hidden lg:flex items-center space-x-2">
            <nav className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950/70 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {navTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
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

            {/* Desktop Policy Modal Trigger */}
            <button
              onClick={onOpenZeroModal}
              className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 px-3 py-1.5 rounded-xl transition-all"
              title="How your privacy is guaranteed"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Privacy Promise</span>
            </button>

            {/* Desktop Clear Session / Memory Button */}
            <button
              onClick={onPurgeMemory}
              disabled={isPurging}
              className="hidden sm:flex items-center space-x-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800/50 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
              title="Instantly wipe all files and data from active memory"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
              <span>{isPurging ? 'Clearing...' : 'Clear Memory'}</span>
            </button>

            {/* Mobile Hamburger Button (Three Lines Icon) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all focus:outline-none"
              aria-label="Open Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Slide-down Drawer / Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800/90 bg-white/98 dark:bg-[#0b0f19]/98 backdrop-blur-2xl px-4 py-5 shadow-2xl animate-fade-in space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Navigation Menu
            </span>
            <span className="inline-flex text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Device-Only Zero Leak
            </span>
          </div>

          {/* Nav Items List */}
          <div className="space-y-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/20 font-bold'
                      : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{tab.label}</div>
                      <div className={`text-[10px] ${isActive ? 'text-cyan-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {tab.desc}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Mobile Utility Actions */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenZeroModal();
              }}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Privacy Promise</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onPurgeMemory();
              }}
              disabled={isPurging}
              className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isPurging ? 'Clearing...' : 'Clear Memory'}</span>
            </button>
          </div>

        </div>
      )}

    </header>
  );
}
