import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { 
  Lock, ArrowDownRight, ArrowUpRight, TrendingUp, 
  CheckCircle2, AlertCircle, Sparkles, ShieldAlert,
  ArrowRight, Activity, PiggyBank, CircleDollarSign,
  Printer, Target, LineChart, BookOpen, Globe
} from 'lucide-react';

interface BalanceData {
  accountId: string;
  currentBalance: number;
  currency: string;
  updatedAt: string;
}

interface InvestmentAccount {
  id: string;
  userId: string;
  investedBalance: number;
  totalYieldEarned: number;
  apyRate: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface InvestmentTransaction {
  id: string;
  investmentId: string;
  type: string; // INVESTMENT_DEPOSIT, INVESTMENT_WITHDRAWAL, YIELD_CREDIT
  amount: number;
  description: string;
  createdAt: string;
}

interface AccountData {
  id: string;
  email: string;
  fullName: string;
  username: string;
  kycStatus: string;
  status: string;
  mfaEnabled: boolean;
}

interface SavingGoal {
  id: string;
  name: string;
  target: number;
  createdAt: string;
}

export const Investments: React.FC = () => {
  const accountId = localStorage.getItem('accountId') || '';

  // Modal / Form modes
  const [actionMode, setActionMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [showStatement, setShowStatement] = useState(false);
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | '1Y' | 'ALL'>('30D');
  const [activeLedgerTab, setActiveLedgerTab] = useState<'ALL' | 'YIELD'>('ALL');
  
  // Goal Tracking state
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [goalError, setGoalError] = useState('');

  // Form states
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Projections & Calculator states
  const [annualContribution, setAnnualContribution] = useState<number>(12000);
  const [simulatorInflationRate, setSimulatorInflationRate] = useState<number>(3);

  // Ticking cents count state for Pending Yield
  const [pendingYieldSec, setPendingYieldSec] = useState<number>(0);

  // Fetch Account Details
  const { data: account } = useQuery<AccountData>({
    queryKey: ['accountInfo'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/me');
      return response.data;
    }
  });

  // Fetch Spendable Wallet Balance
  const { data: walletBalance, refetch: refetchWallet } = useQuery<BalanceData>({
    queryKey: ['walletBalance', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/balances/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  // Fetch Investment Account Details
  const { data: vaultAccount, refetch: refetchVault } = useQuery<InvestmentAccount>({
    queryKey: ['vaultAccount', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/investments/account/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  // Fetch Backend Financial Analytics
  const { data: vaultAnalytics, refetch: refetchAnalytics } = useQuery<any>({
    queryKey: ['vaultAnalytics', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/vault/analytics/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  // Fetch Dynamic Treasury Allocation
  const { data: treasuryAllocation } = useQuery<any>({
    queryKey: ['treasuryAllocation'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/allocation');
      return response.data;
    },
    staleTime: 300000 // 5 minutes cache
  });

  // Fetch Live Treasury Stats (Reconciliation & Coverage widget)
  const { data: treasuryStats, error: statsError } = useQuery<any>({
    queryKey: ['globalTreasuryStats'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/stats');
      return response.data;
    },
    retry: false,
    staleTime: 300000 // 5 minutes cache
  });

  const { data: reconciliationStats, error: reconError } = useQuery<any>({
    queryKey: ['globalReconciliationStats'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/reconciliation');
      return response.data;
    },
    retry: false,
    staleTime: 300000 // 5 minutes cache
  });

  // Fetch Investment Transaction Logs
  const { data: transactionHistory, refetch: refetchHistory } = useQuery<InvestmentTransaction[]>({
    queryKey: ['vaultHistory', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/investments/history/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  // Load goals from local storage
  useEffect(() => {
    if (accountId) {
      const saved = localStorage.getItem(`payvora_vault_goals_${accountId}`);
      if (saved) {
        try {
          setGoals(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [accountId]);

  // Live micro-cents ticking clock for Pending Yield
  useEffect(() => {
    const timer = setInterval(() => {
      if (vaultAccount && vaultAccount.investedBalance > 0) {
        const invested = vaultAccount.investedBalance;
        const apy = vaultAccount.apyRate || 4.5;
        const dailyYield = (invested * (apy / 100)) / 365.25;
        
        // Calculate seconds since last midnight
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const secElapsed = (now.getTime() - midnight.getTime()) / 1000;
        
        const accrued = dailyYield * (secElapsed / 86400);
        setPendingYieldSec(accrued);
      } else {
        setPendingYieldSec(0);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [vaultAccount]);

  const resetForm = () => {
    setAmount('');
    setPin('');
    setErrorMessage('');
  };

  const handleActionClick = (mode: 'deposit' | 'withdraw') => {
    setActionMode(mode);
    setSuccessMessage('');
    resetForm();
  };

  const closeAction = () => {
    setActionMode(null);
    resetForm();
  };

  // Perform Investment Deposit Mutation
  const depositMutation = useMutation({
    mutationFn: async (payload: { accountId: string; amount: number; pin: string }) => {
      const response = await axiosInstance.post('/api/transactions/investments/deposit', payload);
      return response.data;
    },
    onSuccess: () => {
      refetchWallet();
      refetchVault();
      refetchHistory();
      refetchAnalytics();
      setSuccessMessage(`Successfully invested $${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} into the Yield Vault!`);
      closeAction();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.errorMessage || err.response?.data?.message || 'Failed to deposit funds.';
      setErrorMessage(msg);
    }
  });

  // Perform Investment Withdrawal Mutation
  const withdrawMutation = useMutation({
    mutationFn: async (payload: { accountId: string; amount: number; pin: string }) => {
      const response = await axiosInstance.post('/api/transactions/investments/withdraw', payload);
      return response.data;
    },
    onSuccess: () => {
      refetchWallet();
      refetchVault();
      refetchHistory();
      refetchAnalytics();
      setSuccessMessage(`Successfully withdrew $${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} back to spendable wallet.`);
      closeAction();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.errorMessage || err.response?.data?.message || 'Failed to withdraw funds.';
      setErrorMessage(msg);
    }
  });

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount.');
      setIsSubmitting(false);
      return;
    }

    if (pin.length !== 4) {
      setErrorMessage('Please enter your 4-digit Transaction PIN.');
      setIsSubmitting(false);
      return;
    }

    const payload = {
      accountId,
      amount: parsedAmount,
      pin
    };

    if (actionMode === 'deposit') {
      depositMutation.mutate(payload, {
        onSettled: () => setIsSubmitting(false)
      });
    } else if (actionMode === 'withdraw') {
      withdrawMutation.mutate(payload, {
        onSettled: () => setIsSubmitting(false)
      });
    }
  };

  // Savings Goal management
  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError('');
    if (!newGoalName.trim()) {
      setGoalError('Please enter a goal description.');
      return;
    }
    const targetVal = parseFloat(newGoalTarget);
    if (isNaN(targetVal) || targetVal <= 0) {
      setGoalError('Please enter a valid target amount.');
      return;
    }

    const goalItem: SavingGoal = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGoalName.trim(),
      target: targetVal,
      createdAt: new Date().toISOString()
    };

    const updated = [...goals, goalItem];
    setGoals(updated);
    localStorage.setItem(`payvora_vault_goals_${accountId}`, JSON.stringify(updated));
    setNewGoalName('');
    setNewGoalTarget('');
  };

  const removeGoal = (goalId: string) => {
    const updated = goals.filter(g => g.id !== goalId);
    setGoals(updated);
    localStorage.setItem(`payvora_vault_goals_${accountId}`, JSON.stringify(updated));
  };

  // Dynamic allocations map
  const allocations = useMemo(() => {
    if (treasuryAllocation) {
      return [
        { key: 'TREASURY_BILLS', label: 'Treasury Bills', value: parseFloat(treasuryAllocation.TREASURY_BILLS || '70.0'), color: 'bg-indigo-500' },
        { key: 'CORPORATE_BONDS', label: 'Corporate Bonds', value: parseFloat(treasuryAllocation.CORPORATE_BONDS || '15.0'), color: 'bg-violet-500' },
        { key: 'MONEY_MARKET_FUNDS', label: 'Money Market Funds', value: parseFloat(treasuryAllocation.MONEY_MARKET_FUNDS || '10.0'), color: 'bg-emerald-500' },
        { key: 'CASH_RESERVE', label: 'Cash Reserves', value: parseFloat(treasuryAllocation.CASH_RESERVE || '5.0'), color: 'bg-rose-500' }
      ];
    }
    return [
      { key: 'TREASURY_BILLS', label: 'Treasury Bills', value: 70.0, color: 'bg-indigo-500' },
      { key: 'CORPORATE_BONDS', label: 'Corporate Bonds', value: 15.0, color: 'bg-violet-500' },
      { key: 'MONEY_MARKET_FUNDS', label: 'Money Market Funds', value: 10.0, color: 'bg-emerald-500' },
      { key: 'CASH_RESERVE', label: 'Cash Reserves', value: 5.0, color: 'bg-rose-500' }
    ];
  }, [treasuryAllocation]);

  // Derived variables
  const currentApy = vaultAccount?.apyRate || 4.50;
  const currentInvested = vaultAccount?.investedBalance || 0;
  
  // Dynamic safety indicators: Check if API error occurred.
  const isTreasuryOffline = statsError || reconError || !treasuryStats || !reconciliationStats;

  // Filtered transactions for the ledger view
  const filteredHistory = useMemo(() => {
    if (!transactionHistory) return [];
    if (activeLedgerTab === 'YIELD') {
      return transactionHistory.filter(tx => tx.type === 'YIELD_CREDIT');
    }
    return transactionHistory;
  }, [transactionHistory, activeLedgerTab]);

  // Compute spline SVG growth path based on transaction history and selected range
  const chartData = useMemo(() => {
    if (!transactionHistory || transactionHistory.length === 0) return [];
    
    // Sort transactions chronologically
    const sorted = [...transactionHistory].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Filter by date range
    const now = new Date();
    let cutoff = new Date(0); // ALL time default
    if (chartRange === '7D') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (chartRange === '30D') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (chartRange === '90D') cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (chartRange === '1Y') cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const inRangeTx = sorted.filter(tx => new Date(tx.createdAt).getTime() >= cutoff.getTime());
    
    // Build daily running balances
    const dailyBalances: { date: Date; balance: number; deposit: number; withdraw: number; yieldEarned: number }[] = [];
    let runningBalance = 0;
    
    // Initialize starting balance before cutoff
    sorted.forEach(tx => {
      if (new Date(tx.createdAt).getTime() < cutoff.getTime()) {
        if (tx.type === 'INVESTMENT_DEPOSIT') runningBalance += tx.amount;
        else if (tx.type === 'INVESTMENT_WITHDRAWAL') runningBalance -= tx.amount;
        else if (tx.type === 'YIELD_CREDIT') runningBalance += tx.amount;
      }
    });

    // Populate daily points inside range
    const groupedByDay: { [key: string]: InvestmentTransaction[] } = {};
    inRangeTx.forEach(tx => {
      const dayKey = new Date(tx.createdAt).toISOString().split('T')[0];
      if (!groupedByDay[dayKey]) groupedByDay[dayKey] = [];
      groupedByDay[dayKey].push(tx);
    });

    // Generate date sequence
    const dates: Date[] = [];
    let start = new Date(cutoff.getTime() === 0 ? new Date(sorted[0].createdAt).getTime() : cutoff.getTime());
    while (start <= now) {
      dates.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }

    dates.forEach(d => {
      const dayKey = d.toISOString().split('T')[0];
      const dayTxs = groupedByDay[dayKey] || [];
      
      // Apply daily compounding interest from the previous day's balance
      if (dailyBalances.length > 0) {
        const prevBalance = dailyBalances[dailyBalances.length - 1].balance;
        if (prevBalance > 0) {
          const dailyRate = (currentApy / 100) / 365.25;
          const accruedInterest = prevBalance * dailyRate;
          runningBalance += accruedInterest;
        }
      }
      
      let deposit = 0;
      let withdraw = 0;
      let yieldEarned = 0;

      dayTxs.forEach(tx => {
        if (tx.type === 'INVESTMENT_DEPOSIT') {
          runningBalance += tx.amount;
          deposit += tx.amount;
        } else if (tx.type === 'INVESTMENT_WITHDRAWAL') {
          runningBalance -= tx.amount;
          withdraw += tx.amount;
        } else if (tx.type === 'YIELD_CREDIT') {
          // Simulated daily compounding above represents the accrued yield,
          // so we don't double count the actual transaction amount here,
          // but we still record it for history representation
          yieldEarned += tx.amount;
        }
      });

      dailyBalances.push({
        date: d,
        balance: runningBalance,
        deposit,
        withdraw,
        yieldEarned
      });
    });

    return dailyBalances;
  }, [transactionHistory, chartRange, currentApy]);

  const hasInsufficientData = chartData.length < 2 || chartData.every(d => d.balance === 0);

  // Math models for SVG Path
  const svgChartPath = useMemo(() => {
    if (hasInsufficientData) return '';
    const width = 600;
    const height = 150;
    const balances = chartData.map(d => d.balance);
    const minBal = Math.min(...balances);
    const maxBal = Math.max(...balances);
    const range = maxBal - minBal === 0 ? 1 : maxBal - minBal;

    const points = chartData.map((d, index) => {
      const x = (index / (chartData.length - 1)) * (width - 40) + 20;
      const y = height - ((d.balance - minBal) / range) * (height - 40) - 20;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [chartData, hasInsufficientData]);

  // Statement calculations
  const statementPeriod = useMemo(() => {
    const date = new Date();
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, []);

  const statementMetrics = useMemo(() => {
    if (!transactionHistory || !vaultAccount) return { opening: 0, deposits: 0, withdrawals: 0, yield: 0, closing: 0 };
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let deposits = 0;
    let withdrawals = 0;
    let yieldEarned = 0;
    let closing = vaultAccount.investedBalance;
    
    transactionHistory.forEach(tx => {
      const txDate = new Date(tx.createdAt);
      if (txDate >= startOfMonth) {
        if (tx.type === 'INVESTMENT_DEPOSIT') deposits += tx.amount;
        else if (tx.type === 'INVESTMENT_WITHDRAWAL') withdrawals += tx.amount;
        else if (tx.type === 'YIELD_CREDIT') yieldEarned += tx.amount;
      }
    });

    const opening = closing - deposits + withdrawals - yieldEarned;

    return {
      opening,
      deposits,
      withdrawals,
      yield: yieldEarned,
      closing
    };
  }, [transactionHistory, vaultAccount]);

  // Goal metrics completion days projection
  const goalProjections = useMemo(() => {
    return goals.map(goal => {
      const current = currentInvested;
      const target = goal.target;
      const progress = Math.min((current / target) * 100, 100);
      
      const dailyYield = (current * (currentApy / 100)) / 365.25;
      
      // Helper function for compound projection simulator
      const getMonthsToTarget = (start: number, tgt: number, monthlySave: number, apy: number) => {
        if (start >= tgt) return 0;
        let bal = start;
        const monthlyRate = (apy / 100) / 12;
        let m = 0;
        while (bal < tgt && m < 1200) {
          bal += bal * monthlyRate;
          bal += monthlySave;
          m++;
        }
        return m;
      };

      const formatTime = (m: number, suffix: string = '') => {
        if (m === 0) return 'Achieved!';
        if (m >= 1200) return '∞ (Never)';
        if (m >= 12) {
          const yrs = m / 12;
          return `≈ ${yrs.toFixed(1)} year${yrs >= 2 || yrs === 1 ? '' : 's'}${suffix}`;
        }
        return `≈ ${m} month${m === 1 ? '' : 's'}${suffix}`;
      };

      const remainingAmt = Math.max(target - current, 0);
      const noDepositMonths = getMonthsToTarget(current, target, 0, currentApy);
      const save10Months = getMonthsToTarget(current, target, 10, currentApy);
      const save25Months = getMonthsToTarget(current, target, 25, currentApy);

      const noDepositText = formatTime(noDepositMonths, ' (yield only)');
      const save10Text = formatTime(save10Months);
      const save25Text = formatTime(save25Months);

      let projectedDate = 'Awaiting daily yield credit...';
      if (current >= target) {
        projectedDate = 'Goal achieved!';
      } else if (dailyYield > 0) {
        const daysNeeded = Math.ceil((target - current) / dailyYield);
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + daysNeeded);
        projectedDate = estDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ` (${formatTime(noDepositMonths, ' left')})`;
      } else {
        projectedDate = 'No yield earning capital invested';
      }

      return {
        ...goal,
        progress,
        remainingAmt,
        noDepositText,
        save10Text,
        save25Text,
        projectedDate
      };
    });
  }, [goals, currentInvested, currentApy]);



  // Financial Projection calculations
  const projections = useMemo(() => {
    const years = [1, 3, 5, 10];
    const inflationRate = simulatorInflationRate / 100;
    
    return years.map(y => {
      let balance = currentInvested;
      let totalDeposited = currentInvested;
      let totalYield = 0;
      
      for (let i = 0; i < y; i++) {
        // Assume annual contribution is added at the start of each year
        balance += annualContribution;
        totalDeposited += annualContribution;
        
        // Compound interest annual yield
        const yieldForYear = balance * (currentApy / 100);
        balance += yieldForYear;
        totalYield += yieldForYear;
      }
      
      const inflationFactor = Math.pow(1 + inflationRate, y);
      const inflationAdjustedBalance = balance / inflationFactor;

      return {
        year: y,
        projectedBalance: balance,
        projectedYield: totalYield,
        contributionImpact: totalDeposited,
        inflationAdjustedBalance
      };
    });
  }, [currentInvested, currentApy, annualContribution, simulatorInflationRate]);

  // Withdrawal Experience Modal metrics
  const withdrawalPreview = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const fee = 0.00;
    const expectedCredit = Math.max(amt - fee, 0);
    const yieldLostThisYear = amt * (currentApy / 100);
    const newProjectedYield = Math.max(currentInvested - amt, 0) * (currentApy / 100);
    const remainingBalance = Math.max(currentInvested - amt, 0);

    return {
      available: currentInvested,
      fee,
      expectedCredit,
      yieldLostThisYear,
      newProjectedYield,
      remainingBalance
    };
  }, [amount, currentInvested, currentApy]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const isKycApproved = account?.kycStatus === 'APPROVED';
  const isMfaEnabled = account?.mfaEnabled === true;
  const isActiveAccount = account?.status === 'ACTIVE';
  const isEligibleForInvest = isKycApproved && isMfaEnabled && isActiveAccount;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-[#0e0e12]/80 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row items-center gap-6 z-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <PiggyBank className="h-8 w-8 text-white" />
          </div>
          <div className="text-center md:text-left space-y-1">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="font-display font-black text-3xl text-white tracking-tight">PayVora Yield Vault</h1>
              {/* Portfolio Health Badge */}
              {!isTreasuryOffline && (
                <span className="px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                  Treasury Status: HEALTHY
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 max-w-md">
              Grow your wealth securely by putting spendable cash into the compounding yield vault.
            </p>
          </div>
        </div>

        {/* Global APY Card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 text-center min-w-[180px] z-10 bg-black/40">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Compounding Rate</span>
          <p className="font-display font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-1">
            {currentApy.toFixed(2)}% APY
          </p>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-pulse-once">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-400 hover:text-white">
            Close
          </button>
        </div>
      )}

      {/* Security Check Alert banner if not eligible */}
      {!isEligibleForInvest && (
        <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertCircle className="h-5 w-5" />
            <span>Vault Security Criteria Required</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Fintech compliance rules require a verified profile before making investment transactions. Please complete these settings to unlock deposits:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-mono ${isKycApproved ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>
              {isKycApproved ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
              <span>KYC Status: {account?.kycStatus || 'PENDING'}</span>
            </div>
            <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-mono ${isMfaEnabled ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>
              {isMfaEnabled ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
              <span>MFA Protection: {isMfaEnabled ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
            <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-mono ${isActiveAccount ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}>
              {isActiveAccount ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
              <span>Bank Status: {account?.status || 'INACTIVE'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Vault Status & Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Balances & Stats Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Performance Analytics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Total Contributions</span>
              <p className="font-mono text-lg font-black text-white mt-1">
                ${vaultAnalytics ? vaultAnalytics.totalContributions.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Total Withdrawals</span>
              <p className="font-mono text-lg font-black text-white mt-1">
                ${vaultAnalytics ? vaultAnalytics.totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
              </p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Net Profit (Yield)</span>
              <p className="font-mono text-lg font-black text-emerald-400 mt-1">
                +${vaultAnalytics ? vaultAnalytics.netProfit.toLocaleString('en-US', { minimumFractionDigits: 4 }) : '0.0000'}
              </p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Annualized Return</span>
              <p className="font-mono text-lg font-black text-indigo-400 mt-1">
                {vaultAnalytics ? vaultAnalytics.annualizedReturn.toFixed(2) : '0.00'}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Wallet Balance Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 flex flex-col justify-between hover:border-white/10 transition duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Spendable Wallet</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-3xl font-black text-white font-display">
                  ${walletBalance ? walletBalance.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">Liquid funds ready for transfer</p>
              </div>
            </div>

            {/* Locked Vault Balance Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 flex flex-col justify-between hover:border-indigo-500/20 transition duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-indigo-400 tracking-wider">Invested Capital</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-3xl font-black text-white font-display">
                  ${vaultAccount ? vaultAccount.investedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
                <p className="text-[10px] text-indigo-400/70 font-mono">Actively earning daily yield</p>
              </div>
            </div>

            {/* Yield Performance metrics section */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4 hover:border-emerald-500/20 transition duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">Yield Performance</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500">Today's Yield</span>
                  <p className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                    +${vaultAnalytics ? vaultAnalytics.todayYield.toLocaleString('en-US', { minimumFractionDigits: 4 }) : '0.0000'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 font-sans">Monthly Yield</span>
                  <p className="font-mono text-sm font-black text-white mt-0.5">
                    +${vaultAnalytics ? vaultAnalytics.monthlyYield.toLocaleString('en-US', { minimumFractionDigits: 4 }) : '0.0000'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500">Total Yield Earned</span>
                  <p className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                    +${vaultAccount ? vaultAccount.totalYieldEarned.toLocaleString('en-US', { minimumFractionDigits: 4 }) : '0.0000'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500">Projected Annual Yield</span>
                  <p className="font-mono text-sm font-black text-white mt-0.5">
                    ${(currentInvested * (currentApy / 100)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Accrual Card ( Ticking Counter) */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4 hover:border-violet-500/20 transition duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-wider">Pending Yield</span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <Sparkles className="h-4 w-4 animate-spin-slow" />
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Accumulated Today (Ticking Clock)</span>
                  <p className="font-mono text-xl font-black text-violet-400 mt-1">
                    ${pendingYieldSec.toFixed(8)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-white/5 pt-3">
                  <div>
                    <span className="text-gray-500">Next Credit:</span>
                    <span className="text-white font-bold block mt-0.5">11:59 PM</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Accruals status:</span>
                    <span className="text-emerald-400 font-extrabold block mt-0.5 animate-pulse">Daily Compounding Active</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Historical SVG Spline Growth Chart */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/70 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-indigo-400" />
                <h2 className="text-xs font-black text-white uppercase tracking-wider">Vault Balance Growth</h2>
              </div>
              <div className="flex items-center gap-1.5 bg-black/45 p-1 rounded-xl border border-white/5 text-[9px] font-bold">
                {(['7D', '30D', '90D', '1Y', 'ALL'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setChartRange(range)}
                    className={`px-2.5 py-1.5 rounded-lg transition-all ${chartRange === range ? 'bg-indigo-600 text-white font-black' : 'text-gray-400 hover:text-white'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {!hasInsufficientData ? (
              <div className="space-y-2">
                <div className="relative h-[150px] w-full bg-black/35 rounded-2xl overflow-hidden border border-white/5">
                  <svg className="w-full h-full" viewBox="0 0 600 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    <path
                      d={svgChartPath}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`${svgChartPath} L 580,150 L 20,150 Z`}
                      fill="url(#chart-grad)"
                    />
                  </svg>
                </div>
                <div className="flex justify-between text-[8px] font-mono text-gray-500 px-2">
                  <span>{new Date(chartData[0].date).toLocaleDateString()}</span>
                  <span>Net vault balance progression over time</span>
                  <span>{new Date(chartData[chartData.length - 1].date).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-gray-500 font-medium bg-black/25 rounded-2xl border border-white/5">
                More data will appear as your vault accrues yield over time.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions & Details */}
        <div className="space-y-6">
          


          {/* Main Action Selectors */}
          {!actionMode ? (
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Vault Actions</h2>
              
              <button 
                onClick={() => handleActionClick('deposit')}
                disabled={!isEligibleForInvest}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group ${isEligibleForInvest ? 'bg-indigo-600/10 hover:bg-indigo-600/20 border-indigo-500/20 text-white' : 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isEligibleForInvest ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-gray-600'}`}>
                    <ArrowDownRight className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Invest Cash</p>
                    <p className="text-[10px] text-gray-500">Move spendable balance to vault</p>
                  </div>
                </div>
                {isEligibleForInvest && <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />}
              </button>

              <button 
                onClick={() => handleActionClick('withdraw')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border bg-orange-600/10 hover:bg-orange-600/20 border-orange-500/20 text-white transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/20 text-orange-300">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Withdraw Capital</p>
                    <p className="text-[10px] text-gray-500">Redeem invested funds to wallet</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setShowStatement(true)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-black/45 hover:bg-black/60 text-gray-300 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white/5 text-gray-400">
                    <Printer className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">Yield Statement</p>
                    <p className="text-[10px] text-gray-500">View and print monthly PDF statement</p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            
            /* Action Form Card */
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/90 space-y-5 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  {actionMode === 'deposit' ? 'Invest Money' : 'Redeem Money'}
                </h2>
                <button onClick={closeAction} className="text-xs text-gray-500 hover:text-white font-semibold">
                  Cancel
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-indigo-500/50 transition"
                      required
                    />
                  </div>
                  {actionMode === 'deposit' && (
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono px-1">
                      <span>Liquid available:</span>
                      <span>${walletBalance ? walletBalance.currentBalance.toLocaleString('en-US') : '0.00'}</span>
                    </div>
                  )}
                  {actionMode === 'withdraw' && (
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono px-1">
                      <span>Invested balance:</span>
                      <span>${vaultAccount ? vaultAccount.investedBalance.toLocaleString('en-US') : '0.00'}</span>
                    </div>
                  )}
                </div>

                {/* PIN Input */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Transaction PIN</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-indigo-500/50 transition"
                    required
                  />
                  <p className="text-[9px] text-gray-500 text-center font-medium">Verify security with your 4-digit PIN</p>
                </div>

                {/* Withdrawal Impact Preview Overlay */}
                {actionMode === 'withdraw' && parseFloat(amount) > 0 && (
                  <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-2 text-xs">
                    <span className="text-[9px] font-black text-orange-400 block uppercase tracking-wider">Withdrawal Impact Preview</span>
                    <div className="flex justify-between font-mono">
                      <span className="text-gray-500">Available:</span>
                      <span className="text-white">${withdrawalPreview.available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-mono text-rose-400">
                      <span className="text-gray-500 font-sans">Yield Lost This Year:</span>
                      <span>-${withdrawalPreview.yieldLostThisYear.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-gray-500">Remaining Balance:</span>
                      <span className="text-white">${withdrawalPreview.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-gray-500">New Projected APY Yield:</span>
                      <span className="text-white">${withdrawalPreview.newProjectedYield.toLocaleString('en-US', { minimumFractionDigits: 2 })} / yr</span>
                    </div>
                    <div className="flex justify-between font-mono border-t border-white/5 pt-2 font-bold">
                      <span className="text-gray-400">Expected Credit:</span>
                      <span className="text-emerald-400">${withdrawalPreview.expectedCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-500">
                      <span>Redemption Fee: $0.00</span>
                      <span>Processing: Instant</span>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg transition duration-300 ${actionMode === 'deposit' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10' : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/10'} ${isSubmitting && 'opacity-50 cursor-not-allowed'}`}
                >
                  {isSubmitting ? 'Processing Transaction...' : actionMode === 'deposit' ? 'Confirm Investment' : 'Confirm Withdrawal'}
                </button>

              </form>
            </div>
          )}



          {/* Goal Tracker Widget */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/70 space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-400" />
                <h2 className="text-xs font-black text-white uppercase tracking-wider">Savings Goal tracker</h2>
              </div>
              <span className="text-[9px] font-bold text-gray-500 font-mono">
                {goals.length} active goals
              </span>
            </div>

            <form onSubmit={addGoal} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-black/25 rounded-2xl border border-white/5">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-500">Goal Description</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Fund"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold text-gray-500">Target Amount ($)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition duration-300"
                >
                  Create Goal
                </button>
              </div>
              {goalError && <div className="sm:col-span-3 text-[10px] text-rose-400">{goalError}</div>}
            </form>

            <div className="space-y-4">
              {goalProjections.map(goal => (
                <div key={goal.id} className="p-4 rounded-2xl bg-black/35 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block text-sm">{goal.name}</span>
                      {goal.remainingAmt > 0 ? (
                        <span className="text-[9px] text-gray-400 block mt-0.5">Remaining: <strong className="text-white">${goal.remainingAmt.toLocaleString()}</strong></span>
                      ) : (
                        <span className="text-[9px] text-emerald-400 block mt-0.5 font-bold">Goal achieved!</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-white block font-mono">${currentInvested.toLocaleString()} / ${goal.target.toLocaleString()}</span>
                      <span className="text-[9px] text-indigo-400 font-extrabold block mt-0.5">{goal.progress.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                  </div>
                  {goal.remainingAmt > 0 && (
                    <div className="bg-white/5 p-3 rounded-xl space-y-1.5 text-[10px]">
                      <span className="font-bold text-gray-400 block uppercase text-[8px] tracking-wider">Estimated Completion</span>
                      <div className="flex items-center justify-between text-gray-300">
                        <span>• No additional deposits:</span>
                        <span className="font-mono font-bold text-indigo-300">{goal.noDepositText}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-300">
                        <span>• Save $10/month:</span>
                        <span className="font-mono font-bold text-emerald-400">{goal.save10Text}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-300">
                        <span>• Save $25/month:</span>
                        <span className="font-mono font-bold text-fuchsia-400">{goal.save25Text}</span>
                      </div>
                      <span className="text-[9px] text-indigo-400/85 block mt-2 italic text-center">💡 Add funds regularly to reach your goal faster.</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-[9px] text-gray-500">
                    <span>Projected Completion: {goal.projectedDate}</span>
                    <button
                      onClick={() => removeGoal(goal.id)}
                      className="text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider"
                    >
                      Delete Goal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Historical Activity Logs Table & Yield Credits section */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xs font-black text-white uppercase tracking-widest">Vault Transaction Registry</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-black/45 p-1 rounded-xl border border-white/5 text-[9px] font-bold">
              <button
                onClick={() => setActiveLedgerTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeLedgerTab === 'ALL' ? 'bg-indigo-600 text-white font-black' : 'text-gray-400 hover:text-white'}`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setActiveLedgerTab('YIELD')}
                className={`px-3 py-1.5 rounded-lg transition-all ${activeLedgerTab === 'YIELD' ? 'bg-indigo-600 text-white font-black' : 'text-gray-400 hover:text-white'}`}
              >
                Yield Credits
              </button>
            </div>
            <span className="text-[10px] font-bold text-gray-500 font-mono">
              {filteredHistory.length} logs
            </span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                <th className="py-3 pl-2">Date / Time</th>
                <th className="py-3">Type</th>
                <th className="py-3">Reference ID</th>
                <th className="py-3">Description</th>
                <th className="py-3 text-right pr-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((tx) => {
                  let typeColor = 'text-blue-400 bg-blue-500/10';
                  let typeText = tx.type;
                  
                  if (tx.type === 'INVESTMENT_DEPOSIT') {
                    typeColor = 'text-indigo-400 bg-indigo-500/10';
                    typeText = 'DEPOSIT';
                  } else if (tx.type === 'INVESTMENT_WITHDRAWAL') {
                    typeColor = 'text-orange-400 bg-orange-500/10';
                    typeText = 'WITHDRAWAL';
                  } else if (tx.type === 'YIELD_CREDIT') {
                    typeColor = 'text-emerald-400 bg-emerald-500/10';
                    typeText = 'YIELD';
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors duration-150">
                      <td className="py-4 pl-2 text-gray-400 font-mono text-[10px]">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${typeColor}`}>
                          {typeText}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400 font-mono text-[10px]">
                        {tx.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="py-4 text-gray-300 font-medium font-sans">
                        {tx.description}
                      </td>
                      <td className={`py-4 text-right pr-2 font-mono font-bold ${tx.type === 'INVESTMENT_WITHDRAWAL' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {tx.type === 'INVESTMENT_WITHDRAWAL' ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 font-medium">
                    No matching logs found in this statement period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement Modal Overlay printable view */}
      {showStatement && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:p-0 print:absolute print:inset-0">
          <div className="bg-[#0e0e12] border border-white/10 rounded-3xl w-full max-w-3xl p-8 space-y-6 shadow-2xl relative print:bg-white print:border-0 print:rounded-none print:shadow-none print:p-4 print:text-black">
            
            {/* Modal Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-3 print:hidden">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition duration-300 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print Statement (PDF)</span>
              </button>
              <button 
                onClick={() => setShowStatement(false)} 
                className="text-gray-400 hover:text-white font-black text-sm p-2"
              >
                Close
              </button>
            </div>

            {/* Statement Branding */}
            <div className="flex items-center justify-between border-b border-white/10 pb-6 print:border-black/15">
              <div className="space-y-1">
                <span className="font-display font-black text-2xl text-white print:text-black">PAYVORA</span>
                <span className="text-[10px] uppercase font-black text-indigo-400 block tracking-widest">Audited Wealth Operations</span>
              </div>
              <div className="text-right">
                <h3 className="font-bold text-sm text-white print:text-black uppercase tracking-wider">Yield Vault Statement</h3>
                <span className="text-[10px] text-gray-500 font-mono block">Period: {statementPeriod}</span>
              </div>
            </div>

            {/* Statement Summary grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 rounded-2xl bg-black/45 border border-white/5 print:bg-gray-50 print:border-black/10 print:text-black">
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Opening Balance</span>
                <span className="font-mono font-bold text-sm mt-0.5 block">${statementMetrics.opening.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Total Deposits</span>
                <span className="font-mono font-bold text-sm mt-0.5 block text-indigo-400">${statementMetrics.deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Total Withdrawals</span>
                <span className="font-mono font-bold text-sm mt-0.5 block text-rose-400">-${statementMetrics.withdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Yield Returns Earned</span>
                <span className="font-mono font-bold text-sm mt-0.5 block text-emerald-400">+${statementMetrics.yield.toLocaleString('en-US', { minimumFractionDigits: 4 })}</span>
              </div>
            </div>

            {/* Closing balance header */}
            <div className="flex justify-between items-center p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl print:bg-gray-100 print:border-black/15">
              <div className="text-xs">
                <span className="text-gray-400 print:text-gray-600 block">Interest Rate:</span>
                <span className="text-white print:text-black font-bold block mt-0.5">{currentApy.toFixed(2)}% APY Compounding Daily</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-gray-500 block">Closing Balance</span>
                <span className="font-mono font-black text-xl text-white print:text-black">${statementMetrics.closing.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Statement Allocations Snapshot */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-black text-white print:text-black tracking-widest block">Treasury Allocations Snapshot</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {allocations.map(al => {
                  const amt = (statementMetrics.closing * (al.value / 100));
                  return (
                    <div key={al.label} className="p-3 rounded-xl bg-black/35 border border-white/5 print:bg-white print:border-black/10">
                      <span className="text-[9px] text-gray-500 block">{al.label}</span>
                      <span className="font-mono font-bold text-xs text-white print:text-black block mt-0.5">${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[8px] text-gray-500 font-mono">{al.value.toFixed(1)}% Weight</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Statement Line items table */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] uppercase font-black text-white print:text-black tracking-widest block">Statement Ledger Log</span>
              <div className="overflow-x-auto w-full max-h-[220px] overflow-y-auto border border-white/5 rounded-2xl print:max-h-none print:border-black/15">
                <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black/35 border-b border-white/5 text-[8px] font-black text-gray-500 uppercase tracking-widest print:bg-gray-100 print:text-black print:border-black/15">
                      <th className="py-2.5 pl-3">Date / Time</th>
                      <th className="py-2.5">Type</th>
                      <th className="py-2.5">Reference ID</th>
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-right pr-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300 font-mono text-[10px] print:divide-gray-200 print:text-black">
                    {filteredHistory.length > 0 ? (
                      filteredHistory.map(tx => (
                        <tr key={tx.id}>
                          <td className="py-3 pl-3">{formatDate(tx.createdAt)}</td>
                          <td className="py-3 font-sans font-bold">{tx.type}</td>
                          <td className="py-3">{tx.id.substring(0, 8).toUpperCase()}</td>
                          <td className="py-3 font-sans">{tx.description}</td>
                          <td className="py-3 text-right pr-3 font-bold">{tx.type === 'INVESTMENT_WITHDRAWAL' ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">No transaction records inside this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statement footer */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between text-[8px] text-gray-500 font-medium leading-relaxed print:border-black/15">
              <span>Security backing: AAA Custody and Clearing systems.</span>
              <span className="sm:text-right">PayVora Operations back-office registry. System Audited ID: {accountId.substring(0, 18).toUpperCase()}</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default Investments;
