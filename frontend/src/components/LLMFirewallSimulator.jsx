import React, { useState } from 'react';
import { Zap, ShieldCheck, ArrowRight, Bot, Lock, AlertTriangle, CheckCircle2, Play, Sparkles } from 'lucide-react';

export default function LLMFirewallSimulator() {
  const [promptText, setPromptText] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [isSimulating, setIsSimulating] = useState(false);
  const [firewallResult, setFirewallResult] = useState(null);

  const handleRunFirewall = async (textToRun = promptText) => {
    if (!textToRun.trim() || isSimulating) return;
    setIsSimulating(true);

    try {
      const res = await fetch('/api/llm/firewall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_prompt: textToRun,
          target_model: selectedModel,
          masking_mode: 'TOKEN'
        })
      });

      if (!res.ok) throw new Error('Firewall simulation failed');
      const data = await res.json();
      setFirewallResult(data);
    } catch (err) {
      console.error('Firewall error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-bold">
          <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Safe AI Prompt Shield</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clean Prompts Before Sending to AI Models</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          Enter any prompt intended for ChatGPT or Claude. All personal identification details, passwords, and numbers are removed automatically before transmission.
        </p>
      </div>

      {/* Input Form & Controls */}
      <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200">
            Your AI Question or Prompt
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Target AI Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              <option value="gpt-4o">OpenAI (ChatGPT-4o)</option>
              <option value="claude-3.5-sonnet">Anthropic (Claude 3.5)</option>
              <option value="gemini-1.5-pro">Google (Gemini 1.5)</option>
              <option value="llama-3-70b">Private Model (Llama 3)</option>
            </select>
          </div>
        </div>

        <textarea
          rows={5}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Type or paste any prompt containing names, ID numbers, cards, or accounts..."
          className="w-full bg-slate-50 dark:bg-[#080b13] border border-slate-300 dark:border-slate-700/80 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed"
        />

        <div className="flex justify-end">
          <button
            onClick={() => handleRunFirewall()}
            disabled={isSimulating || !promptText.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-md shadow-cyan-600/30 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isSimulating ? 'Cleaning & Checking...' : 'Scan & Protect Prompt'}</span>
          </button>
        </div>

      </div>

      {/* Firewall Inspection Pipeline Visualization */}
      {firewallResult && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Live Interception Summary */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/40 text-xs shadow-sm">
            <div className="flex items-center space-x-2 text-cyan-800 dark:text-cyan-300 font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>{firewallResult.threat_summary}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-medium">
              Protection Speed: <strong className="text-slate-900 dark:text-white">{firewallResult.firewall_latency_ms}ms</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Left: Sanitized In-Flight Payload Sent to External LLM */}
            <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col shadow-sm">
              <div className="flex items-center justify-between text-xs text-cyan-700 dark:text-cyan-400 pb-2 border-b border-slate-200 dark:border-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  What the AI Model Actually Receives (Clean)
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30">
                  Zero Secrets
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#080b13] border border-slate-200 dark:border-slate-800/80 rounded-xl font-mono text-xs text-emerald-800 dark:text-emerald-300/90 whitespace-pre-wrap leading-relaxed flex-1">
                {firewallResult.sanitized_prompt}
              </div>
            </div>

            {/* Right: Cloud LLM Safe Completion */}
            <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col shadow-sm">
              <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-400 pb-2 border-b border-slate-200 dark:border-slate-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  AI Model Response
                </span>
                <span className="text-[10px] text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/70 px-2 py-0.5 rounded border border-purple-300 dark:border-purple-500/30">
                  Safe Output
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#080b13] border border-slate-200 dark:border-slate-800/80 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed flex-1">
                {firewallResult.simulated_cloud_response}
              </div>
            </div>

          </div>

          {/* Intercepted Entities Table */}
          {firewallResult.leak_prevention_list?.length > 0 && (
            <div className="glass-card rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2 shadow-sm">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Blocked Sensitive Information & Replacements:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {firewallResult.leak_prevention_list.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-1 shadow-sm font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400">{item.entity_type}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{(item.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-rose-600 dark:text-rose-300 line-through text-[11px] truncate">{item.raw}</div>
                    <div className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold truncate">{item.masked}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
