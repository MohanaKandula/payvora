import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { axiosInstance } from '../api/axiosInstance';
import { 
  HelpCircle, X, Search, Sparkles, MessageSquare, ArrowRight, 
  Gift, Send, ShieldCheck, FileText, LifeBuoy, PlusCircle, CheckCircle2, RefreshCw
} from 'lucide-react';

export const FloatingHelpWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState<string | null>(null);
  const [sourceDoc, setSourceDoc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current user is Admin
  const token = localStorage.getItem('accessToken');
  let isAdmin = false;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      isAdmin = payload.role === 'ROLE_ADMIN' || payload.role === 'ADMIN' || 
                (Array.isArray(payload.roles) && (payload.roles.includes('ROLE_ADMIN') || payload.roles.includes('ADMIN')));
    } catch (e) {}
  }

  if (isAdmin || window.location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleAsk = async (qText?: string) => {
    const q = (qText || query).trim();
    if (!q) return;

    setIsLoading(true);
    setSourceDoc(null);
    try {
      const res = await axiosInstance.post('/api/support/rag/query', { query: q });
      if (res && res.data) {
        console.log("🔥 FLOATING WIDGET RAG RESPONSE:", res.data);
        console.log("🔥 FLOATING WIDGET SETTING REPLY:", res.data.answer);
        console.log("🔥 FLOATING WIDGET SETTING SOURCE DOC:", res.data.sourceDocument);
        setReply(res.data.answer);
        setSourceDoc(res.data.sourceDocument);
      }
    } catch (err) {
      setReply('Unable to connect to PayVora AI Vector Engine. Please ensure transaction-service backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 no-print font-sans">
      
      {/* Drawer Toggle Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20 flex items-center gap-2.5 glow-purple group cursor-pointer"
          title="Open Quick Guidance Assistant"
        >
          <HelpCircle className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-black tracking-wider uppercase pr-1 hidden sm:inline">PayVora Help</span>
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 border border-white animate-pulse" />
        </button>
      )}

      {/* Floating Glassmorphism Sliding Drawer */}
      {isOpen && (
        <div className="w-80 sm:w-96 glass-panel border border-white/10 rounded-3xl shadow-2xl bg-[#0c0c14]/95 backdrop-blur-2xl p-6 space-y-5 animate-fade-in border-violet-500/20 relative glow-purple">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-md">
                <LifeBuoy className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">PayVora Instant Guidance</h3>
                <p className="text-[9px] font-mono text-violet-400">24/7 AI Assistant & Support</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Instant Search / Query Textarea */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Ask Any Question:</label>
            <div className="space-y-2">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type doubt (e.g. 'how to earn cashback', 'how to transfer')..."
                rows={2}
                className="w-full p-3 bg-black/50 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
              />
              <button
                onClick={() => handleAsk()}
                disabled={isLoading}
                className="w-full py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:brightness-110 flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Searching Vector DB...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>RAG Vector Resolution</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap gap-1">
            {[
              'Cashback calculation',
              'Rent offer rebate',
              'Security PIN setup'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(chip);
                  handleAsk(chip);
                }}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-violet-500/10 border border-white/5 text-gray-400 hover:text-violet-300 transition-all"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* AI Output Reply */}
          {reply && (
            <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-gray-200 leading-normal space-y-1 animate-fade-in font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-violet-400 font-bold text-[10px]">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  RAG Vector Resolution:
                </div>
                {sourceDoc && (
                  <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/40">
                    Source: {sourceDoc}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-300">{reply}</p>
            </div>
          )}

          {/* Full Help Center & Ticket Shortcuts */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 text-xs text-violet-300 hover:text-white font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-400" />
                <span>Full Help Center & FAQs</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 text-xs text-fuchsia-300 hover:text-white font-bold transition-all"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-fuchsia-400" />
                <span>Submit Support Ticket</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>
      )}

    </div>
  );
};
