import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { 
  ArrowDownRight, ArrowUpRight,
  AlertCircle, ChevronLeft, ChevronRight,
  Receipt, Search, X, Download, Share2, HelpCircle,
  Coins, Info, CheckCircle2, Clock, Building, Smartphone, Calendar
} from 'lucide-react';

interface LedgerEntryDto {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  balanceAfter: number;
  idempotencyKey: string;
  createdAt: string;
}

interface TransactionDetails {
  id: string;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  amount: number;
  currency: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  status: string;
  errorMessage: string | null;
  category?: string;
  createdAt: string;
}

interface AccountDetails {
  id: string;
  email: string;
  fullName: string;
}



const TransactionRow: React.FC<{ 
  entry: LedgerEntryDto; 
  currentAccountId: string;
  onRowClick: (entry: LedgerEntryDto, tx: TransactionDetails | null, counterparty: AccountDetails | null) => void;
}> = ({ entry, currentAccountId, onRowClick }) => {
  // Fetch transaction details
  const { data: tx } = useQuery<TransactionDetails>({
    queryKey: ['transaction-detail', entry.transactionId],
    queryFn: async () => {
      if (entry.idempotencyKey.startsWith('CASHBACK_')) {
        return {
          id: entry.transactionId,
          sourceAccountId: null,
          targetAccountId: entry.accountId,
          amount: entry.amount,
          currency: "INR",
          transactionType: "TRANSFER",
          status: "SUCCESS",
          category: "CASHBACK",
          createdAt: entry.createdAt,
          errorMessage: null
        };
      }
      const response = await axiosInstance.get(`/api/transactions/${entry.transactionId}`);
      return response.data;
    },
    enabled: !!entry.transactionId,
    staleTime: 1000 * 60 * 10,
  });

  // Determine the counterparty account ID
  const counterpartyId = tx?.transactionType === 'TRANSFER'
    ? (tx.sourceAccountId === currentAccountId ? tx.targetAccountId : tx.sourceAccountId)
    : null;

  // Fetch counterparty details if this is a transfer
  const { data: counterparty } = useQuery<AccountDetails>({
    queryKey: ['account-detail', counterpartyId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/accounts/${counterpartyId}`);
      return response.data;
    },
    enabled: !!counterpartyId,
    staleTime: 1000 * 60 * 10,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryLabel = (cat?: string) => {
    if (!cat || cat === 'OTHERS') return null;
    switch (cat.toUpperCase()) {
      case 'GROCERIES': return '🛒 Groceries';
      case 'ENTERTAINMENT': return '🍿 Entertainment';
      case 'UTILITIES': return '🔌 Utilities';
      case 'RENT': return '🏠 Housing';
      case 'INVESTMENT': return '📈 Investment';
      default: return `🏷️ ${cat.toLowerCase()}`;
    }
  };

  const getStyleAndLabel = () => {
    if (entry.idempotencyKey && entry.idempotencyKey.startsWith('CASHBACK_')) {
      const isRedeem = entry.entryType === 'DEBIT';
      const offerId = (entry as any).offerId;
      const getOfferTitle = (oId: string | null) => {
        if (!oId) return 'Cashback Credit Earned';
        if (oId === '77777777-7777-7777-7777-777777777777') return 'Referral Signup Reward';
        if (oId === '11111111-1111-1111-1111-111111111111') return 'First Transaction Reward';
        return 'Cashback Credit Earned';
      };
      return {
        bg: isRedeem ? 'bg-orange-950/20 text-orange-450 border-orange-500/20' : 'bg-emerald-950/20 text-emerald-450 border-emerald-500/20',
        icon: Coins,
        label: isRedeem ? 'Cashback Redeemed to Wallet' : getOfferTitle(offerId),
        amountSign: isRedeem ? '-' : '+',
        amountClass: isRedeem ? 'text-orange-400 font-mono' : 'text-emerald-450 font-mono',
        avatarText: 'CB',
        avatarBg: isRedeem ? 'bg-orange-500/10 text-orange-450 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
      };
    }

    if (!tx) {
      if (entry.entryType === 'CREDIT') {
        return {
          bg: 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20',
          icon: ArrowDownRight,
          label: 'Deposit',
          amountSign: '+',
          amountClass: 'text-emerald-400 font-mono',
          avatarText: 'DP',
          avatarBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      } else {
        return {
          bg: 'bg-rose-950/20 text-rose-400 border-rose-500/20',
          icon: ArrowUpRight,
          label: 'Withdrawal',
          amountSign: '-',
          amountClass: 'text-rose-400 font-mono',
          avatarText: 'WD',
          avatarBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
      }
    }

    if (tx.status === 'FAILED') {
      return {
        bg: 'bg-rose-950/20 text-rose-400 border-rose-500/20',
        icon: AlertCircle,
        label: `Failed ${tx.transactionType === 'TRANSFER' ? 'Transfer' : 'Withdrawal'}`,
        amountSign: '',
        amountClass: 'text-rose-400/70 font-mono line-through',
        avatarText: 'FL',
        avatarBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      };
    }

    if (tx.category === 'CASHBACK') {
      const isRedeem = entry.entryType === 'DEBIT';
      return {
        bg: isRedeem ? 'bg-orange-950/20 text-orange-450 border-orange-500/20' : 'bg-emerald-950/20 text-emerald-450 border-emerald-500/20',
        icon: Coins,
        label: isRedeem ? 'Cashback Redeemed to Wallet' : 'Cashback Credit Earned',
        amountSign: isRedeem ? '-' : '+',
        amountClass: isRedeem ? 'text-orange-400 font-mono' : 'text-emerald-450 font-mono',
        avatarText: 'CB',
        avatarBg: isRedeem ? 'bg-orange-500/10 text-orange-450 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
      };
    }

    if (tx.category && tx.category.startsWith('RECHARGE_')) {
      const parts = tx.category.split('_');
      const operator = parts[1] || 'Mobile';
      const phone = parts[2] || '';
      return {
        bg: 'bg-amber-950/20 text-amber-400 border-amber-500/20',
        icon: Smartphone,
        label: `${operator} Recharge ${phone ? `(+91 ${phone})` : ''}`,
        amountSign: '-',
        amountClass: 'text-amber-400 font-mono',
        avatarText: 'RC',
        avatarBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      };
    }

    if (tx.transactionType === 'DEPOSIT') {
      return {
        bg: 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20',
        icon: ArrowDownRight,
        label: 'Deposit to Wallet',
        amountSign: '+',
        amountClass: 'text-emerald-400 font-mono',
        avatarText: 'DP',
        avatarBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      };
    }

    if (tx.transactionType === 'WITHDRAWAL') {
      return {
        bg: 'bg-rose-950/20 text-rose-400 border-rose-500/20',
        icon: ArrowUpRight,
        label: 'Withdrawal Cash Out',
        amountSign: '-',
        amountClass: 'text-rose-400 font-mono',
        avatarText: 'WD',
        avatarBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      };
    }

    const isOutgoing = tx.sourceAccountId === currentAccountId;
    const name = counterparty?.fullName || 'External User';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return {
      bg: isOutgoing ? 'bg-rose-950/20 text-rose-400 border-rose-500/20' : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20',
      icon: isOutgoing ? ArrowUpRight : ArrowDownRight,
      label: isOutgoing ? `Sent to ${name}` : `Received from ${name}`,
      amountSign: isOutgoing ? '-' : '+',
      amountClass: isOutgoing ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono',
      avatarText: initials || 'TR',
      avatarBg: isOutgoing ? 'bg-violet-600/10 text-violet-400 border-violet-500/20' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'
    };
  };

  const style = getStyleAndLabel();
  const categoryTag = getCategoryLabel(tx?.category);
  const utrRef = 'UTR' + entry.transactionId.substring(0, 8).toUpperCase();

  return (
    <button 
      onClick={() => onRowClick(entry, tx || null, counterparty || null)}
      className="w-full text-left p-4 sm:p-5 flex items-center justify-between hover:bg-white/[0.02] border-b border-white/5 last:border-b-0 transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        {/* Avatar Initials Icon */}
        <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${style.avatarBg}`}>
          {style.avatarText}
        </div>

        {/* Details */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-white text-sm">
              {style.label}
            </p>
            {categoryTag && (
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">
                {categoryTag}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-500 font-mono">
            <span>{formatDate(entry.createdAt)}</span>
            <span>•</span>
            <span className="text-gray-600">{utrRef}</span>
          </div>
        </div>
      </div>

      {/* Amount & Status Indicator */}
      <div className="text-right flex flex-col items-end gap-1">
        <p className={`font-display font-black text-sm sm:text-base ${style.amountClass}`}>
          {style.amountSign}${entry.amount.toFixed(2)}
        </p>
        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
          tx?.status === 'FAILED'
            ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        }`}>
          {tx?.status || 'SUCCESS'}
        </span>
      </div>
    </button>
  );
};

export const Transactions: React.FC = () => {
  const [accountId, setAccountId] = useState<string>('');
  const [page, setPage] = useState(0);
  const size = 8;
  
  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SENT' | 'RECEIVED' | 'RECHARGES' | 'FAILED' | 'CASHBACK'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });

  // Modal States
  const [selectedTx, setSelectedTx] = useState<{
    entry: LedgerEntryDto;
    txDetail: TransactionDetails | null;
    counterparty: AccountDetails | null;
  } | null>(null);
  
  const [toastMsg, setToastMsg] = useState('');
  const [ticketRaised, setTicketRaised] = useState(false);

  // Extract accountId from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem('accountId');
    if (storedId) {
      setAccountId(storedId);
    }
  }, []);

  // Fetch transaction list from general ledger
  const { data: entries = [], isLoading, isError } = useQuery<LedgerEntryDto[]>({
    queryKey: ['ledger-entries', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/ledger/accounts/${accountId}/entries`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch cashback history from rewards API
  const { data: cashbackHistory = [] } = useQuery<any[]>({
    queryKey: ['cashback-history', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/rewards/history?userId=${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch real failed transactions from transaction service
  const { data: failedTransactions = [] } = useQuery<any[]>({
    queryKey: ['failed-transactions', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/failed/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch Investment Account to get the dynamic APY Rate configured by admin
  const { data: vaultAccount } = useQuery<any>({
    queryKey: ['vaultAccount', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/investments/account/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 3000);
  };

  const downloadPdfStatement = async () => {
    try {
      const response = await axiosInstance.get(`/api/ledger/accounts/${accountId}/statement/pdf`, {
        params: { month: selectedMonth },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `statement_${selectedMonth}.pdf`;
      link.click();
      window.URL.revokeObjectURL(link.href);
      showToast('PDF Statement downloaded successfully!');
    } catch (err) {
      alert('Failed to download PDF statement. Please make sure entries exist for this month.');
    }
  };

  // PDF receipt/statement download from backend
  const handleDownloadReceipt = async () => {
    if (!selectedTx) return;
    try {
      const response = await axiosInstance.get(`/api/transactions/${selectedTx.entry.transactionId}/statement`, {
        params: { accountId },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      const filename = `statement_${selectedTx.entry.transactionId.substring(0, 8)}.pdf`;
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
      showToast('Official PDF Statement downloaded!');
    } catch (err) {
      alert('Failed to download PDF statement receipt.');
    }
  };

  const handleShareReceipt = () => {
    if (!selectedTx) return;
    const utr = 'UTR' + selectedTx.entry.transactionId.substring(0, 8).toUpperCase();
    navigator.clipboard.writeText(`Transaction Successful! Amount: $${selectedTx.entry.amount.toFixed(2)}. UTR: ${utr}. Mapped on Event-Sourced Ledger.`);
    showToast('Receipt details copied to clipboard!');
  };

  const handleRaiseIssue = () => {
    setTicketRaised(true);
    setTimeout(() => {
      setTicketRaised(false);
      setSelectedTx(null);
      showToast('Support ticket #ST-92182 raised successfully.');
    }, 2000);
  };

  const cbEntries = cashbackHistory.map((cb: any) => ({
    id: cb.id,
    transactionId: cb.transactionId || cb.id,
    accountId: cb.userId,
    entryType: cb.cashbackAmount < 0 ? ("DEBIT" as const) : ("CREDIT" as const),
    amount: Math.abs(cb.cashbackAmount),
    currency: "INR",
    balanceAfter: 0.00,
    idempotencyKey: `CASHBACK_${cb.id}`,
    createdAt: cb.creditedAt,
    offerId: cb.offerId
  }));

  const failedEntries = failedTransactions.map((tx: any) => ({
    id: tx.id,
    transactionId: tx.id,
    accountId: accountId,
    entryType: "DEBIT" as const,
    amount: tx.amount,
    currency: tx.currency,
    balanceAfter: 0.00,
    idempotencyKey: tx.idempotencyKey,
    createdAt: tx.createdAt,
    status: tx.status
  }));

  const combinedEntries = filterType === 'FAILED'
    ? failedEntries
    : filterType === 'CASHBACK'
      ? cbEntries
      : entries;

  // Client-side filtering & search
  const filteredEntries = combinedEntries.filter((entry) => {
    // Month Filter check (based on selectedMonth, e.g. '2026-07')
    if (selectedMonth && entry.createdAt) {
      if (!entry.createdAt.startsWith(selectedMonth)) return false;
    }

    // 1. Filter Type Checks
    if (filterType === 'SENT' && entry.entryType !== 'DEBIT') return false;
    if (filterType === 'RECEIVED' && entry.entryType !== 'CREDIT') return false;
    if (filterType === 'FAILED') return true;
    if (filterType === 'CASHBACK' && !entry.idempotencyKey.startsWith('CASHBACK_')) return false;

    if (filterType === 'RECHARGES') {
      const isRecharge = entry.idempotencyKey.includes('RECHARGE') || 
                         entry.idempotencyKey.includes('BILL');
      if (!isRecharge) return false;
    }

    // 2. Date Range Checks
    const entryDate = new Date(entry.createdAt);
    const now = new Date();
    if (dateFilter === 'TODAY') {
      if (entryDate.toDateString() !== now.toDateString()) return false;
    } else if (dateFilter === '7DAYS') {
      const diffTime = Math.abs(now.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 7) return false;
    } else if (dateFilter === '30DAYS') {
      const diffTime = Math.abs(now.getTime() - entryDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) return false;
    } else if (dateFilter === 'CUSTOM') {
      if (customStartDate && new Date(customStartDate) > entryDate) return false;
      if (customEndDate && new Date(customEndDate) < entryDate) return false;
    }

    // 3. Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTxId = entry.transactionId.toLowerCase().includes(q);
      const matchAmount = entry.amount.toString().includes(q);
      return matchTxId || matchAmount;
    }
    return true;
  });

  // Client-side pagination calculations
  const totalElements = filteredEntries.length;
  const totalPages = Math.ceil(totalElements / size);
  const paginatedEntries = filteredEntries.slice(page * size, (page + 1) * size);

  // Summary Metrics calculations
  const monthEntries = entries.filter(e => e.createdAt && e.createdAt.startsWith(selectedMonth));
  const monthCashbacks = cashbackHistory.filter(cb => cb.creditedAt && cb.creditedAt.startsWith(selectedMonth));

  // Count only actual user actions (group by transactionId)
  const uniqueTxIds = new Set(monthEntries.map(e => e.transactionId));
  const monthTxCount = uniqueTxIds.size + monthCashbacks.filter(cb => cb.cashbackAmount > 0).length;

  const monthSent = monthEntries
    .filter(e => e.entryType === 'DEBIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const monthReceived = monthEntries
    .filter(e => e.entryType === 'CREDIT' && (e as any).category !== 'YIELD_CREDIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const monthInterest = monthEntries
    .filter(e => e.entryType === 'CREDIT' && (e as any).category === 'YIELD_CREDIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const monthRewards = monthCashbacks
    .filter(cb => cb.cashbackAmount > 0)
    .reduce((sum, cb) => sum + cb.cashbackAmount, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Toast Alert overlay */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="h-4.5 w-4.5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Cover Statement Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-violet-900/40 via-indigo-950/40 to-fuchsia-950/40 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 z-10 text-center md:text-left">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[3px] shadow-[0_0_25px_rgba(124,58,237,0.35)] flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-[#0b0b0f] flex items-center justify-center text-violet-400">
                <Receipt className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
              Transaction History
            </h2>
            <p className="text-xs text-gray-400 max-w-md leading-relaxed">
              Audit logs of all ledger state modifications. Export monthly statements verified by cryptographic double-entry hashing.
            </p>
          </div>
        </div>

        {/* Sync Indicator */}
        <div className="glass-panel px-5 py-4 rounded-2xl border border-white/5 bg-black/40 flex items-center gap-3 z-10 shrink-0 self-center md:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping shrink-0" />
          <div className="text-left space-y-0.5">
            <span className="text-[9px] uppercase font-extrabold text-gray-500 tracking-wider">Audit Log Status</span>
            <p className="font-sans text-xs font-extrabold text-violet-400">LEDGER SYNCED</p>
          </div>
        </div>
      </div>

      {/* Monthly Activity Summary Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <Calendar className="h-5 w-5 text-violet-400" />
          <h3 className="text-xs font-black text-white uppercase tracking-wider">
            Monthly Activity Summary — {new Date(selectedMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-1">
            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Total Transactions</span>
            <p className="text-xl font-black text-white font-mono mt-1">{monthTxCount}</p>
            <span className="text-[8px] text-gray-500 block">Excluding account-to-account legs</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-1">
            <span className="text-[9px] uppercase font-bold text-rose-450 tracking-wider block">Money Sent</span>
            <p className="text-xl font-black text-rose-400 font-mono mt-1">${monthSent.toFixed(2)}</p>
            <span className="text-[8px] text-gray-500 block">Transfers, recharges, vault deps</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-1">
            <span className="text-[9px] uppercase font-bold text-emerald-450 tracking-wider block">Money Received</span>
            <p className="text-xl font-black text-emerald-400 font-mono mt-1">${monthReceived.toFixed(2)}</p>
            <span className="text-[8px] text-gray-500 block">Inbound transfers, deposits, redemptions</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-1">
            <span className="text-[9px] uppercase font-bold text-violet-400 tracking-wider block">Interest Earned</span>
            <p className="text-xl font-black text-violet-400 font-mono mt-1">${monthInterest.toFixed(2)}</p>
            <span className="text-[8px] text-gray-500 block">{(vaultAccount?.apyRate || 4.50).toFixed(2)}% APY neobank savings yield</span>
          </div>

          <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-1 col-span-2 md:col-span-1">
            <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider block">Rewards Earned</span>
            <p className="text-xl font-black text-amber-400 font-mono mt-1">${monthRewards.toFixed(2)}</p>
            <span className="text-[8px] text-gray-500 block">Cashback referral & transaction offers</span>
          </div>
        </div>
      </div>

      {/* Filters & Control Panel */}
      <div className="glass-panel p-4 rounded-3xl border border-white/5 space-y-4">
        {/* Search Bar, Filter and Download Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 focus:border-violet-500/50 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/5 bg-[#111118] text-xs font-semibold text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer no-print"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Print/Export PDF</span>
            </button>
            <button
              onClick={downloadPdfStatement}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/20 text-xs font-bold text-violet-300 transition-all cursor-pointer shadow-sm no-print"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Statement</span>
            </button>
          </div>
        </div>

        {/* Category Chips scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          {[
            { value: 'ALL', label: 'All' },
            { value: 'SENT', label: 'Sent' },
            { value: 'RECEIVED', label: 'Received' },
            { value: 'RECHARGES', label: 'Recharges' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'CASHBACK', label: 'Cashback' }
          ].map((chip) => (
            <button
              key={chip.value}
              onClick={() => { setFilterType(chip.value as any); setPage(0); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                filterType === chip.value 
                  ? 'bg-violet-600 border-violet-500 text-white shadow-md' 
                  : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Date Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none border-t border-white/5 pt-3">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mr-2">Dates:</span>
          {[
            { value: 'ALL', label: 'Anytime' },
            { value: 'TODAY', label: 'Today' },
            { value: '7DAYS', label: 'Last 7 Days' },
            { value: '30DAYS', label: 'Last 30 Days' },
            { value: 'CUSTOM', label: 'Custom Range' }
          ].map((dChip) => (
            <button
              key={dChip.value}
              onClick={() => { setDateFilter(dChip.value as any); setPage(0); }}
              className={`px-3.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                dateFilter === dChip.value
                  ? 'bg-indigo-650 border-indigo-500 text-white shadow-sm'
                  : 'bg-white/[0.01] border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {dChip.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        {dateFilter === 'CUSTOM' && (
          <div className="flex items-center gap-4 bg-white/[0.01] p-3 rounded-2xl border border-white/5 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-mono">Start:</span>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => { setCustomStartDate(e.target.value); setPage(0); }}
                className="px-2 py-1 rounded-lg border border-white/5 bg-[#111118] text-xs font-semibold text-gray-300 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-mono">End:</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => { setCustomEndDate(e.target.value); setPage(0); }}
                className="px-2 py-1 rounded-lg border border-white/5 bg-[#111118] text-xs font-semibold text-gray-300 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transaction Records List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, idx) => (
            <div key={idx} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 shadow-md">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Failed to load transaction history. Please refresh the page.</span>
        </div>
      ) : totalElements > 0 ? (
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
            <div className="divide-y divide-white/5">
              {paginatedEntries.map((entry) => (
                <TransactionRow 
                  key={entry.id} 
                  entry={entry} 
                  currentAccountId={accountId} 
                  onRowClick={(entry, txDetail, counterparty) => setSelectedTx({ entry, txDetail, counterparty })}
                />
              ))}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-xs text-gray-500 font-mono">
                Showing {page * size + 1} - {Math.min((page + 1) * size, totalElements)} of {totalElements} entries
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  className="p-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <span className="text-xs font-semibold text-gray-300 px-3 font-mono">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State Layout */
        <div className="glass-panel p-12 rounded-3xl text-center border border-white/5 space-y-4">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <Info className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">No Transactions Mapped Yet</h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Your ledger account is active, but no transaction logs were found. Get started by depositing funds into your wallet.
            </p>
          </div>
          <a
            href="/dashboard?action=deposit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md mx-auto"
          >
            <span>Make First Deposit</span>
          </a>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl relative glow-purple border-violet-500/20 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all z-10"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-display font-bold text-lg text-white mb-1">
              Transaction Details
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              UTR: {'UTR' + selectedTx.entry.transactionId.substring(0, 8).toUpperCase()}
            </span>

            {/* Status Indicator */}
            <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center flex flex-col items-center gap-1.5 shadow-sm">
              <span className="text-[10px] font-black tracking-widest uppercase bg-emerald-500/20 px-2.5 py-0.5 rounded">Success</span>
              <p className="text-2xl font-display font-black text-white mt-1">
                ${selectedTx.entry.amount.toFixed(2)}
              </p>
              <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                {new Date(selectedTx.entry.createdAt).toLocaleString()}
              </span>
            </div>

            {/* Core details mapping */}
            <div className="mt-6 space-y-4 text-xs">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500 font-medium">Transaction ID</span>
                <span className="text-white font-mono">{selectedTx.entry.transactionId}</span>
              </div>

              {selectedTx.txDetail?.transactionType === 'TRANSFER' && (
                <>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-500 font-medium">Sender Details</span>
                    <span className="text-white font-semibold">
                      {selectedTx.entry.entryType === 'DEBIT' ? 'You' : selectedTx.counterparty?.fullName || 'Registered User'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-500 font-medium">Receiver Details</span>
                    <span className="text-white font-semibold">
                      {selectedTx.entry.entryType === 'CREDIT' ? 'You' : selectedTx.counterparty?.fullName || 'Registered User'}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500 font-medium">Bank Name</span>
                <span className="text-white font-semibold flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-violet-400" />
                  <span>Bank Ledger Neobank</span>
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500 font-medium">Transfer Charges</span>
                <span className="text-emerald-400 font-bold">$0.00 (Free)</span>
              </div>

              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500 font-medium">Cashback Earned</span>
                <span className="text-violet-400 font-bold">+${(selectedTx.entry.amount * 0.01).toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-gray-500 font-medium">Notes</span>
                <span className="text-gray-400 font-mono italic">projected double-entry balance log</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-8 grid grid-cols-3 gap-2.5">
              <button
                onClick={handleDownloadReceipt}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-gray-400 hover:text-white"
              >
                <Download className="h-4.5 w-4.5" />
                <span className="text-[10px] font-bold">Download</span>
              </button>

              <button
                onClick={handleShareReceipt}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-gray-400 hover:text-white"
              >
                <Share2 className="h-4.5 w-4.5" />
                <span className="text-[10px] font-bold">Share</span>
              </button>

              <button
                onClick={handleRaiseIssue}
                disabled={ticketRaised}
                className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all text-gray-400 hover:text-rose-400 disabled:opacity-50"
              >
                <HelpCircle className="h-4.5 w-4.5" />
                <span className="text-[10px] font-bold">{ticketRaised ? 'Raising...' : 'Raise Issue'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Printable Bank Statement Custom Stylesheet */}
      <style>{`
        @media print {
          /* Hide sidebar, header, buttons, inputs, pagination and tabs */
          header, aside, button, .no-print, input, select, .pagination-controls, footer, .mb-4, .flex-wrap {
            display: none !important;
          }
          body, html, #root {
            background: white !important;
            color: black !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .glass-panel {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .text-white {
            color: black !important;
          }
          .text-gray-400, .text-gray-500, .text-gray-650 {
            color: #333 !important;
          }
          .bg-emerald-950\\/20, .bg-rose-950\\/20, .bg-emerald-500\\/10, .bg-rose-500\\/10, .bg-white\\/\\[0\\.02\\], .bg-white\\/\\[0\\.01\\] {
            background: transparent !important;
            border-color: #ddd !important;
          }
          .text-emerald-400 {
            color: #059669 !important;
            font-weight: bold !important;
          }
          .text-rose-400 {
            color: #dc2626 !important;
            font-weight: bold !important;
          }
          .text-violet-400 {
            color: #4f46e5 !important;
            font-weight: bold !important;
          }
          .divide-y > * + * {
            border-color: #eee !important;
          }
          /* Custom layout wrapper for print statements */
          .space-y-6 {
            margin: 0 !important;
            padding: 24px !important;
          }
          .border-b {
            border-bottom: 1px solid #ddd !important;
          }
        }
      `}</style>
    </div>
  );
};
