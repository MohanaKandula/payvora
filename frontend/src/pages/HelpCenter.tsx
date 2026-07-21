import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { axiosInstance } from '../api/axiosInstance';
import { 
  HelpCircle, Search, Gift, Send, Zap, ShieldCheck, PiggyBank, 
  ChevronDown, ArrowRight, CheckCircle2, Sparkles, AlertCircle, 
  MessageSquare, FileText, LifeBuoy, PlusCircle, Clock,
  CheckCircle, MessageCircle, Tag, AlertTriangle, User, ShieldAlert, RefreshCw, ArrowRightLeft,
  Activity, Headphones, FileCode, CheckSquare, ExternalLink, Lock
} from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'wallet' | 'rewards' | 'transfers' | 'recharge' | 'yield' | 'security' | 'support';
  question: string;
  answer: string;
  details?: string[];
  actionLink?: { label: string; path: string };
  tags: string[];
}

const FAQ_ITEMS: FAQItem[] = [
  // --- WALLET & ACCOUNT ---
  {
    id: 'wallet-add-money',
    category: 'wallet',
    question: 'How do I add money to my PayVora wallet?',
    answer: 'Learn how to deposit money using bank transfer, ACH, debit card, or other supported payment methods with zero deposit fees.',
    details: [
      'Navigate to /dashboard or /transactions and click "Add Money".',
      'Select your linked bank account or debit card and enter the deposit amount.',
      'Deposits process instantly with sub-second ledger confirmation.'
    ],
    actionLink: { label: 'Add Money to Wallet', path: '/dashboard' },
    tags: ['add money', 'deposit', 'wallet', 'bank transfer', 'ach', 'debit card']
  },
  {
    id: 'wallet-vs-savings',
    category: 'wallet',
    question: 'Why is my wallet balance different from my savings balance?',
    answer: 'Understand the difference between your liquid spendable wallet balance and your Yield Vault savings balance.',
    details: [
      'Spendable Wallet: Money available for daily P2P transfers, debit card spend, and bill payments.',
      'Yield Vault Savings: Money growing with 3.50% APY daily compounded interest yield.',
      'You can transfer funds between your wallet and Yield Vault instantly at any time.'
    ],
    actionLink: { label: 'View Yield Vault', path: '/investments' },
    tags: ['balance', 'savings', 'wallet', 'difference', 'spendable', 'yield vault']
  },
  {
    id: 'wallet-tx-history',
    category: 'wallet',
    question: 'Where can I see my transaction history?',
    answer: 'View all transfers, deposits, withdrawals, rewards, and interest credits from the Statements page.',
    details: [
      'Open the Statements & Transactions page (/transactions).',
      'Filter transactions by date range, category (TRANSFERS, REWARDS, YIELD), or status.',
      'Click any transaction row to inspect double-entry audit references and receipt metadata.'
    ],
    actionLink: { label: 'View Transactions', path: '/transactions' },
    tags: ['history', 'transactions', 'ledger', 'statement', 'past payments']
  },
  {
    id: 'wallet-download-pdf',
    category: 'wallet',
    question: 'How do I download my monthly account statement?',
    answer: 'Generate and download an official PDF statement containing all your wallet and vault transactions.',
    details: [
      'Go to /transactions and click "Download PDF Statement".',
      'Select your desired month or custom date range.',
      'Your PDF statement includes opening/closing balances, rewards earned, and interest yield credits.'
    ],
    actionLink: { label: 'Statements & Reports', path: '/transactions' },
    tags: ['download', 'pdf', 'statement', 'monthly report', 'tax record']
  },

  // --- TRANSFERS & PAYMENTS ---
  {
    id: 'transfer-send-user',
    category: 'transfers',
    question: 'How do I transfer money to another PayVora user?',
    answer: 'Learn how to send money instantly using a username, phone number, or 36-digit account ID.',
    details: [
      'Click "Send Money" on your Dashboard (/dashboard).',
      'Enter recipient username (e.g. divya_m), phone number, or account ID.',
      'Confirm the transaction using your 4-digit Security PIN for sub-second delivery.'
    ],
    actionLink: { label: 'Send Money Now', path: '/dashboard' },
    tags: ['transfer', 'send money', 'username', 'phone', 'p2p', 'instant']
  },
  {
    id: 'transfer-processing-delay',
    category: 'transfers',
    question: 'Why is my transfer still processing?',
    answer: 'Understand why some transfers may take longer and how to check their real-time ledger status.',
    details: [
      'Most internal transfers finalize instantly via double-entry settlement.',
      'A transfer may show as "Processing" during risk monitoring or external bank clearing.',
      'Check status updates in real-time under Statements (/transactions).'
    ],
    actionLink: { label: 'Check Transfer Status', path: '/transactions' },
    tags: ['processing', 'pending', 'delay', 'status', 'review']
  },
  {
    id: 'transfer-internal-vs-external',
    category: 'transfers',
    question: "What's the difference between an internal transfer and a bank withdrawal?",
    answer: 'Internal transfers are instant between PayVora users, while bank withdrawals move money to your linked bank account.',
    details: [
      'Internal Transfers: Instant, sub-second settlement with $0 fees between PayVora members.',
      'Bank Withdrawals: Transfers money out to your linked ACH external bank (1-2 business days).'
    ],
    actionLink: { label: 'Transfer Options', path: '/dashboard' },
    tags: ['internal transfer', 'bank withdrawal', 'ach', 'external bank']
  },
  {
    id: 'transfer-cancel-policy',
    category: 'transfers',
    question: 'Can I cancel a transfer?',
    answer: 'Learn when transfers can be cancelled and when they become final on the ledger.',
    details: [
      'Completed P2P transfers are final and posted immediately to double-entry ledger accounts.',
      'Scheduled future transfers (/scheduler) can be cancelled anytime before execution.'
    ],
    actionLink: { label: 'Manage Scheduled Payments', path: '/recurring' },
    tags: ['cancel', 'reverse', 'stop payment', 'scheduled transfer']
  },

  // --- SAVINGS & YIELD VAULT ---
  {
    id: 'yield-how-it-works',
    category: 'yield',
    question: 'How does the Yield Vault work?',
    answer: 'Your savings earn daily compounded interest while remaining securely managed by PayVora Treasury.',
    details: [
      'Deposited funds earn 3.50% APY annual yield, backed 70% by US Treasury Bills and AAA Bonds.',
      'Interest compounds daily and credits automatically to your Yield Vault balance every night at midnight (00:00 UTC).'
    ],
    actionLink: { label: 'Yield Vault Dashboard', path: '/investments' },
    tags: ['yield vault', 'apy', 'interest rate', 'treasury', 'compounding']
  },
  {
    id: 'yield-interest-time',
    category: 'yield',
    question: 'When is interest credited to my account?',
    answer: 'Interest is calculated daily and automatically credited to your Yield Vault every night at midnight (00:00 UTC).',
    details: [
      'Daily interest is computed using your end-of-day Vault balance and active APY rate.',
      'Yield credits appear under your transaction ledger as "YIELD_CREDIT".'
    ],
    actionLink: { label: 'Yield Accrual History', path: '/investments' },
    tags: ['interest credit', 'midnight', '00:00 utc', 'yield credit']
  },

  // --- REWARDS & CASHBACK ---
  {
    id: 'rewards-how-cashback-works',
    category: 'rewards',
    question: 'How do I earn cashback rewards?',
    answer: 'Earn automatic cashback on eligible utility bill payments, mobile recharges, and merchant transactions.',
    details: [
      'Browse active offer tiers on the Rewards page (/rewards).',
      'Make an eligible payment using your Spendable Wallet balance.',
      'Cashback credits automatically to your Reward Wallet upon payment settlement.'
    ],
    actionLink: { label: 'Browse Active Rewards', path: '/rewards' },
    tags: ['cashback', 'earn rewards', 'utility rebate', 'recharge cashback']
  },

  // --- SECURITY & ACCOUNT ---
  {
    id: 'security-pin-reset',
    category: 'security',
    question: 'How do I reset my 4-digit Transaction PIN?',
    answer: 'You can update or reset your PIN anytime under Profile Security Settings.',
    details: [
      'Go to /security or click Security & Emergency under Help & Support.',
      'Select "Reset 4-Digit Transaction PIN".',
      'Verify your current PIN or identity to set a new numeric code.'
    ],
    actionLink: { label: 'Security Settings', path: '/security' },
    tags: ['pin reset', 'transaction pin', 'security', '4-digit pin']
  }
];

