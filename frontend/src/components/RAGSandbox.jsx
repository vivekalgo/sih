import React, { useState } from 'react';
import { Send, Bot, ShieldCheck, Database, FileSearch, Sparkles, AlertCircle } from 'lucide-react';

export default function RAGSandbox({ hasDocument, filename }) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Safe Document Assistant. Ask me any question about your document. Your private personal details (like Aadhaar, PAN, and card numbers) are completely protected and never seen by the AI.'
    }
  ]);

  const sampleQuestions = [
    "What are the main topics in this document?",
    "Summarize the key points safely",
    "Is there any financial or tax information mentioned?"
  ];

  const handleSend = async (queryText = prompt) => {
    const query = queryText.trim();
    if (!query || isLoading) return;

    // Add user query to chat history
    setHistory((prev) => [...prev, { role: 'user', content: query }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, top_k: 3 })
      });

      if (!res.ok) {
        throw new Error(`Chat query failed with status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          chunks: data.relevant_chunks,
          zeroLeak: data.zero_leak_verified
        }
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to get answer: ${err.message}. Please make sure a document is uploaded.`,
          error: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Chat with Your Document
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ask any question safely. Only the clean, protected version is used to find answers.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 px-3 py-1 rounded-full w-fit">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>100% Private & Safe</span>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="text-xs text-slate-500 dark:text-slate-400 self-center font-medium">Quick Suggestions:</span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={!hasDocument || isLoading}
            className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-200 transition-all disabled:opacity-40 disabled:pointer-events-none text-left shadow-sm font-medium"
          >
            💡 {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl p-4 h-[320px] overflow-y-auto space-y-3 text-xs">
        {history.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col space-y-1 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1">
              {msg.role === 'user' ? 'You' : 'Safe AI Assistant'}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none font-medium'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.content}

              {/* Verified Badge */}
              {msg.zeroLeak && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Safe • Zero Data Leak
                  </span>
                  <span>Used {msg.chunks?.length || 0} clean sections</span>
                </div>
              )}
            </div>

            {/* Retrieved Clean Context Card */}
            {msg.chunks && msg.chunks.length > 0 && (
              <div className="max-w-[85%] mt-1 p-2 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/70 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-300 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    Clean References Used
                  </span>
                </div>
                {msg.chunks.map((chk, cIdx) => (
                  <div key={cIdx} className="bg-white dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-cyan-700 dark:text-cyan-400 mb-0.5 font-semibold">
                      <span>Section {cIdx + 1}</span>
                      <span>Relevance: {(chk.similarity_score * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 truncate text-[11px]">{chk.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs py-2 font-medium">
            <div className="w-3.5 h-3.5 border-2 border-cyan-500 dark:border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Reading clean document and preparing safe answer...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center space-x-2"
      >
        <input
          type="text"
          placeholder={hasDocument ? "Ask any question about your document..." : "Please upload or select a document first to ask questions..."}
          disabled={!hasDocument || isLoading}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50 shadow-sm"
        />
        <button
          type="submit"
          disabled={!hasDocument || isLoading || !prompt.trim()}
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-600/30 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>

    </div>
  );
}
