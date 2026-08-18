import React, { useState } from 'react';
import { Send, Bot, ShieldCheck, ShieldAlert, Sparkles, MessageSquare, AlertCircle, FileText, CornerDownLeft, Loader2 } from 'lucide-react';

export default function DocumentChatbot({ hasDocument, filename = 'document.pdf', uploadedFile = null }) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Safe Document Assistant. Ask me any question strictly based on your uploaded document.',
      grounded: true
    }
  ]);

  const suggestedQuestions = [
    "What are the main points in this document?",
    "Which contact details are listed?",
    "Summarize the key information safely"
  ];

  const handleSend = async (queryText = prompt) => {
    const query = (queryText || '').trim();
    if (!query || isLoading) return;

    // Add user question to chat history
    setHistory((prev) => [...prev, { role: 'user', content: query }]);
    setPrompt('');
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', query);
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Chat request failed with status: ${res.status}`);
      }

      const data = await res.json();
      const answer = data.response || data.answer || "No response received.";
      const isRefusal = answer.includes("I can only answer questions related to this document");

      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: answer,
          grounded: !isRefusal,
          isRefusal: isRefusal,
          isLiveGemini: data.is_live_gemini
        }
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      setHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to get answer: ${err.message}. Please verify the document is uploaded.`,
          error: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>Chat with Your Document</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Answers strictly from your uploaded file • Keeps private info safe
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-500/30 px-3 py-1 rounded-full w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Accurate & Document-Only</span>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quick Questions:</span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(q)}
            disabled={!hasDocument || isLoading}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all disabled:opacity-40 shadow-sm"
          >
            💬 {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Stream */}
      <div className="bg-slate-50 dark:bg-[#070a12] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 h-[350px] overflow-y-auto space-y-3.5 text-xs">
        {history.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col space-y-1 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1">
              {msg.role === 'user' ? 'You' : 'Document Assistant'}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none font-medium'
                  : msg.isRefusal
                  ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 rounded-bl-none'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
              }`}
            >
              {msg.content}

              {/* Status footer for assistant messages */}
              {msg.role === 'assistant' && !msg.error && (
                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  {msg.isRefusal ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                      <ShieldAlert className="w-3 h-3" />
                      Notice: I can only answer questions about this document
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Answered directly from your document
                    </span>
                  )}
                  <span>{filename}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs py-2 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Finding answer from your document...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center space-x-2"
      >
        <input
          type="text"
          placeholder={hasDocument ? `Ask a question about ${filename}...` : "Please upload a document first..."}
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
