import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Loader2, 
  Maximize2, 
  Minimize2, 
  MessageSquare,
  ChevronDown
} from 'lucide-react';

export default function FloatingChatWidget({ hasDocument, filename = 'document.pdf', uploadedFile = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Safe Document AI Assistant. Ask me any question strictly based on your uploaded document.',
      grounded: true
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [history, isOpen]);

  const suggestedQuestions = [
    "What are the main points?",
    "Which contact details are listed?",
    "Summarize the key information safely"
  ];

  const handleSend = async (queryText = prompt) => {
    const query = (queryText || '').trim();
    if (!query || isLoading) return;

    // Add user message
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
    <>
      {/* 1. FLOATING CHAT CARD (OPEN STATE) */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[400px] md:w-[420px] h-[530px] max-h-[calc(100vh-7.5rem)] bg-white dark:bg-[#0a0e1a] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in backdrop-blur-xl">
          
          {/* Header Banner */}
          <div className="p-3.5 bg-gradient-to-r from-cyan-900 via-slate-900 to-purple-950 text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-[1.5px] shadow-sm flex-shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs text-white truncate">Document AI Assistant</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  {hasDocument ? `📄 ${filename}` : '⚠️ No document uploaded yet'}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Question Suggestion Chips */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-850 flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                disabled={!hasDocument || isLoading}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap transition-all disabled:opacity-40 flex-shrink-0 font-medium shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-[#070a12] text-xs">
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col space-y-1 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </span>

                <div
                  className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none font-medium'
                      : msg.isRefusal
                      ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 rounded-bl-none'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.content}

                  {msg.role === 'assistant' && !msg.error && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      {msg.isRefusal ? (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                          <ShieldAlert className="w-3 h-3" />
                          Document-only boundary
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          Document Verified
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 text-xs py-1 px-2 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Reading document & drafting answer...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder={hasDocument ? `Ask about ${filename}...` : "Upload a document to chat..."}
                disabled={!hasDocument || isLoading}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!hasDocument || isLoading || !prompt.trim()}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all disabled:opacity-40 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
              <span>🔒 100% Private (Runs in temporary RAM)</span>
              <span>Gemini Grounded</span>
            </div>
          </div>

        </div>
      )}

      {/* 2. FLOATING ACTION BUTTON (FAB) TRIGGER */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative group flex items-center space-x-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 ${
            isOpen
              ? 'bg-slate-900 dark:bg-slate-800 text-white ring-2 ring-cyan-500/50 scale-95'
              : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white hover:scale-105 hover:shadow-cyan-500/30'
          }`}
          title="Chat with Document (AI Assistant)"
          aria-label="Open AI Document Chatbot"
        >
          {/* Animated Indicator Ring */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${hasDocument ? 'bg-emerald-400' : 'bg-cyan-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${hasDocument ? 'bg-emerald-500' : 'bg-cyan-500'} border-2 border-white dark:border-slate-900`}></span>
            </span>
          )}

          {isOpen ? (
            <>
              <X className="w-5 h-5 text-white" />
              <span className="text-xs font-bold">Close</span>
            </>
          ) : (
            <>
              <div className="relative">
                <Bot className="w-5 h-5 text-white group-hover:rotate-6 transition-transform" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-tight flex items-center gap-1">
                  <span>Chat with File</span>
                  <Sparkles className="w-3 h-3 text-cyan-200" />
                </span>
                <span className="text-[10px] text-cyan-100/80 font-medium leading-none">
                  {hasDocument ? 'AI Ready' : 'AI Assistant'}
                </span>
              </div>
            </>
          )}
        </button>
      </div>
    </>
  );
}