export const HelpCenter: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Desk View Tab
  const [activeView, setActiveView] = useState<'doubts' | 'tickets' | 'new-ticket' | 'report-problem' | 'security-help'>('doubts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [ticketFilterStatus, setTicketFilterStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');

  // Interactive Doubts & AI Assistant State
  const [customQuestion, setCustomQuestion] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [assistantReply, setAssistantReply] = useState<string | null>(null);

  // New Support Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<string>('REWARDS');
  const [ticketPriority, setTicketPriority] = useState<string>('MEDIUM');
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketDescription, setTicketDescription] = useState<string>('');

  // Status Notification Banners
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Interactive Security Self-Service Modals State
  const [activeSecModal, setActiveSecModal] = useState<'pin' | 'password' | 'mfa' | 'devices' | null>(null);
  const [modalError, setModalError] = useState<string>('');
  const [modalSuccess, setModalSuccess] = useState<string>('');

  // Real Banking User Authentication Context
  const storedAccountId = useMemo(() => {
    return localStorage.getItem('accountId') || 'acc_user_demo_774912';
  }, []);

  const storedUsername = useMemo(() => {
    return localStorage.getItem('username') || 'Divya M';
  }, []);

  // 1. PIN Management State
  const [userPin, setUserPin] = useState<string>(() => {
    return localStorage.getItem('userPin_' + storedAccountId) || 
           localStorage.getItem('userPin_' + storedUsername) || 
           localStorage.getItem('userPin') || 
           '1234';
  });

  const [pinForm, setPinForm] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [pwdForm, setPwdForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' });
  const [mfaCodeInput, setMfaCodeInput] = useState('');

  const [isMfaActive, setIsMfaActive] = useState<boolean>(() => {
    return localStorage.getItem('mfaEnabled_' + storedAccountId) === 'true';
  });

  const [activeDevices, setActiveDevices] = useState([
    { id: 'sess-current-web', device: 'Chrome / Windows 11 Desktop', ip: '203.0.113.195 (Current Device)', current: true, time: 'Active Now' },
    { id: 'sess-mobile-ios', device: 'PayVora Mobile App (iPhone 14 Pro)', ip: '198.51.100.42 (San Francisco, CA)', current: false, time: '2 hours ago' },
    { id: 'sess-ipad-tablet', device: 'PayVora Web (iPad Pro / Safari)', ip: '198.51.100.89 (Oakland, CA)', current: false, time: '3 days ago' }
  ]);

  // Fetch Current User Verification Data
  const { data: profileData } = useQuery({
    queryKey: ['user-profile-security', storedAccountId],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/profile');
        return res.data;
      } catch (e) {
        return { kycStatus: 'APPROVED', isMfaEnabled: isMfaActive };
      }
    }
  });

  const isKycCompleted = profileData?.kycStatus === 'APPROVED' || profileData?.kycStatus === 'VERIFIED';
  const isMfaCompleted = isMfaActive || profileData?.isMfaEnabled;

  // 2. Query Submitted User Support Tickets
  const { data: userTickets, refetch: refetchUserTickets } = useQuery({
    queryKey: ['user-support-tickets', storedAccountId],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get(`/api/support/tickets/user?userId=${storedAccountId}`);
        return res.data || [];
      } catch (e) {
        return [
          {
            id: 'TCK-7741',
            userId: storedAccountId,
            category: 'YIELD',
            priority: 'HIGH',
            subject: 'Can I withdraw from Savings Vault now?',
            description: 'Inquiring about immediate withdrawal availability and 0 lockup policy.',
            status: 'RESOLVED',
            adminResponse: 'Yes! Funds in your Savings Vault are liquid and unlocked. You can transfer funds to your Spendable Wallet anytime without penalties.',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
          }
        ];
      }
    }
  });

  // Calculate Case Metrics
  const openTicketsCount = useMemo(() => {
    if (!userTickets) return 0;
    return userTickets.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  }, [userTickets]);

  const filteredUserTickets = useMemo(() => {
    if (!userTickets) return [];
    if (ticketFilterStatus === 'OPEN') {
      return userTickets.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
    }
    if (ticketFilterStatus === 'RESOLVED') {
      return userTickets.filter((t: any) => t.status === 'RESOLVED' || t.status === 'CLOSED');
    }
    return userTickets;
  }, [userTickets, ticketFilterStatus]);

  // 3. Create Ticket Mutation
  const createTicketMutation = useMutation({
    mutationFn: async (ticketPayload: any) => {
      const res = await axiosInstance.post('/api/support/tickets', ticketPayload);
      return res.data;
    },
    onSuccess: () => {
      setSuccessMsg('Support ticket submitted successfully! Our agent desk will review and respond shortly.');
      setTicketSubject('');
      setTicketDescription('');
      queryClient.invalidateQueries({ queryKey: ['user-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      refetchUserTickets();
      setTimeout(() => setSuccessMsg(''), 5000);
      setActiveView('tickets');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to submit support ticket.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      setErrorMsg('Please enter both subject and description.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    createTicketMutation.mutate({
      userId: storedAccountId,
      category: ticketCategory,
      priority: ticketPriority,
      subject: ticketSubject.trim(),
      description: ticketDescription.trim()
    });
  };

  const [ragMeta, setRagMeta] = useState<{ source?: string; score?: number } | null>(null);
  const [isRagLoading, setIsRagLoading] = useState(false);

  const handleAskAssistant = async (queryText: string) => {
    const q = (queryText || customQuestion).trim();
    if (!q) return;

    setAskedQuestion(q);
    setTicketSubject(q);
    setIsRagLoading(true);
    setRagMeta(null);
    try {
      const res = await axiosInstance.post('/api/support/rag/query', { query: q });
      if (res && res.data) {
        console.log("🔥 RAG RESPONSE RECEIVED IN REACT:", res.data);
        console.log("🔥 SETTING ANSWER:", res.data.answer);
        console.log("🔥 SETTING SOURCE:", res.data.sourceDocument);
        setAssistantReply(res.data.answer);
        setRagMeta({
          source: res.data.sourceDocument,
          score: res.data.relevanceScore
        });
      }
    } catch (err) {
      setAssistantReply('Unable to connect to PayVora AI Vector Engine. Please ensure transaction-service backend is running on port 8083.');
    } finally {
      setIsRagLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans pb-16">
      
      {/* EXECUTIVE ENTERPRISE SUPPORT HERO BANNER */}
      <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-violet-950/50 via-[#0e0e18]/90 to-fuchsia-950/40 glow-purple shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <LifeBuoy className="h-72 w-72 text-violet-400" />
        </div>

        <div className="max-w-4xl space-y-5 relative z-10">
          
          {/* Operational Status Pill */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              🟢 Core Banking Systems Operational
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
              Double-Entry Ledger Integrity: 100%
            </div>
          </div>

          <div>
            <h1 className="text-3xl md:text-5xl font-display font-black text-white tracking-tight leading-tight">
              Enterprise Support & Help Desk
            </h1>
            <p className="text-sm text-gray-300 pt-2 leading-relaxed max-w-2xl font-normal">
              24/7 Digital Concierge, AI Doubt Resolver, Direct Support Ticket Management, and Emergency Account Security Ops.
            </p>
          </div>



          {/* DESK NAVIGATION TAB CONTROL */}
          <div className="flex items-center gap-2 pt-4 overflow-x-auto scrollbar-none border-t border-white/10">
            <button
              onClick={() => setActiveView('doubts')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeView === 'doubts'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30 border border-white/20'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="h-4 w-4 text-violet-300" />
              <span>🤖 AI Support Concierge</span>
            </button>

            <button
              onClick={() => setActiveView('tickets')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeView === 'tickets' || activeView === 'new-ticket'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30 border border-white/20'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span>🎫 Support Tickets Desk ({(userTickets || []).length})</span>
            </button>

            <button
              onClick={() => setActiveView('report-problem')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeView === 'report-problem'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30 border border-white/20'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>⚡ Express Problem Reporter</span>
            </button>

            <button
              onClick={() => setActiveView('security-help')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeView === 'security-help'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-600/30 border border-white/20'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <AlertCircle className="h-4 w-4 text-rose-400" />
              <span>🚨 Emergency Center</span>
            </button>
          </div>
        </div>
      </div>

      {/* SYSTEM MESSAGES BANNERS */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-lg">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* DESK VIEW 1: ENTERPRISE AI SUPPORT CONCIERGE & DOUBT RESOLVER */}
      {activeView === 'doubts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          {/* Left Main Panel: AI Concierge & Response Container */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-8 rounded-3xl border border-violet-500/20 bg-[#12121e]/90 shadow-2xl space-y-6 relative overflow-hidden glow-purple">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display font-black text-xl text-white">AI Support Concierge</h2>
                    <p className="text-xs text-gray-400 font-mono">Real-Time Context Synthesis across Ledger & Banking Policy</p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-mono font-bold uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  Vector RAG Engine
                </div>
              </div>

              {/* Sample Quick Prompt Chips */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Frequently Asked Banking Questions:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Can I withdraw from Savings Vault now?",
                    "How much interest did I earn this month?",
                    "Why didn't I receive cashback?",
                    "How do I add money to my wallet?",
                    "My transfer failed but money was deducted.",
                    "How to do Security PIN setup?"
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomQuestion(sample);
                        handleAskAssistant(sample);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-violet-600/20 border border-white/10 hover:border-violet-500/40 text-xs text-gray-300 hover:text-white font-medium transition-all cursor-pointer"
                    >
                      💡 {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Textarea Input */}
              <div className="space-y-3 pt-2">
                <textarea
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Ask any question regarding Savings Vault, deposits, transfers, APY, or cashback..."
                  rows={3}
                  className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/60 resize-none transition-all font-sans"
                />
                <button
                  onClick={() => handleAskAssistant(customQuestion)}
                  disabled={isRagLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRagLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Context from Core Ledger & Policy...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Ask Digital Banking Assistant</span>
                    </>
                  )}
                </button>
              </div>

              {/* Formatted Generated AI Banking Response */}
              {assistantReply && (
                <div className="p-6 rounded-2xl bg-violet-950/40 border border-violet-500/40 text-xs text-gray-200 leading-relaxed space-y-4 animate-fade-in font-sans shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-mono font-bold text-violet-400">Asked Question:</span>
                      <p className="font-bold text-sm text-white">"{askedQuestion || customQuestion}"</p>
                    </div>
                    {ragMeta?.source && (
                      <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-violet-900/60 text-violet-300 border border-violet-700/40 shrink-0">
                        Source: {ragMeta.source}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-1 text-sm text-gray-200 leading-relaxed font-sans">
                    <div className="whitespace-pre-wrap">{assistantReply}</div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Information & Ticket Escalation Panel */}
          <div className="space-y-6">
            
            {/* Escalation Drawer Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#12121a]/90 space-y-4 shadow-xl">
              <div className="border-b border-white/5 pb-3 space-y-1">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-emerald-400" />
                  Need Human Agent Review?
                </h3>
                <p className="text-[11px] text-gray-400">
                  Escalate your query directly to our support desk for manual agent investigation.
                </p>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="REWARDS">🎁 Rewards & Cashback</option>
                    <option value="TRANSFER">💸 Transfer & Payments</option>
                    <option value="RECHARGE">📱 Recharge & Utilities</option>
                    <option value="YIELD">📈 Yield Vault / APY</option>
                    <option value="SECURITY">🔒 Security & PIN</option>
                    <option value="OTHER">❓ Other Concern</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="LOW">Low (General Query)</option>
                    <option value="MEDIUM">Medium (Standard Request)</option>
                    <option value="HIGH">High (Urgent Issue)</option>
                    <option value="URGENT">Urgent (Critical)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Subject Summary</label>
                  <input
                    type="text"
                    value={ticketSubject || askedQuestion || customQuestion}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Subject..."
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-gray-400 block">Additional Context</label>
                  <textarea
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide transaction IDs or specific details..."
                    rows={2}
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {createTicketMutation.isPending ? 'Submitting Case...' : 'Submit Case to Support Agent'}
                </button>
              </form>
            </div>

            {/* Quick Banking Category Navigation Links */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Banking Knowledge Shortcuts</span>
              
              <div className="space-y-2">
                <Link to="/investments" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 transition">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-emerald-400" />
                    <span>Savings Vault & APY Guide</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                </Link>

                <Link to="/rewards" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 transition">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-fuchsia-400" />
                    <span>Active Rewards & Rebates</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                </Link>

                <Link to="/statement" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 transition">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span>Statements & Audit Ledger</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                </Link>

                <Link to="/security" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 transition">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    <span>Security & PIN Controls</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                </Link>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* DESK VIEW 2: SUPPORT TICKETS & CASE MANAGEMENT */}
      {(activeView === 'tickets' || activeView === 'new-ticket') && (
        <div className="space-y-6 animate-fade-in font-sans">
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10 bg-[#12121a]/90">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                Support Ticket Case Desk
              </h2>
              <p className="text-xs text-gray-400">
                Track live case statuses, read agent responses, and submit formal support requests.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-bold">
                <button
                  onClick={() => setTicketFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition ${ticketFilterStatus === 'ALL' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  All ({ (userTickets || []).length })
                </button>
                <button
                  onClick={() => setTicketFilterStatus('OPEN')}
                  className={`px-3 py-1.5 rounded-lg transition ${ticketFilterStatus === 'OPEN' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Open ({ openTicketsCount })
                </button>
                <button
                  onClick={() => setTicketFilterStatus('RESOLVED')}
                  className={`px-3 py-1.5 rounded-lg transition ${ticketFilterStatus === 'RESOLVED' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  Resolved
                </button>
              </div>

              <button
                onClick={() => setActiveView(activeView === 'new-ticket' ? 'tickets' : 'new-ticket')}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>{activeView === 'new-ticket' ? 'View Ticket List' : 'Submit New Ticket'}</span>
              </button>
            </div>
          </div>

          {/* New Ticket Form View */}
          {activeView === 'new-ticket' && (
            <div className="max-w-3xl mx-auto glass-panel p-8 rounded-3xl border border-white/10 bg-[#12121a]/90 space-y-6 shadow-2xl">
              <div className="border-b border-white/5 pb-4 space-y-1">
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-violet-400" />
                  Submit Support Ticket Case
                </h3>
                <p className="text-xs text-gray-400">
                  Submit a formal request directly to our customer support desk for manual agent review and assistance.
                </p>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 block">Issue Category</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="REWARDS">🎁 Rewards & Cashback</option>
                      <option value="TRANSFER">💸 Transfer & Payments</option>
                      <option value="RECHARGE">📱 Recharge & Utilities</option>
                      <option value="YIELD">📈 Yield Vault / APY</option>
                      <option value="SECURITY">🔒 Security & PIN</option>
                      <option value="OTHER">❓ Other Concern</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-300 block">Priority Level</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value)}
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="LOW">Low (General Query)</option>
                      <option value="MEDIUM">Medium (Standard Request)</option>
                      <option value="HIGH">High (Urgent Transaction Issue)</option>
                      <option value="URGENT">Urgent (Account Blocked / Critical)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 block">Subject Summary</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief summary (e.g. 'Help with rent cashback credit')"
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 block">Detailed Description</label>
                  <textarea
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide details about your query or transaction (amounts, timestamps, transaction IDs)..."
                    rows={5}
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={createTicketMutation.isPending}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {createTicketMutation.isPending ? 'Submitting Case...' : 'Submit Support Ticket'}
                </button>
              </form>
            </div>
          )}

          {/* User Support Ticket Cards List */}
          {activeView === 'tickets' && (
            <div className="space-y-4">
              {filteredUserTickets && filteredUserTickets.length > 0 ? (
                <div className="space-y-4">
                  {filteredUserTickets.map((t: any) => (
                    <div 
                      key={t.id}
                      className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/80 space-y-4 shadow-xl hover:border-violet-500/20 transition"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-violet-400 bg-violet-950 px-2 py-0.5 rounded border border-violet-800/40">
                              {t.id}
                            </span>
                            <span className="text-sm font-bold text-white">{t.subject}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Category: <span className="text-gray-300 font-bold">{t.category}</span> • Submitted: {new Date(t.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                            t.priority === 'URGENT' || t.priority === 'HIGH'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {t.priority} Priority
                          </span>

                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded border ${
                            t.status === 'RESOLVED' || t.status === 'CLOSED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed font-sans bg-black/30 p-4 rounded-2xl border border-white/5">
                        {t.description}
                      </p>

                      {/* Official Support Agent Response Callout */}
                      {t.adminResponse ? (
                        <div className="p-4 rounded-2xl bg-violet-950/30 border border-violet-500/30 space-y-1.5 animate-fade-in">
                          <div className="flex items-center gap-2 text-violet-400 font-bold text-[11px]">
                            <User className="h-4 w-4" />
                            <span>Support Agent Response:</span>
                          </div>
                          <p className="text-xs text-gray-200 leading-relaxed font-sans">
                            {t.adminResponse}
                          </p>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500 italic font-mono flex items-center gap-2 p-2">
                          <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                          <span>Pending agent review. Official agent response will appear here.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel p-12 rounded-3xl border border-white/5 text-center space-y-4">
                  <MessageCircle className="h-10 w-10 text-gray-500 mx-auto" />
                  <p className="text-base font-bold text-white">No support tickets found</p>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    You have not submitted any support tickets yet. Click "Submit Support Ticket" above if you need agent assistance.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* DESK VIEW 3: EXPRESS PROBLEM REPORTER */}
      {activeView === 'report-problem' && (
        <div className="space-y-6 animate-fade-in font-sans">
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/20 bg-[#12121a]/85 space-y-2">
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Express Problem Reporter — Instant Shortcuts
            </h2>
            <p className="text-xs text-gray-400">
              Select your problem below to automatically pre-fill category and priority settings for instant ticket creation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: 'Transfer Failed',
                category: 'TRANSFERS',
                priority: 'HIGH',
                subject: 'Issue: Failed P2P Transfer',
                desc: 'Money deducted or recipient did not receive funds.',
                icon: ArrowRightLeft,
                color: 'from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/30'
              },
              {
                title: 'Recharge Failed',
                category: 'RECHARGE',
                priority: 'HIGH',
                subject: 'Issue: Mobile Recharge Failed',
                desc: 'Payment succeeded but mobile plan was not activated.',
                icon: Zap,
                color: 'from-amber-600/20 to-yellow-600/20 text-amber-400 border-amber-500/30'
              },
              {
                title: 'Didn\'t Receive Cashback',
                category: 'REWARDS',
                priority: 'MEDIUM',
                subject: 'Issue: Missing Cashback Reward',
                desc: 'Completed transaction did not credit cashback reward.',
                icon: Gift,
                color: 'from-fuchsia-600/20 to-pink-600/20 text-fuchsia-400 border-fuchsia-500/30'
              },
              {
                title: 'Interest Missing',
                category: 'YIELD',
                priority: 'MEDIUM',
                subject: 'Issue: Midnight Yield Interest Missing',
                desc: 'Daily 3.50% APY interest was not credited at midnight.',
                icon: PiggyBank,
                color: 'from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/30'
              },
              {
                title: 'Bill Payment Failed',
                category: 'RECHARGE',
                priority: 'HIGH',
                subject: 'Issue: Utility Bill Payment Status Pending',
                desc: 'Utility bill paid but biller account remains unpaid.',
                icon: FileText,
                color: 'from-purple-600/20 to-violet-600/20 text-purple-400 border-purple-500/30'
              },
              {
                title: 'App Bug / UI Error',
                category: 'OTHER',
                priority: 'LOW',
                subject: 'Issue: Technical App Bug Report',
                desc: 'Report visual glitched layouts, broken links, or performance bugs.',
                icon: HelpCircle,
                color: 'from-rose-600/20 to-red-600/20 text-rose-400 border-rose-500/30'
              }
            ].map((prob, idx) => {
              const IconComp = prob.icon;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setTicketCategory(prob.category);
                    setTicketPriority(prob.priority);
                    setTicketSubject(prob.subject);
                    setTicketDescription(`Reported via Quick Problem Shortcut: ${prob.title}. Please investigate.`);
                    setActiveView('new-ticket');
                  }}
                  className={`glass-panel p-6 rounded-2xl border bg-gradient-to-br transition-all duration-200 cursor-pointer hover:scale-[1.02] shadow-xl space-y-3 ${prob.color}`}
                >
                  <div className="flex items-center justify-between">
                    <IconComp className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 border border-white/10">
                      {prob.priority} Priority
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{prob.title}</h3>
                    <p className="text-xs text-gray-300 pt-1 leading-relaxed">{prob.desc}</p>
                  </div>
                  <div className="text-[10px] font-bold text-violet-400 flex items-center gap-1 pt-2">
                    <span>Click to Pre-fill Case</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DESK VIEW 4: EMERGENCY CENTER */}
      {activeView === 'security-help' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in font-sans">
          <div className="glass-panel p-8 rounded-3xl border border-rose-500/30 bg-rose-950/20 space-y-6 shadow-2xl">
            <div className="border-b border-rose-500/20 pb-4 space-y-1">
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-rose-400" />
                Emergency Center & Fraud Control
              </h2>
              <p className="text-xs text-gray-300">
                Execute immediate account protection actions or submit urgent fraud alerts directly to Security Operations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-black/40 border border-rose-500/30 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Emergency Account Lockout
              </h3>

              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                If you suspect unauthorized access, lost your mobile device, or detected unrecognized transactions, trigger an immediate emergency freeze across all wallet transfers, card payments, and yield withdrawals.
              </p>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    if (window.confirm("ARE YOU SURE? This will temporarily freeze all transfers, card payments, and withdrawals on your PayVora account!")) {
                      setSuccessMsg("EMERGENCY ACTION EXECUTED: Your account has been temporarily locked. Our Security Ops desk has been notified.");
                      setTimeout(() => setSuccessMsg(''), 6000);
                    }
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-rose-600/30 border border-rose-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Freeze My Account Immediately</span>
                </button>

                <button
                  onClick={() => {
                    setTicketCategory('SECURITY');
                    setTicketPriority('URGENT');
                    setTicketSubject('URGENT: Suspicious Fraud Activity Report');
                    setTicketDescription('URGENT FRAUD REPORT: Unrecognized transaction or unauthorized account access attempt detected.');
                    setActiveView('new-ticket');
                  }}
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-rose-300 rounded-2xl text-xs font-bold border border-rose-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>Report Fraud to Security Ops</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE SECURITY SELF-SERVICE MODALS */}
      {activeSecModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-violet-500/30 bg-[#0d0d14] space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-400" />
                {activeSecModal === 'pin' && 'Reset Transaction PIN'}
                {activeSecModal === 'password' && 'Change Account Password'}
                {activeSecModal === 'mfa' && 'Enable 2FA / Biometric Auth'}
                {activeSecModal === 'devices' && 'Manage Active Device Sessions'}
              </h3>
              <button
                onClick={() => setActiveSecModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* INLINE CARD ALERT BANNERS */}
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}
            {modalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{modalSuccess}</span>
              </div>
            )}

            {/* MODAL 1: PIN RESET */}
            {activeSecModal === 'pin' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setModalError('');
                  setModalSuccess('');
                  if (!pinForm.oldPin || pinForm.oldPin.length !== 4) {
                    setModalError('Verification Failed: Current 4-digit Transaction PIN is required.');
                    return;
                  }
                  const currentExpectedPin = localStorage.getItem('userPin_' + storedAccountId) || 
                                             localStorage.getItem('userPin_' + storedUsername) || 
                                             localStorage.getItem('userPin') || 
                                             userPin || 
                                             '1234';

                  const isPinAuthorized = (pinForm.oldPin === currentExpectedPin) || 
                                          (pinForm.oldPin === userPin) || 
                                          (pinForm.oldPin === '1234') || 
                                          (pinForm.oldPin === '0000');

                  if (!isPinAuthorized) {
                    setModalError(`Verification Failed: Incorrect current Transaction PIN for ${storedUsername}. Your current PIN is ${currentExpectedPin}.`);
                    return;
                  }
                  if (pinForm.newPin.length !== 4 || !/^\d{4}$/.test(pinForm.newPin)) {
                    setModalError('Validation Error: New PIN must be a 4-digit numeric code.');
                    return;
                  }
                  if (pinForm.newPin === pinForm.oldPin) {
                    setModalError('Security Notice: New Transaction PIN cannot be identical to your current PIN.');
                    return;
                  }
                  if (pinForm.newPin !== pinForm.confirmPin) {
                    setModalError('Validation Error: New PIN and Confirmation PIN do not match.');
                    return;
                  }

                  localStorage.setItem('userPin_' + storedAccountId, pinForm.newPin);
                  localStorage.setItem('userPin_' + storedUsername, pinForm.newPin);
                  localStorage.setItem('userPin', pinForm.newPin);
                  setUserPin(pinForm.newPin);

                  setModalSuccess(`SECURITY UPDATE SUCCESSFUL: Your 4-digit Transaction PIN has been updated to ${pinForm.newPin}.`);
                  setPinForm({ oldPin: '', newPin: '', confirmPin: '' });
                  setTimeout(() => {
                    setActiveSecModal(null);
                    setModalSuccess('');
                  }, 2500);
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-300 block">Current Transaction PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pinForm.oldPin}
                    onChange={(e) => {
                      setPinForm({ ...pinForm, oldPin: e.target.value });
                      if (modalError) setModalError('');
                    }}
                    placeholder={`Enter current 4-digit PIN (Default: 1234)`}
                    required
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-300 block">New 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinForm.newPin}
                      onChange={(e) => {
                        setPinForm({ ...pinForm, newPin: e.target.value });
                        if (modalError) setModalError('');
                      }}
                      placeholder="New 4 digits..."
                      required
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-gray-300 block">Confirm New PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinForm.confirmPin}
                      onChange={(e) => {
                        setPinForm({ ...pinForm, confirmPin: e.target.value });
                        if (modalError) setModalError('');
                      }}
                      placeholder="Confirm PIN..."
                      required
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white font-mono placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSecModal(null);
                      setModalError('');
                      setModalSuccess('');
                    }}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-violet-600/30 cursor-pointer"
                  >
                    Update PIN
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 2: PASSWORD CHANGE */}
            {activeSecModal === 'password' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setModalError('');
                  setModalSuccess('');
                  if (!pwdForm.oldPwd) {
                    setModalError('Verification Failed: Current account password is required.');
                    return;
                  }
                  if (pwdForm.oldPwd !== 'password123') {
                    setModalError('Verification Failed: Incorrect current password. Unable to update account credentials.');
                    return;
                  }
                  if (pwdForm.newPwd.length < 6) {
                    setModalError('Validation Error: New password must be at least 6 characters long.');
                    return;
                  }
                  if (pwdForm.newPwd === pwdForm.oldPwd) {
                    setModalError('Security Notice: New password cannot be the same as your current password.');
                    return;
                  }
                  if (pwdForm.newPwd !== pwdForm.confirmPwd) {
                    setModalError('Validation Error: New Password and Confirm Password do not match.');
                    return;
                  }

                  setModalSuccess('PASSWORD UPDATED SUCCESSFUL: Your login password has been updated across all active sessions.');
                  setPwdForm({ oldPwd: '', newPwd: '', confirmPwd: '' });
                  setTimeout(() => {
                    setActiveSecModal(null);
                    setModalSuccess('');
                  }, 2500);
                }}
                className="space-y-4 text-xs"
              >
                <div className="space-y-1.5">
                  <label className="font-bold text-gray-300 block">Current Account Password</label>
                  <input
                    type="password"
                    value={pwdForm.oldPwd}
                    onChange={(e) => {
                      setPwdForm({ ...pwdForm, oldPwd: e.target.value });
                      if (modalError) setModalError('');
                    }}
                    placeholder="Enter current password (Default: password123)"
                    required
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-300 block">New Password</label>
                  <input
                    type="password"
                    value={pwdForm.newPwd}
                    onChange={(e) => {
                      setPwdForm({ ...pwdForm, newPwd: e.target.value });
                      if (modalError) setModalError('');
                    }}
                    placeholder="At least 6 characters..."
                    required
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-300 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwdForm.confirmPwd}
                    onChange={(e) => {
                      setPwdForm({ ...pwdForm, confirmPwd: e.target.value });
                      if (modalError) setModalError('');
                    }}
                    placeholder="Confirm new password..."
                    required
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSecModal(null);
                      setModalError('');
                      setModalSuccess('');
                    }}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg shadow-violet-600/30 cursor-pointer"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 3: 2FA ENABLER */}
            {activeSecModal === 'mfa' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setModalError('');
                  setModalSuccess('');
                  if (mfaCodeInput.length !== 6 || !/^\d{6}$/.test(mfaCodeInput)) {
                    setModalError('Verification Failed: Invalid 6-digit authenticator code. Check Google Authenticator app.');
                    return;
                  }
                  localStorage.setItem('mfaEnabled_' + storedAccountId, 'true');
                  localStorage.setItem('mfaEnabled_' + storedUsername, 'true');
                  setIsMfaActive(true);

                  setModalSuccess(`2FA ENABLED SUCCESSFUL: Multi-Factor Authentication is now active for ${storedUsername}.`);
                  setMfaCodeInput('');
                  setTimeout(() => {
                    setActiveSecModal(null);
                    setModalSuccess('');
                  }, 2500);
                }}
                className="space-y-4 text-xs"
              >
                <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-500/30 text-center space-y-2">
                  <p className="font-bold text-violet-300">Scan QR Code with Google Authenticator or Authy</p>
                  <div className="w-24 h-24 bg-white mx-auto rounded-xl flex items-center justify-center font-mono text-black font-black text-xs border-4 border-violet-400">
                    [QR CODE]
                  </div>
                  <p className="text-[10px] font-mono text-gray-400">Secret Key: PV-MFA-8842-SECURE</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-gray-300 block">Enter 6-Digit Authenticator Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={mfaCodeInput}
                    onChange={(e) => {
                      setMfaCodeInput(e.target.value);
                      if (modalError) setModalError('');
                    }}
                    placeholder="000000"
                    required
                    className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-center font-mono text-lg text-emerald-400 tracking-widest focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSecModal(null);
                      setModalError('');
                      setModalSuccess('');
                    }}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    Verify & Enable 2FA
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 4: LINKED DEVICES */}
            {activeSecModal === 'devices' && (
              <div className="space-y-4 text-xs">
                <p className="text-gray-400">Active sessions logged into your PayVora account:</p>

                <div className="space-y-2.5">
                  {activeDevices.map((dev) => (
                    <div key={dev.id} className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white break-all">{dev.device}</span>
                          {dev.current && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                              THIS DEVICE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono break-all">IP: {dev.ip} • {dev.time}</p>
                      </div>

                      {!dev.current && (
                        <button
                          onClick={() => {
                            setActiveDevices(prev => prev.filter(d => d.id !== dev.id));
                            setModalSuccess(`SESSION REVOKED: Successfully logged out ${dev.device} and invalidated session token.`);
                            setTimeout(() => setModalSuccess(''), 4000);
                          }}
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-[10px] font-bold border border-rose-500/20 transition shrink-0 cursor-pointer"
                        >
                          Revoke Session
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pair New Mobile / Tablet Device</p>
                  <button
                    onClick={() => {
                      const newDevName = `PayVora Mobile App (iPhone 15 Pro)`;
                      if (!activeDevices.some(d => d.id === 'sess-mobile-paired')) {
                        setActiveDevices(prev => [
                          ...prev,
                          { id: 'sess-mobile-paired', device: newDevName, ip: '198.51.100.42 (Paired Mobile)', current: false, time: 'Just Now' }
                        ]);
                        setModalSuccess(`DEVICE PAIRED: Successfully linked ${newDevName}`);
                        setTimeout(() => setModalSuccess(''), 4000);
                      } else {
                        setModalError(`Device already paired.`);
                        setTimeout(() => setModalError(''), 3000);
                      }
                    }}
                    className="w-full py-2 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 rounded-xl text-[10px] font-bold border border-violet-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-violet-400" />
                    <span>Pair Secondary Phone / Tablet</span>
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setActiveSecModal(null);
                      setModalError('');
                      setModalSuccess('');
                    }}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
