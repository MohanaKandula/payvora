import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { 
  ShieldCheck, AlertCircle, RefreshCw, X, Zap, Gift, Wallet, ArrowDownRight, User, ArrowRight, CheckCircle2,
  ShieldAlert, FileSpreadsheet, Layers, PieChart, Coins, ArrowRightLeft, FileText, Percent, Sparkles,
  Activity, TrendingUp, SlidersHorizontal, AlertTriangle
} from 'lucide-react';

interface AccountDto {
  id: string;
  username: string;
  email: string;
  status: string; // ACTIVE, FROZEN
  defaultCurrency: string;
  kycStatus?: string;
  kycDocumentType?: string;
  kycDocumentBase64?: string;
  kycDocumentNumber?: string;
  kycSelfieBase64?: string;
  faceMatchScore?: number;
  ocrConfidence?: number;
  riskScore?: number;
  mfaEnabled?: boolean;
}

const parseError = (err: any, fallback: string): string => {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (typeof data === 'object') return Object.values(data).join(', ');
  return fallback;
};

export const AdminPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'lifecycle' | 'pnl' | 'registry' | 'rewards' | 'history'>('overview');
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);

  // Investment Creation Form States
  const [newInvestAssetType, setNewInvestAssetType] = useState('TREASURY_BILLS');
  const [newInvestPrincipal, setNewInvestPrincipal] = useState('');
  const [newInvestExpected, setNewInvestExpected] = useState('5.42');
  const [newInvestNotes, setNewInvestNotes] = useState('');
  const [newInvestRiskRating, setNewInvestRiskRating] = useState('LOW');

  // Capital Injection Request States
  const [newInjectionSource, setNewInjectionSource] = useState('e1b07221-50e5-4d76-bc34-31f41e57c600');
  const [newInjectionTarget, setNewInjectionTarget] = useState('e1b07221-50e5-4d76-bc34-31f41e57c601');
  const [newInjectionAmount, setNewInjectionAmount] = useState('');
  const [newInjectionReason, setNewInjectionReason] = useState('');

  // Capital Injection Approval States
  const [selectedInjectionId, setSelectedInjectionId] = useState<string | null>(null);
  const [approvePin, setApprovePin] = useState('');
  const [approveMfa, setApproveMfa] = useState('');
  const [approveError, setApproveError] = useState('');
  const [approveSuccess, setApproveSuccess] = useState('');
  
  // Wallet Explorer States
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  
  // Treasury Transfer form states
  const [targetWalletId, setTargetWalletId] = useState('e1b07221-50e5-4d76-bc34-31f41e57c606'); // default to Operations
  const [targetUsername, setTargetUsername] = useState('');
  const [fundingAmount, setFundingAmount] = useState('');
  const [adminPinCode, setAdminPinCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [fundingReason, setFundingReason] = useState('');
  const [fundingCategory, setFundingCategory] = useState('TREASURY_ALLOCATION');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedKycDoc, setSelectedKycDoc] = useState<{ 
    type: string; 
    data: string; 
    number: string; 
    selfie: string; 
    user: string;
    faceMatchScore?: number;
    ocrConfidence?: number;
    riskScore?: number;
  } | null>(null);

  // Scoped User Account Inspection States
  const [inspectAccountId, setInspectAccountId] = useState<string | null>(null);
  const [inspectUsername, setInspectUsername] = useState<string | null>(null);
  
  // APY Form state
  const [newApy, setNewApy] = useState('');

  // Treasury Activity History States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterWallet, setFilterWallet] = useState('');
  const [filterOpType, setFilterOpType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [searchTxId, setSearchTxId] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyItemsPerPage] = useState(10);
  const [selectedHistoryTx, setSelectedHistoryTx] = useState<any | null>(null);

  // Admin Wallet & Transfer states
  const adminAccountId = localStorage.getItem('accountId') || '';
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferPin, setTransferPin] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // Fetch Admin Wallet Balance
  const { data: adminBalance, refetch: refetchAdminBalance } = useQuery({
    queryKey: ['adminBalance', adminAccountId],
    queryFn: async () => {
      if (!adminAccountId) return null;
      const response = await axiosInstance.get(`/api/balances/${adminAccountId}`);
      return response.data;
    },
    enabled: !!adminAccountId
  });

  // Admin Transfer Mutation
  const adminTransferMutation = useMutation({
    mutationFn: async (payload: { target: string; amt: number; pin: string }) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.target);
      const requestPayload: any = {
        sourceAccountId: adminAccountId,
        amount: payload.amt,
        currency: 'USD',
        idempotencyKey: 'admin-tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        category: 'TRANSFER',
        pin: payload.pin
      };
      if (isUuid) {
        requestPayload.targetAccountId = payload.target;
      } else {
        requestPayload.phoneNumber = payload.target;
      }
      const response = await axiosInstance.post('/api/transactions/transfer', requestPayload);
      return response.data;
    },
    onSuccess: () => {
      setTransferSuccess(`Successfully transferred $${parseFloat(transferAmount).toFixed(2)} to ${transferTarget}`);
      setTransferTarget('');
      setTransferAmount('');
      setTransferPin('');
      refetchAdminBalance();
      setTimeout(() => setTransferSuccess(''), 5000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.errorMessage || err.response?.data?.message || 'Transaction failed. Please check recipient details, balance, or PIN.';
      setTransferError(msg);
      setTimeout(() => setTransferError(''), 5000);
    }
  });

  // Treasury Transfer Mutation
  const treasuryTransferMutation = useMutation({
    mutationFn: async (payload: {
      sourceWalletId: string;
      targetWalletId?: string;
      targetUsername?: string;
      amount: number;
      adminPin: string;
      mfaCode?: string;
      category: string;
      reason: string;
    }) => {
      const response = await axiosInstance.post('/api/treasury/transfer', {
        ...payload,
        ipAddress: '127.0.0.1', // mock client IP
        deviceInfo: navigator.userAgent
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Treasury double-entry transaction posted successfully!');
      setErrorMsg('');
      setFundingAmount('');
      setAdminPinCode('');
      setMfaCode('');
      setFundingReason('');
      
      // Invalidate queries to refresh balances
      refetchSystemWallets();
      refetchAuditLogs();
      refetchGlobalEntries();
      if (selectedWalletId) refetchWalletEntries();

      setTimeout(() => setSuccessMsg(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Transfer failed. Check PIN or balances.');
      setSuccessMsg('');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  // Gamification configurations states & queries
  const [spinWheelJson, setSpinWheelJson] = useState('');
  const [scratchCardJson, setScratchCardJson] = useState('');
  const [gamifySuccess, setGamifySuccess] = useState('');
  const [gamifyError, setGamifyError] = useState('');

  const { refetch: refetchSpinConfig } = useQuery({
    queryKey: ['admin-spin-config'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/rewards/config/spin_wheel');
      setSpinWheelJson(response.data.configValue || '');
      return response.data;
    }
  });

  const { refetch: refetchScratchConfig } = useQuery({
    queryKey: ['admin-scratch-config'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/rewards/config/scratch_card');
      setScratchCardJson(response.data.configValue || '');
      return response.data;
    }
  });

  const updateGamifyConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      JSON.parse(value); // Local validate
      const response = await axiosInstance.post(`/api/rewards/admin/config/${key}`, { value });
      return response.data;
    },
    onSuccess: (_, variables) => {
      setGamifySuccess(`Successfully updated ${variables.key === 'spin_wheel' ? 'Lucky Spin' : 'Scratch Card'} configuration!`);
      if (variables.key === 'spin_wheel') refetchSpinConfig();
      else refetchScratchConfig();
      setTimeout(() => setGamifySuccess(''), 4000);
    },
    onError: (err: any) => {
      setGamifyError(err instanceof SyntaxError ? 'Invalid JSON format. Please verify braces and quotes.' : (err.response?.data?.message || 'Failed to save configuration.'));
      setTimeout(() => setGamifyError(''), 4000);
    }
  });

  // Fetch list of registered accounts
  const { data: accounts, isLoading, isError, refetch, isFetching } = useQuery<AccountDto[]>({
    queryKey: ['admin-accounts'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/admin/accounts');
      return response.data;
    },
  });

  // Fetch list of vault accounts
  const { data: vaultAccounts, refetch: refetchVaultAccounts } = useQuery<any[]>({
    queryKey: ['admin-vault-accounts'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/api/transactions/investments/admin/vault-accounts');
        return response.data;
      } catch (e) {
        console.error("Failed to fetch vault accounts", e);
        return [];
      }
    }
  });

  // Mutation to update vault status
  const updateVaultStatusMutation = useMutation({
    mutationFn: async ({ accountId, status, reason }: { accountId: string; status: string; reason: string }) => {
      const response = await axiosInstance.post(`/api/transactions/investments/admin/vault/${accountId}/status`, {
        status,
        reason
      });
      return response.data;
    },
    onSuccess: () => {
      refetchVaultAccounts();
      refetch();
    }
  });

  // Fetch Investment Admin Stats
  const { data: adminStats, refetch: refetchAdminStats } = useQuery<any>({
    queryKey: ['admin-vault-stats'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/transactions/investments/admin/stats');
      return response.data;
    }
  });

  // Fetch System-Wide Transactions
  const { data: globalEntries, refetch: refetchGlobalEntries } = useQuery<any[]>({
    queryKey: ['admin-global-entries'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/ledger/entries');
      return response.data;
    }
  });

  // Fetch Treasury Activity History
  const { data: treasuryHistory, refetch: refetchTreasuryHistory, isFetching: isFetchingHistory } = useQuery<any[]>({
    queryKey: ['admin-treasury-history'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/admin/history');
      return response.data;
    },
    refetchInterval: 20000
  });

  // Fetch System Wallets
  const { data: systemWallets, refetch: refetchSystemWallets } = useQuery<any[]>({
    queryKey: ['admin-system-wallets'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/wallets');
      return response.data;
    }
  });

  // Fetch Audit Logs
  const { data: auditLogs, refetch: refetchAuditLogs } = useQuery<any[]>({
    queryKey: ['admin-treasury-audit-logs'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/audit-logs');
      return response.data;
    }
  });

  // Fetch Wallet Entries
  const { data: walletEntries, refetch: refetchWalletEntries } = useQuery<any[]>({
    queryKey: ['admin-wallet-entries', selectedWalletId],
    queryFn: async () => {
      if (!selectedWalletId) return [];
      const response = await axiosInstance.get(`/api/treasury/wallets/${selectedWalletId}/entries`);
      return response.data;
    },
    enabled: !!selectedWalletId
  });

  // Fetch Scoped Entries for Account Inspection
  const { data: inspectedEntries = [], isLoading: isInspectingEntries } = useQuery<any[]>({
    queryKey: ['admin-inspect-entries', inspectAccountId],
    queryFn: async () => {
      if (!inspectAccountId) return [];
      const response = await axiosInstance.get(`/api/ledger/accounts/${inspectAccountId}/entries`);
      return response.data;
    },
    enabled: !!inspectAccountId
  });

  // Fetch Investments list
  const { data: investments, refetch: refetchInvestments } = useQuery<any[]>({
    queryKey: ['admin-investments'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/investments');
      return response.data;
    }
  });

  // Fetch Injections list
  const { data: injections, refetch: refetchInjections } = useQuery<any[]>({
    queryKey: ['admin-injections'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/injections');
      return response.data;
    }
  });

  // Fetch P&L records
  const { data: pnlLogs, refetch: refetchPnlLogs } = useQuery<any[]>({
    queryKey: ['admin-pnl-logs'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/pnl');
      return response.data;
    }
  });

  // Fetch Reconciliation Status
  const { data: reconciliation, refetch: refetchReconciliation } = useQuery<any>({
    queryKey: ['admin-reconciliation'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/reconciliation');
      return response.data;
    }
  });

  // Fetch Compliance Status
  const { data: compliance, refetch: refetchCompliance } = useQuery<any>({
    queryKey: ['admin-compliance'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/compliance');
      return response.data;
    }
  });

  // Fetch Stress Test Results
  const { data: stressTests } = useQuery<any[]>({
    queryKey: ['admin-stress-tests'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/treasury/stress-test');
      return response.data;
    }
  });

  // Mature Investment Order Mutation
  const matureInvestmentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await axiosInstance.post(`/api/treasury/investments/${orderId}/mature`, {
        ipAddress: '127.0.0.1',
        deviceInfo: navigator.userAgent
      }, {
        headers: { 'X-User-Name': 'mohana' }
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Investment matured successfully and yield spread distributed!');
      refetchInvestments();
      refetchSystemWallets();
      refetchPnlLogs();
      refetchReconciliation();
      refetchCompliance();
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to mature investment.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  // Fail Investment Order Mutation (Loss Simulation)
  const failInvestmentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await axiosInstance.post(`/api/treasury/investments/${orderId}/fail`, {
        ipAddress: '127.0.0.1',
        deviceInfo: navigator.userAgent
      }, {
        headers: { 'X-User-Name': 'mohana' }
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.injectionPending) {
        setSuccessMsg('Investment failed. Yield Reserve balance drawn down. CRITICAL: Emergency capital injection is pending admin approval!');
      } else {
        setSuccessMsg('Investment failed. Yield Reserve balance drawn down.');
      }
      refetchInvestments();
      refetchSystemWallets();
      refetchInjections();
      refetchPnlLogs();
      refetchReconciliation();
      refetchCompliance();
      setTimeout(() => setSuccessMsg(''), 6000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to simulate investment failure.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  // Approve capital injection mutation
  const approveInjectionMutation = useMutation({
    mutationFn: async (payload: { injectionId: string; adminPin: string; mfaCode: string }) => {
      const response = await axiosInstance.post(`/api/treasury/injections/${payload.injectionId}/approve`, {
        ...payload,
        ipAddress: '127.0.0.1',
        deviceInfo: navigator.userAgent
      }, {
        headers: { 'X-User-Name': 'mohana' }
      });
      return response.data;
    },
    onSuccess: () => {
      setApproveSuccess('Emergency capital injection approved and reserve coverage restored!');
      setApproveError('');
      setApprovePin('');
      setApproveMfa('');
      setSelectedInjectionId(null);
      
      refetchInjections();
      refetchSystemWallets();
      refetchReconciliation();
      refetchCompliance();
      setTimeout(() => setApproveSuccess(''), 4000);
    },
    onError: (err: any) => {
      setApproveError(err.response?.data?.message || 'Failed to approve capital injection.');
      setTimeout(() => setApproveError(''), 4000);
    }
  });

  // Request capital injection mutation
  const requestInjectionMutation = useMutation({
    mutationFn: async (payload: { sourceWallet: string; targetWallet: string; amount: number; reason: string }) => {
      const response = await axiosInstance.post('/api/treasury/injections', payload, {
        headers: { 'X-User-Name': 'mohana' }
      });
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Capital injection request queued successfully.');
      setNewInjectionAmount('');
      setNewInjectionReason('');
      refetchInjections();
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to request capital injection.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const handleInjectionRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInjectionAmount || parseFloat(newInjectionAmount) <= 0) {
      alert('Please enter a valid injection amount.');
      return;
    }
    requestInjectionMutation.mutate({
      sourceWallet: newInjectionSource,
      targetWallet: newInjectionTarget,
      amount: parseFloat(newInjectionAmount),
      reason: newInjectionReason || 'Administrative equity injection request'
    });
  };

  // Place investment mutation
  const placeInvestmentMutation = useMutation({
    mutationFn: async (payload: { assetType: string; principal: number; expectedReturn: number; notes: string; riskRating: string }) => {
      const response = await axiosInstance.post('/api/treasury/investments', {
        ...payload,
        ipAddress: '127.0.0.1',
        deviceInfo: navigator.userAgent
      }, {
        headers: { 'X-User-Name': 'mohana' }
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.warnings && data.warnings.length > 0) {
        setSuccessMsg('Investment placed successfully with compliance warnings: ' + data.warnings.join(' '));
      } else {
        setSuccessMsg('Investment placed successfully into active portfolio.');
      }
      setNewInvestPrincipal('');
      setNewInvestNotes('');
      setNewInvestExpected('5.42');
      
      refetchInvestments();
      refetchSystemWallets();
      refetchReconciliation();
      refetchCompliance();
      setTimeout(() => setSuccessMsg(''), 6000);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to place investment.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const freezeMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await axiosInstance.put(`/api/admin/accounts/${accountId}/freeze`);
      return response.data;
    },
    onSuccess: (_, accountId) => {
      setSuccessMsg(`Successfully froze account ${accountId.substring(0, 8)}...`);
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to freeze account.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const unfreezeMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await axiosInstance.put(`/api/admin/accounts/${accountId}/unfreeze`);
      return response.data;
    },
    onSuccess: (_, accountId) => {
      setSuccessMsg(`Successfully unfroze account ${accountId.substring(0, 8)}...`);
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to unfreeze account.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const resetMfaMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await axiosInstance.post(`/api/admin/accounts/${accountId}/reset-mfa`);
      return response.data;
    },
    onSuccess: (_, accountId) => {
      setSuccessMsg(`Successfully reset 2FA for account ${accountId.substring(0, 8)}...`);
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to reset 2FA.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  // Admin Investment Mutations
  const updateApyMutation = useMutation({
    mutationFn: async (apy: number) => {
      await axiosInstance.post('/api/transactions/investments/admin/apy', { apyRate: apy });
    },
    onSuccess: () => {
      setSuccessMsg('Successfully updated global APY rate and synced active accounts.');
      refetchAdminStats();
      setNewApy('');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to update APY rate.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const togglePauseMutation = useMutation({
    mutationFn: async (paused: boolean) => {
      await axiosInstance.post('/api/transactions/investments/admin/pause', { paused });
    },
    onSuccess: () => {
      setSuccessMsg('Successfully updated Yield Engine execution state.');
      refetchAdminStats();
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to toggle Yield Engine state.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const triggerYieldMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/api/transactions/investments/admin/trigger-yield');
      return response.data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || 'Successfully executed manual daily interest calculation.');
      refetchAdminStats();
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to trigger yield accrual.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  // Trigger APY Savings Interest Accrual Mutation
  const triggerApyInterestMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/api/transactions/interest/trigger');
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Daily 4.5% APY interest yield accrued on neobank balances successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to trigger APY savings interest accrual.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  // Cashback Offers States
  const [showCreateOfferForm, setShowCreateOfferForm] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerTxType, setOfferTxType] = useState('TRANSFER');
  const [offerMinAmt, setOfferMinAmt] = useState('');
  const [offerPct, setOfferPct] = useState('');
  const [offerFixed, setOfferFixed] = useState('');
  const [offerMax, setOfferMax] = useState('');

  // Fetch all cashback offers
  const { data: offers, refetch: refetchOffers } = useQuery<any[]>({
    queryKey: ['admin-cashback-offers'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/rewards/admin/offers');
      return response.data;
    }
  });

  // Fetch rewards analytics
  const { data: rewardsAnalytics, refetch: refetchRewardsAnalytics } = useQuery<any>({
    queryKey: ['admin-rewards-analytics'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/rewards/admin/analytics');
      return response.data;
    }
  });

  const createOfferMutation = useMutation({
    mutationFn: async (newOffer: any) => {
      const response = await axiosInstance.post('/api/rewards/admin/offers', newOffer);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Successfully created new cashback offer campaign!');
      refetchOffers();
      refetchRewardsAnalytics();
      setOfferTitle('');
      setOfferDescription('');
      setOfferTxType('TRANSFER');
      setOfferMinAmt('');
      setOfferPct('');
      setOfferFixed('');
      setOfferMax('');
      setShowCreateOfferForm(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to create cashback offer.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const toggleOfferMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await axiosInstance.post(`/api/rewards/admin/offers/${id}/toggle?active=${active}`);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMsg('Successfully updated cashback offer status.');
      refetchOffers();
      refetchRewardsAnalytics();
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Failed to toggle cashback offer.'));
      setTimeout(() => setErrorMsg(''), 4000);
    }
  });

  const handleCreateOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim() || !offerDescription.trim()) {
      alert('Title and description are required.');
      return;
    }
    const payload = {
      title: offerTitle.trim(),
      description: offerDescription.trim(),
      transactionType: offerTxType,
      minAmount: parseFloat(offerMinAmt) || 0,
      cashbackPercentage: parseFloat(offerPct) || 0,
      fixedCashback: parseFloat(offerFixed) || 0,
      maxCashback: parseFloat(offerMax) || 0,
      startDate: new Date().toISOString().substring(0, 19),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 19),
      active: true
    };
    createOfferMutation.mutate(payload);
  };

  const handleApySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedApy = parseFloat(newApy);
    if (isNaN(parsedApy) || parsedApy <= 0 || parsedApy > 50) {
      alert('Please enter a valid APY rate between 0.1% and 50.0%.');
      return;
    }
    updateApyMutation.mutate(parsedApy);
  };

  const getStatusBadge = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[3px] shadow-[0_0_20px_rgba(124,58,237,0.25)] flex items-center justify-center">
            <div className="w-full h-full rounded-xl bg-[#0b0b0f] p-2 flex items-center justify-center text-violet-400">
              <ShieldCheck className="h-6 w-6 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-white tracking-tight">
              Vault Yield Engine <span className="text-[10px] uppercase font-mono tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded ml-2">Treasury Core</span>
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Automated Multi-Asset Allocator & Yield Distribution Console</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetch();
              refetchAdminStats();
              refetchOffers();
              refetchAdminBalance();
              refetchGlobalEntries();
              refetchTreasuryHistory();
              refetchSystemWallets();
              refetchAuditLogs();
              if (selectedWalletId) refetchWalletEntries();
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-xs font-semibold text-gray-300 transition-all active:scale-95"
          >
            <RefreshCw className={`h-4.5 w-4.5 text-violet-400 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Sync Systems</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4.5 w-4.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Premium Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'overview'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Treasury Overview
        </button>
        <button
          onClick={() => setActiveTab('explorer')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'explorer'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Wallet Explorer
        </button>
        <button
          onClick={() => setActiveTab('lifecycle')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'lifecycle'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Investments & Injections
        </button>
        <button
          onClick={() => setActiveTab('pnl')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'pnl'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          P&L & Stress Tests
        </button>
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'registry'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Accounts & Transfers
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'rewards'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Rewards & Prizes
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === 'history'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Treasury Activity
        </button>
      </div>

      {/* CONDITIONAL RENDER BY ACTIVE TAB */}
      {activeTab === 'overview' && adminStats && (
        <div className="space-y-8 animate-fade-in">
          {/* Reconciliation & Compliance Warnings */}
          {reconciliation && !reconciliation.balanced && (
            <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-4 animate-pulse">
              <AlertCircle className="h-6 w-6 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1.5 w-full">
                <p className="font-black uppercase tracking-wider text-[10px] text-rose-400 flex items-center gap-1.5">
                  ⚠ Reconciliation Issue Detected (Status: {reconciliation.treasuryStatus || 'CRITICAL'})
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5 text-gray-300 font-mono text-[11px] pt-1">
                  <p>
                    Difference: <span className="font-bold text-white">${(reconciliation.difference || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                  <p>
                    Category: <span className="font-bold text-white">{reconciliation.category || 'N/A'}</span>
                  </p>
                  <p className="md:col-span-2">
                    Affected Transaction: <span className="font-bold text-white">{reconciliation.affectedTransactionId || 'N/A'}</span>
                  </p>
                  <p className="md:col-span-2">
                    Affected Flow: <span className="font-bold text-white">{reconciliation.affectedDebitAccount || 'Unknown'} &rarr; {reconciliation.affectedCreditAccount || 'Unknown'}</span>
                  </p>
                  <p>
                    Missing Leg: <span className="font-bold text-rose-300">{reconciliation.missingEntryType || 'Unknown'} Entry</span>
                  </p>
                  <p>
                    Last Validated: <span className="font-bold text-gray-400">{reconciliation.lastValidatedAt ? new Date(reconciliation.lastValidatedAt).toLocaleString() : 'N/A'}</span>
                  </p>
                </div>
                <p className="text-gray-400 text-[10px] pt-1">
                  Recommended Action: <span className="text-rose-300">{reconciliation.recommendation || 'Inspect recent deposit/withdrawal ledger logs.'}</span>
                </p>
                <p className="text-rose-300 font-semibold text-[10px] uppercase tracking-wide mt-2">
                  Status: Treasury distributions and rewards paused until balanced.
                </p>
              </div>
            </div>
          )}
          {compliance && compliance.violations && compliance.violations.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
                <span className="font-bold uppercase tracking-wider text-[10px]">Exposure Risk & Concentration Warnings</span>
              </div>
              <ul className="list-disc list-inside text-gray-400 space-y-0.5 pl-1">
                {compliance.violations.map((violation: string, idx: number) => (
                  <li key={idx}>{violation}</li>
                ))}
              </ul>
            </div>
          )}

          {(() => {
            const cashbackBal = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c605')?.runningBalance || 0;
            const yieldReserveBal = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603')?.runningBalance || 0;
            const platformRevenueBal = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c602')?.runningBalance || 0;
            const ownerTreasuryBal = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c601')?.runningBalance || 0;

            const totalUserVaultAssets = vaultAccounts?.reduce((sum, acc) => sum + (acc.investedBalance || 0), 0) || adminStats?.totalAum || 0;
            const totalActiveVaultUsers = vaultAccounts?.filter(acc => acc.investedBalance > 0).length || adminStats?.accountsCount || 0;
            const todayInterestObligation = vaultAccounts?.reduce((sum, acc) => {
              const balance = acc.investedBalance || 0;
              const apy = acc.apyRate || 4.50;
              return sum + ((balance * (apy / 100)) / 365);
            }, 0) || 0;

            const calculatedObligation = todayInterestObligation > 0 
              ? todayInterestObligation 
              : (totalUserVaultAssets * ((adminStats?.apyRate || 4.50) / 100)) / 365;

            const coverageDays = calculatedObligation > 0 ? Math.floor(yieldReserveBal / calculatedObligation) : 9999;

            let fundingStatus: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
            const alerts: string[] = [];

            if (cashbackBal <= 0 || yieldReserveBal <= 0 || ownerTreasuryBal <= 0) {
              fundingStatus = 'Critical';
            } else if (cashbackBal < 100 || yieldReserveBal < 1000 || ownerTreasuryBal < 2000) {
              fundingStatus = 'Warning';
            }

            if (cashbackBal <= 0) {
              alerts.push("Cashback Wallet is fully exhausted. Reward distributions are suspended!");
            } else if (cashbackBal < 100) {
              alerts.push(`Cashback Wallet is running low ($${cashbackBal.toFixed(2)}). Warning threshold is $100. Please top up.`);
            }

            if (yieldReserveBal <= 0) {
              alerts.push("Yield Reserve Wallet is exhausted. Vault and APY interest payouts are suspended!");
            } else if (yieldReserveBal < 1000) {
              alerts.push(`Yield Reserve Wallet is running low ($${yieldReserveBal.toFixed(2)}). Warning threshold is $1,000. Please top up.`);
            }

            if (ownerTreasuryBal <= 0) {
              alerts.push("Owner Treasury Wallet is fully depleted. System liquidity coverage is compromised!");
            } else if (ownerTreasuryBal < 2000) {
              alerts.push(`Owner Treasury Wallet is running low ($${ownerTreasuryBal.toFixed(2)}). Warning threshold is $2,000. Please top up.`);
            }

            return (
              <div className="space-y-6">
                {/* 1. Treasury Funding Status Card */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-[#111118] via-[#0b0b10] to-[#08080c] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-3xl" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Coins className="h-4.5 w-4.5 text-violet-400" />
                        Treasury Funding Status
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Real-time solvency check of neobank system-wide funding pools</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      fundingStatus === 'Healthy' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : fundingStatus === 'Warning'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                    }`}>
                      Status: {fundingStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {/* Cashback Wallet */}
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Cashback Wallet</span>
                      <p className={`text-xl font-black font-mono mt-1 ${cashbackBal < 100 ? 'text-amber-400' : 'text-white'}`}>
                        ${cashbackBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
                        <div 
                          className={`h-full rounded-full ${cashbackBal < 100 ? 'bg-amber-500' : 'bg-violet-500'}`} 
                          style={{ width: `${Math.min(100, (cashbackBal / 500) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-gray-500 font-bold mt-1.5">
                        <span>Target: $500</span>
                        <span>Limit: $100</span>
                      </div>
                    </div>

                    {/* Yield Reserve */}
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Yield Reserve</span>
                      <p className={`text-xl font-black font-mono mt-1 ${yieldReserveBal < 1000 ? 'text-amber-400' : 'text-white'}`}>
                        ${yieldReserveBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
                        <div 
                          className={`h-full rounded-full ${yieldReserveBal < 1000 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min(100, (yieldReserveBal / 4999) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-gray-500 font-bold mt-1.5">
                        <span>Target: $4,999</span>
                        <span>Limit: $1,000</span>
                      </div>
                    </div>

                    {/* Platform Revenue */}
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Platform Revenue</span>
                      <p className="text-xl font-black text-white font-mono mt-1">
                        ${platformRevenueBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
                        <div 
                          className="h-full rounded-full bg-blue-500" 
                          style={{ width: `${Math.min(100, (platformRevenueBal / 250) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-gray-500 font-bold mt-1.5">
                        <span>Target: $250</span>
                        <span>Limit: $0</span>
                      </div>
                    </div>

                    {/* Owner Treasury */}
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Owner Treasury</span>
                      <p className={`text-xl font-black font-mono mt-1 ${ownerTreasuryBal < 2000 ? 'text-amber-400' : 'text-white'}`}>
                        ${ownerTreasuryBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
                        <div 
                          className={`h-full rounded-full ${ownerTreasuryBal < 2000 ? 'bg-amber-500' : 'bg-fuchsia-500'}`} 
                          style={{ width: `${Math.min(100, (ownerTreasuryBal / 10000) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] text-gray-500 font-bold mt-1.5">
                        <span>Target: $10,000</span>
                        <span>Limit: $2,000</span>
                      </div>
                    </div>
                  </div>

                  {alerts.length > 0 && (
                    <div className="mt-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
                      {alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-amber-400 font-semibold leading-relaxed">
                          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-500 mt-0.5" />
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Yield Funding Coverage & Vault Statistics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Yield Funding Coverage Card */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-[#111118] via-[#0b0b10] to-[#08080c] shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Percent className="h-4 w-4 text-emerald-400" />
                        Yield Funding Coverage
                      </h4>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                        coverageDays >= 100
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : coverageDays >= 30
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                      }`}>
                        {coverageDays >= 100 ? '🟢 Healthy' : coverageDays >= 30 ? '🟡 Warning' : '🔴 Critical'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Total User Vault Assets</span>
                        <span className="font-mono font-bold text-white">${totalUserVaultAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Total Active Vault Users</span>
                        <span className="font-mono font-bold text-white">{totalActiveVaultUsers}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Interest Obligation Today</span>
                        <span className="font-mono font-bold text-rose-400">${calculatedObligation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Yield Reserve Balance</span>
                        <span className="font-mono font-bold text-emerald-400">${yieldReserveBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center mt-2.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Days of Coverage</span>
                        <span className="font-mono font-black text-sm text-white">{coverageDays === 9999 ? '∞ Days' : `${coverageDays} Days`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vault Statistics Card */}
                  <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-br from-[#111118] via-[#0b0b10] to-[#08080c] shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-violet-400" />
                        Vault Statistics
                      </h4>
                    </div>

                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Active Vault Users</span>
                        <span className="font-mono font-bold text-white">{totalActiveVaultUsers}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Total Vault Deposits</span>
                        <span className="font-mono font-bold text-white">${totalUserVaultAssets.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Total Yield Distributed</span>
                        <span className="font-mono font-bold text-white">${(adminStats?.totalYieldDistributed || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Average Vault Balance</span>
                        <span className="font-mono font-bold text-white">${(totalActiveVaultUsers > 0 ? totalUserVaultAssets / totalActiveVaultUsers : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Treasury Money Flow */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#111118]/90 shadow-xl relative overflow-hidden">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    Treasury Money Flow
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center text-xs">
                    {/* Vault Interest Flow */}
                    <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Vault Interest Accrual Flow</span>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-white font-bold">Founder Capital</div>
                        <span className="text-gray-500 font-bold text-base leading-none">↓</span>
                        <div className="px-3 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-white font-bold">Owner Treasury</div>
                        <span className="text-gray-500 font-bold text-base leading-none">↓</span>
                        <div className="px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-white font-bold">Investment Portfolio</div>
                        <span className="text-gray-500 font-bold text-base leading-none">↓</span>
                        <div className="px-3 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-white font-bold">Yield Reserve</div>
                        <span className="text-gray-500 font-bold text-base leading-none">↓</span>
                        <div className="px-4 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black">User Vault Interest</div>
                      </div>
                    </div>

                    {/* Rewards & Promo Flow */}
                    <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3 flex flex-col justify-between">
                      <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest block mb-2">Rewards & Promotions Flow</span>
                      <div className="flex flex-col items-center gap-2.5 h-full justify-center">
                        <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-white font-bold">Platform Revenue</div>
                        <span className="text-gray-500 font-bold text-base leading-none">↓</span>
                        <div className="px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-white font-bold">Cashback Wallet</div>
                        <span className="text-gray-500 font-bold text-base leading-none">↓</span>
                        <div className="px-4 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black">Rewards Distribution</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Executive Treasury Overview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Customer Deposits (AUM) */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Customer Deposits (AUM)</span>
              <p className="text-lg font-black text-white font-display mt-1">
                ${(adminStats?.totalAum || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[8px] text-gray-500 mt-1 block">Total client deposits in wealth vault</span>
            </div>

            {/* Treasury Capital */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Treasury Capital</span>
              <p className="text-lg font-black text-indigo-400 font-display mt-1">
                ${(systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c601')?.runningBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[8px] text-gray-500 mt-1 block">Owner working capital buffer</span>
            </div>

            {/* Invested Assets */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Invested Assets</span>
              <p className="text-lg font-black text-cyan-400 font-display mt-1">
                ${(investments ? investments.filter(i => i.status === 'ACTIVE').reduce((sum, i) => sum + i.principal, 0) : 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[8px] text-gray-500 mt-1 block">Allocated to yield portfolio</span>
            </div>

            {/* Yield Reserve */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Yield Reserve</span>
              <p className="text-lg font-black text-emerald-400 font-display mt-1">
                ${(systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603')?.runningBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[8px] text-gray-500 mt-1 block">Reserve coverage pool balance</span>
            </div>

            {/* Treasury Health */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85 flex flex-col justify-between">
              <div>
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Treasury Health</span>
                <p className={`text-lg font-black font-display mt-1 ${
                  (() => {
                    const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                    const reserveVal = yieldReserveWallet?.runningBalance || 0;
                    const customerDeposits = adminStats?.totalAum || 0;
                    const userApyRate = adminStats?.apyRate || 3.25;
                    const annualYieldLiability = customerDeposits * (userApyRate / 100);
                    const coverageRatio = annualYieldLiability > 0 ? (reserveVal / annualYieldLiability) : 99.9;
                    return coverageRatio >= 2 ? 'text-emerald-400' : coverageRatio >= 1 ? 'text-amber-400' : 'text-rose-400';
                  })()
                }`}>
                  {(() => {
                    const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                    const reserveVal = yieldReserveWallet?.runningBalance || 0;
                    const customerDeposits = adminStats?.totalAum || 0;
                    const userApyRate = adminStats?.apyRate || 3.25;
                    const annualYieldLiability = customerDeposits * (userApyRate / 100);
                    const coverageRatio = annualYieldLiability > 0 ? (reserveVal / annualYieldLiability) : 99.9;
                    return coverageRatio >= 2 ? 'Healthy' : coverageRatio >= 1 ? 'Warning' : 'Critical';
                  })()}
                </p>
              </div>
              <span className="text-[8px] text-gray-500 mt-1 block">Audited safety metric</span>
            </div>
          </div>

          {/* Section 2: Money Flow Pipeline */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-violet-400" />
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Treasury Money Flow Pipeline</h3>
            </div>
            
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5">
              {/* Step 1: Customer Deposits */}
              <div className="flex-1 text-center p-4 rounded-xl border border-white/5 bg-[#0b0b0f] w-full lg:w-auto">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">1. Deposits</span>
                <span className="font-bold text-xs text-white mt-1 block">Customer Deposits</span>
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">${(adminStats?.totalAum || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="text-gray-600 font-bold rotate-90 lg:rotate-0 text-lg">➔</div>

              {/* Step 2: Treasury Capital */}
              <div className="flex-1 text-center p-4 rounded-xl border border-white/5 bg-[#0b0b0f] w-full lg:w-auto">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">2. Treasury</span>
                <span className="font-bold text-xs text-white mt-1 block">Treasury Capital</span>
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">${(systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c601')?.runningBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="text-gray-600 font-bold rotate-90 lg:rotate-0 text-lg">➔</div>

              {/* Step 3: Investment Portfolio */}
              <div className="flex-1 text-center p-4 rounded-xl border border-white/5 bg-[#0b0b0f] w-full lg:w-auto">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">3. Portfolio</span>
                <span className="font-bold text-xs text-white mt-1 block">Investment Portfolio</span>
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">${(investments ? investments.filter(i => i.status === 'ACTIVE').reduce((sum, i) => sum + i.principal, 0) : 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="text-gray-600 font-bold rotate-90 lg:rotate-0 text-lg">➔</div>

              {/* Step 4: Yield Reserve */}
              <div className="flex-1 text-center p-4 rounded-xl border border-white/5 bg-[#0b0b0f] w-full lg:w-auto">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">4. Reserve</span>
                <span className="font-bold text-xs text-white mt-1 block">Yield Reserve</span>
                <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">${(systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603')?.runningBalance || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="text-gray-600 font-bold rotate-90 lg:rotate-0 text-lg">➔</div>

              {/* Step 5: Customer Yield */}
              <div className="flex-1 text-center p-4 rounded-xl border border-white/5 bg-[#0b0b0f] w-full lg:w-auto">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">5. Payouts</span>
                <span className="font-bold text-xs text-white mt-1 block">Customer Yield</span>
                <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">{adminStats?.apyRate?.toFixed(2)}% APY</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Sustainability Metric & Yield Settings */}
            <div className="lg:col-span-2 space-y-8">
              {/* Sustainability Panel */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Yield Reserve Sustainability Metrics</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black font-mono border ${
                    (() => {
                      const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                      const reserveVal = yieldReserveWallet?.runningBalance || 0;
                      const customerDeposits = adminStats?.totalAum || 0;
                      const userApyRate = adminStats?.apyRate || 3.25;
                      const annualYieldLiability = customerDeposits * (userApyRate / 100);
                      const coverageRatio = annualYieldLiability > 0 ? (reserveVal / annualYieldLiability) : 99.9;
                      return coverageRatio >= 2 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : coverageRatio >= 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                    })()
                  }`}>
                    {(() => {
                      const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                      const reserveVal = yieldReserveWallet?.runningBalance || 0;
                      const customerDeposits = adminStats?.totalAum || 0;
                      const userApyRate = adminStats?.apyRate || 3.25;
                      const annualYieldLiability = customerDeposits * (userApyRate / 100);
                      const coverageRatio = annualYieldLiability > 0 ? (reserveVal / annualYieldLiability) : 99.9;
                      return coverageRatio >= 2 ? 'HEALTHY' : coverageRatio >= 1 ? 'WARNING' : 'CRITICAL';
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Reserve Balance</span>
                    <p className="text-sm font-bold text-white font-mono mt-1">
                      ${(() => {
                        const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                        return yieldReserveWallet ? yieldReserveWallet.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00';
                      })()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Annual Obligation</span>
                    <p className="text-sm font-bold text-white font-mono mt-1">
                      ${(() => {
                        const customerDeposits = adminStats?.totalAum || 0;
                        const userApyRate = adminStats?.apyRate || 3.25;
                        return (customerDeposits * (userApyRate / 100)).toLocaleString('en-US', { minimumFractionDigits: 2 });
                      })()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Monthly Obligation</span>
                    <p className="text-sm font-bold text-white font-mono mt-1">
                      ${(() => {
                        const customerDeposits = adminStats?.totalAum || 0;
                        const userApyRate = adminStats?.apyRate || 3.25;
                        return (customerDeposits * (userApyRate / 100) / 12).toLocaleString('en-US', { minimumFractionDigits: 2 });
                      })()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Reserve Runway</span>
                    <p className="text-sm font-bold text-emerald-400 font-mono mt-1">
                      {(() => {
                        const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                        const reserveVal = yieldReserveWallet?.runningBalance || 0;
                        const customerDeposits = adminStats?.totalAum || 0;
                        const userApyRate = adminStats?.apyRate || 3.25;
                        const annualYieldLiability = customerDeposits * (userApyRate / 100);
                        const coverageRatio = annualYieldLiability > 0 ? (reserveVal / annualYieldLiability) : 99.9;
                        return coverageRatio > 100 ? 'Excellent (>100 Years)' : coverageRatio.toFixed(1) + ' Years';
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Yield Controls & Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Yield Accrual Controller */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-indigo-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Yield Distribution Engine</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/[0.01]">
                      <span className="text-xs text-gray-400">Yield Engine Status</span>
                      <button 
                        onClick={() => togglePauseMutation.mutate(!adminStats.yieldEnginePaused)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors ${
                          adminStats.yieldEnginePaused 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {adminStats.yieldEnginePaused ? 'PAUSED' : 'RUNNING'}
                      </button>
                    </div>

                    <button 
                      onClick={() => triggerYieldMutation.mutate()}
                      disabled={triggerYieldMutation.isPending || adminStats.yieldEnginePaused}
                      className={`w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest transition shadow-lg shadow-indigo-600/10 ${
                        (triggerYieldMutation.isPending || adminStats.yieldEnginePaused) && 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {triggerYieldMutation.isPending ? 'Accruing Interest...' : 'Trigger Daily Accrual'}
                    </button>
                  </div>
                </div>

                {/* Adjust Target APY */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                  <div className="flex items-center gap-2">
                    <Percent className="h-5 w-5 text-violet-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Adjust Target APY</h3>
                  </div>

                  <form onSubmit={handleApySubmit} className="space-y-4">
                    <div className="relative">
                      <input 
                        type="number"
                        step="0.01"
                        placeholder={adminStats.apyRate.toFixed(2)}
                        value={newApy}
                        onChange={(e) => setNewApy(e.target.value)}
                        className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3.5 px-4 text-white text-xs font-mono font-bold focus:border-violet-500 transition outline-none"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono font-black text-xs">% APY</span>
                    </div>

                    <button 
                      type="submit"
                      disabled={updateApyMutation.isPending}
                      className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-widest transition shadow-lg shadow-violet-600/10"
                    >
                      {updateApyMutation.isPending ? 'Updating...' : 'Update APY Rate'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Col: Ledger Flow, Stress Tests, Audit logs */}
            <div className="space-y-8">
              {/* Treasury Health */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Treasury Health & Coverage</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold">LCR: 100%</span>
                </div>

                <div className="space-y-4 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reserve Coverage:</span>
                    <span className={`font-bold ${
                      (() => {
                        const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                        const reserveVal = yieldReserveWallet?.runningBalance || 0;
                        const customerDeposits = adminStats?.totalAum || 0;
                        const userApyRate = adminStats?.apyRate || 3.25;
                        const annualYieldLiability = customerDeposits * (userApyRate / 100);
                        const coverageRatio = annualYieldLiability > 0 ? (reserveVal / annualYieldLiability) : 99.9;
                        return coverageRatio >= 2 ? 'text-emerald-400' : coverageRatio >= 1 ? 'text-amber-400' : 'text-rose-400';
                      })()
                    }`}>
                      {(() => {
                        const yieldReserveWallet = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c603');
                        const reserveVal = yieldReserveWallet?.runningBalance || 0;
                        const customerDeposits = adminStats?.totalAum || 0;
                        const userApyRate = adminStats?.apyRate || 3.25;
                        const annualYieldLiability = customerDeposits * (userApyRate / 100);
                        const coverageRatio = annualYieldLiability > 0 ? (reserveVal / annualYieldLiability) : 99.9;
                        return coverageRatio >= 2 ? 'HEALTHY' : coverageRatio >= 1 ? 'WARNING' : 'CRITICAL';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Liquidity Ratio:</span>
                    <span className="text-white font-bold">
                      {(() => {
                        const customerDeposits = adminStats?.totalAum || 0;
                        const cashReserve = investments?.filter(i => i.status === 'ACTIVE' && i.assetType === 'CASH_RESERVE').reduce((sum, i) => sum + i.principal, 0) || 0;
                        const targetCash = customerDeposits * 0.05;
                        const lcr = targetCash > 0 ? Math.min(Math.round((cashReserve / targetCash) * 100), 200) : 100;
                        return lcr + '%';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Treasury Status:</span>
                    <span className={`font-bold ${adminStats.yieldEnginePaused ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {adminStats.yieldEnginePaused ? 'PAUSED' : 'OPERATIONAL'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reconciliation Status:</span>
                    <span className={`font-bold ${reconciliation?.balanced ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {reconciliation?.balanced ? 'BALANCED' : 'IMBALANCED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Neobank Double-Entry Flow Summary */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-violet-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Treasury Ledger Flow</h3>
                </div>

                <div className="relative pl-6 border-l border-white/5 space-y-6 text-xs font-sans">
                  <div className="relative">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-violet-600 border-4 border-[#0c0c10]" />
                    <p className="font-bold text-white uppercase text-[10px]">1. Controlled Injections</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">Admin-approved capital moves from Founder Capital to Yield Reserve Wallet with PIN + MFA validation.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-4 border-[#0c0c10]" />
                    <p className="font-bold text-white uppercase text-[10px]">2. Asset Yield Maturation</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">Custodial portfolio investments mature, crediting gross returns directly to Yield Reserve.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[30px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#0c0c10]" />
                    <p className="font-bold text-white uppercase text-[10px]">3. Obligation Satisfied First</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">Yield Reserve satisfies user obligations (3.25% APY), maintains buffers, then transfers spread to Platform Revenue.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'explorer' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar: Wallet Selectors */}
            <div className="lg:col-span-1 space-y-4">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider pl-1">System Account Explorer</span>
              <div className="space-y-2">
                {systemWallets && systemWallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      setSelectedWalletId(wallet.id);
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedWalletId === wallet.id
                        ? 'bg-violet-600/10 border-violet-500 text-white shadow-md'
                        : 'bg-[#12121a]/85 border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className="text-[8px] font-black font-mono uppercase block text-gray-500">{wallet.id.substring(0, 8)}</span>
                    <span className="font-semibold text-xs mt-1 block truncate">{wallet.name}</span>
                    <span className="font-mono text-xs font-bold mt-2 block">${wallet.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Panel: Selected Wallet Detail & Transactions */}
            <div className="lg:col-span-3 space-y-8">
              {selectedWalletId ? (
                (() => {
                  const walletObj = systemWallets?.find(w => w.id === selectedWalletId);
                  if (!walletObj) return null;

                  return (
                    <div className="space-y-8">
                      {/* Wallet Core Stats Banner */}
                      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 text-[8px] font-black font-mono text-gray-700 tracking-wider">
                          UUID: {walletObj.id}
                        </div>
                        <div className="space-y-4">
                          <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Active Wallet Console</span>
                          <h2 className="text-lg font-black text-white font-display uppercase tracking-tight">{walletObj.name}</h2>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-white/5">
                            <div>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Available Balance</span>
                              <p className="text-xl font-black text-white font-mono mt-1">${walletObj.runningBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Reserved Balance</span>
                              <p className="text-xl font-black text-gray-600 font-mono mt-1">$0.00</p>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Total Inflows</span>
                              <p className="text-xl font-black text-emerald-400 font-mono mt-1">${walletObj.lifetimeInflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Total Outflows</span>
                              <p className="text-xl font-black text-rose-400 font-mono mt-1">${walletObj.lifetimeOutflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Wallet Relationship View */}
                      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4.5 w-4.5 text-violet-400" />
                          <h3 className="text-xs font-black text-white uppercase tracking-wider">Wallet Relationship View</h3>
                        </div>
                        <p className="text-[10px] text-gray-400">Visualization of ledger relationship models and automated distributions</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center text-[11px] pt-2">
                          {/* Yield Flow */}
                          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center gap-1.5">
                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Vault Yield Funding Path</span>
                            <div className="px-3 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-white font-bold">Yield Reserve</div>
                            <span className="text-gray-500 font-bold leading-none">↓</span>
                            <span className="text-gray-400">Daily Accrued Interest</span>
                            <span className="text-gray-500 font-bold leading-none">↓</span>
                            <div className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">User Vaults</div>
                          </div>

                          {/* Rewards Flow */}
                          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center gap-1.5">
                            <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest block mb-1">Rewards Funding Path</span>
                            <div className="px-3 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-white font-bold">Revenue Wallet</div>
                            <span className="text-gray-500 font-bold leading-none">↓</span>
                            <div className="px-3 py-1 rounded bg-pink-500/10 border border-pink-500/20 text-white font-bold">Cashback Wallet</div>
                            <span className="text-gray-500 font-bold leading-none">↓</span>
                            <span className="text-gray-400 font-bold text-amber-400">Reward Payouts</span>
                          </div>
                        </div>
                      </div>

                      {/* Treasury Funding & Allocation Controls */}
                      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-5 w-5 text-violet-400" />
                          <h3 className="text-xs font-black text-white uppercase tracking-wider">Treasury Transfer & Funding Desk</h3>
                        </div>

                        {successMsg && (
                          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-xs flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{successMsg}</span>
                          </div>
                        )}
                        {errorMsg && (
                          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium text-xs flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{errorMsg}</span>
                          </div>
                        )}

                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!fundingAmount || isNaN(parseFloat(fundingAmount)) || parseFloat(fundingAmount) <= 0) {
                              alert('Please enter a valid transfer amount.');
                              return;
                            }
                            if (!adminPinCode || adminPinCode.length !== 4) {
                              alert('Please enter a 4-digit transaction PIN.');
                              return;
                            }
                            const isCust = targetWalletId === 'CUSTOMER';
                            treasuryTransferMutation.mutate({
                              sourceWalletId: selectedWalletId,
                              targetWalletId: isCust ? undefined : targetWalletId,
                              targetUsername: isCust ? targetUsername : undefined,
                              amount: parseFloat(fundingAmount),
                              adminPin: adminPinCode,
                              category: fundingCategory,
                              reason: fundingReason || 'Neobank Treasury Transfer'
                            });
                          }}
                          className="space-y-4 text-xs font-sans"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-gray-500 font-bold mb-1.5 font-sans">Source Wallet</label>
                              <input 
                                type="text"
                                readOnly
                                value={walletObj.name}
                                className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-gray-400 font-bold outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-gray-500 font-bold mb-1.5 font-sans">Target Recipient</label>
                              <select
                                value={targetWalletId}
                                onChange={(e) => setTargetWalletId(e.target.value)}
                                className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white font-bold outline-none focus:border-violet-500 transition"
                              >
                                <option value="CUSTOMER">Customer Vault Account (Username / Phone)</option>
                                {systemWallets?.filter(w => w.id !== selectedWalletId).map(w => (
                                  <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-gray-500 font-bold mb-1.5 font-sans">Transaction Category</label>
                              <select
                                value={fundingCategory}
                                onChange={(e) => setFundingCategory(e.target.value)}
                                className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white font-bold outline-none focus:border-violet-500 transition"
                              >
                                <option value="TREASURY_ALLOCATION">Treasury Allocation</option>
                                <option value="YIELD_DISTRIBUTION">Yield Distribution</option>
                                <option value="REWARDS_PAYOUT">Rewards Payout</option>
                                <option value="CASHBACK">Cashback Rewards</option>
                                <option value="OPERATIONAL_EXPENSE">Operational Expense</option>
                                <option value="LIQUIDITY_MANAGEMENT">Liquidity Management</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                            {targetWalletId === 'CUSTOMER' && (
                              <div>
                                <label className="block text-gray-500 font-bold mb-1.5">Customer Username or Phone</label>
                                <input 
                                  type="text"
                                  placeholder="e.g. mohana or 8333017713"
                                  value={targetUsername}
                                  onChange={(e) => setTargetUsername(e.target.value)}
                                  className="w-full bg-[#0b0b0f] border border-white/5 rounded-xl py-3 px-4 text-white font-mono focus:border-violet-500 focus:outline-none"
                                />
                              </div>
                            )}

                            <div className={targetWalletId !== 'CUSTOMER' ? 'md:col-span-2' : ''}>
                              <label className="block text-gray-500 font-bold mb-1.5">Amount (USD)</label>
                              <input 
                                type="number"
                                placeholder="0.00"
                                value={fundingAmount}
                                onChange={(e) => setFundingAmount(e.target.value)}
                                className="w-full bg-[#0b0b0f] border border-white/5 rounded-xl py-3 px-4 text-white font-mono focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                            <div>
                              <label className="block text-gray-500 font-bold mb-1.5">Secure Transaction PIN</label>
                              <input 
                                type="password"
                                maxLength={4}
                                placeholder="••••"
                                value={adminPinCode}
                                onChange={(e) => setAdminPinCode(e.target.value)}
                                className="w-full bg-[#0b0b0f] border border-white/5 rounded-xl py-3 px-4 text-white font-mono text-center tracking-widest focus:border-violet-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-gray-500 font-bold mb-1.5">Audit Reason / Notes</label>
                              <input 
                                type="text"
                                placeholder="Provide justification for compliance audit logs"
                                value={fundingReason}
                                onChange={(e) => setFundingReason(e.target.value)}
                                className="w-full bg-[#0b0b0f] border border-white/5 rounded-xl py-3 px-4 text-white focus:border-violet-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={treasuryTransferMutation.isPending}
                            className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-2xl font-bold uppercase tracking-widest transition shadow-lg shadow-violet-600/10 font-sans"
                          >
                            {treasuryTransferMutation.isPending ? 'Processing Secure Transfer...' : 'Commit Double-Entry Transaction'}
                          </button>
                        </form>
                      </div>

                      {/* Transaction Audit & Double-Entry Ledger History */}
                      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Double-Entry Account Statements</h3>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider font-semibold font-mono">
                                <th className="p-4 pl-6">Timestamp</th>
                                <th className="p-4">Reference ID</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Counterparty</th>
                                <th className="p-4">Debits (-) / Credits (+)</th>
                                <th className="p-4">Running Balance</th>
                                <th className="p-4 pr-6 text-right font-semibold">Audit Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs font-mono">
                              {walletEntries && walletEntries.length > 0 ? (
                                [...walletEntries]
                                  .sort((a, b) => {
                                    const timeA = new Date(a.createdAt).getTime();
                                    const timeB = new Date(b.createdAt).getTime();
                                    if (timeA !== timeB) return timeA - timeB;
                                    return a.id.localeCompare(b.id);
                                  })
                                  .map((entry) => {
                                    // Locate the matching counterparty in global ledger logs
                                    const matchSide = globalEntries?.find(e => e.transactionId === entry.transactionId && e.id !== entry.id);
                                    
                                    const counterpartyName = (() => {
                                      if (!matchSide) return 'Founder Capital';
                                      const matchWallet = systemWallets?.find(w => w.id === matchSide.accountId);
                                      if (matchWallet) return matchWallet.name;
                                      const matchUser = accounts?.find(a => a.id === matchSide.accountId);
                                      return matchUser ? matchUser.username : `Account (${matchSide.accountId.substring(0, 8)})`;
                                    })();

                                    // Find audit reason from local audit logs matching reference ID
                                    const auditLogObj = auditLogs?.find(l => l.referenceId === entry.transactionId && l.walletId === entry.accountId);
                                    const reasonNotes = auditLogObj ? auditLogObj.reason : entry.category || 'System Bookkeeping';

                                    return (
                                      <tr key={entry.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="p-4 pl-6 text-gray-400">
                                          {new Date(entry.createdAt).toLocaleString('en-US')}
                                        </td>
                                        <td className="p-4 text-violet-400">
                                          TXN-{entry.transactionId.substring(0, 8).toUpperCase()}
                                        </td>
                                        <td className="p-4 text-white">
                                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 text-gray-400 border border-white/5">
                                            {entry.category || 'ALLOCATION'}
                                          </span>
                                        </td>
                                        <td className="p-4 text-gray-300 font-sans font-medium">
                                          {counterpartyName}
                                        </td>
                                        <td className={`p-4 font-bold ${
                                          entry.entryType === 'CREDIT' ? 'text-emerald-450' : 'text-rose-450'
                                        }`}>
                                          {entry.entryType === 'CREDIT' ? '+' : '-'}${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 text-white">
                                          ${entry.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 pr-6 text-right text-gray-500 font-sans italic text-[10px]">
                                          {reasonNotes}
                                        </td>
                                      </tr>
                                    );
                                  })
                              ) : (
                                <tr>
                                  <td colSpan={7} className="p-8 text-center text-gray-500 font-semibold italic">
                                    No double-entry logs recorded for this wallet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  );
                })()
              ) : (
                <div className="glass-panel p-12 text-center text-gray-500 font-semibold italic border border-white/5 rounded-3xl bg-white/[0.01] flex flex-col items-center justify-center space-y-4">
                  <Coins className="h-10 w-10 text-gray-600 animate-bounce" />
                  <div>
                    <p className="text-sm text-white font-bold not-italic">Select a Financial Account</p>
                    <p className="text-xs text-gray-500 mt-1">Click any system wallet from the left sidebar hierarchy to explore balances, entries, and audit logs.</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {activeTab === 'lifecycle' && (
        <div className="space-y-8 animate-fade-in font-sans">
          {/* Investment Executive Summary Grid */}
          {(() => {
            const activeOrders = investments ? investments.filter(i => i.status === 'ACTIVE') : [];
            const totalInvested = activeOrders.reduce((sum, o) => sum + o.principal, 0);
            
            const totalProfit = activeOrders.reduce((sum, o) => {
              const elapsedDays = Math.max(0, Math.floor((new Date().getTime() - new Date(o.investedAt || o.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
              const totalDays = o.maturityDate ? Math.max(1, Math.floor((new Date(o.maturityDate).getTime() - new Date(o.investedAt || o.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 90;
              const totalExpectedProfit = o.principal * (o.expectedReturn / 100) * (totalDays / 365);
              return sum + (totalExpectedProfit * Math.min(1, elapsedDays / totalDays));
            }, 0);

            const avgYield = totalInvested > 0 
              ? (activeOrders.reduce((sum, o) => sum + (o.principal * o.expectedReturn), 0) / totalInvested) 
              : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Total Invested Capital</span>
                  <p className="text-lg font-black text-white font-display mt-1">
                    ${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[8px] text-gray-500 mt-1 block">Active treasury deployed principal</span>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Total Investment Profit</span>
                  <p className="text-lg font-black text-emerald-400 font-display mt-1">
                    ${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[8px] text-gray-500 mt-1 block">Accrued unrealized gross yield</span>
                </div>
                <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#12121a]/85">
                  <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">Average Portfolio Yield</span>
                  <p className="text-lg font-black text-indigo-400 font-display mt-1">
                    {avgYield.toFixed(2)}% APY
                  </p>
                  <span className="text-[8px] text-gray-500 mt-1 block">Weighted performance across assets</span>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Place Investment Form & Request Injection Form */}
            <div className="lg:col-span-1 space-y-8">
              {/* Place New Investment Form */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Deploy Treasury Capital</h3>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newInvestPrincipal || parseFloat(newInvestPrincipal) <= 0) {
                      alert('Please enter a valid principal amount.');
                      return;
                    }
                    if (!newInvestExpected || isNaN(parseFloat(newInvestExpected)) || parseFloat(newInvestExpected) < 0) {
                      alert('Please enter a valid expected return yield.');
                      return;
                    }
                    placeInvestmentMutation.mutate({
                      assetType: newInvestAssetType,
                      principal: parseFloat(newInvestPrincipal),
                      expectedReturn: parseFloat(newInvestExpected),
                      notes: newInvestNotes || `Investment in ${newInvestAssetType}`,
                      riskRating: newInvestRiskRating
                    });
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">Asset Class Type</label>
                    <select 
                      value={newInvestAssetType}
                      onChange={(e) => setNewInvestAssetType(e.target.value)}
                      className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white font-bold outline-none focus:border-violet-500"
                    >
                      <option value="TREASURY_BILLS">Treasury Bills (T-Bills)</option>
                      <option value="CORPORATE_BONDS">Corporate Bonds AAA</option>
                      <option value="MONEY_MARKET_FUNDS">Money Market Funds (MMF)</option>
                      <option value="CASH_RESERVE">Cash Reserve Liquidity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">Principal Amount (USD)</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      value={newInvestPrincipal}
                      onChange={(e) => setNewInvestPrincipal(e.target.value)}
                      className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white outline-none focus:border-violet-500 font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-500 font-bold mb-1.5">Expected Yield Rate</label>
                      <div className="relative">
                        <input 
                          type="number"
                          step="0.01"
                          value={newInvestExpected}
                          onChange={(e) => setNewInvestExpected(e.target.value)}
                          className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white outline-none focus:border-violet-500 font-mono font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-[9px]">% APY</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-500 font-bold mb-1.5">Risk Profile Rating</label>
                      <select 
                        value={newInvestRiskRating}
                        onChange={(e) => setNewInvestRiskRating(e.target.value)}
                        className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white font-bold outline-none focus:border-violet-500"
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">Compliance Rationale & Notes</label>
                    <input 
                      type="text"
                      placeholder="Auditable portfolio notes..."
                      value={newInvestNotes}
                      onChange={(e) => setNewInvestNotes(e.target.value)}
                      className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white outline-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={placeInvestmentMutation.isPending}
                    className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition uppercase tracking-widest text-[10px] shadow-lg shadow-violet-600/10"
                  >
                    {placeInvestmentMutation.isPending ? 'Deploying Capital...' : 'Deploy Capital'}
                  </button>
                </form>
              </div>

              {/* Request Capital Injection Form */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Request Capital Injection</h3>
                </div>

                <form onSubmit={handleInjectionRequestSubmit} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">Source Clearing Account</label>
                    <select 
                      value={newInjectionSource}
                      onChange={(e) => setNewInjectionSource(e.target.value)}
                      className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white font-bold outline-none focus:border-amber-500"
                    >
                      <option value="e1b07221-50e5-4d76-bc34-31f41e57c600">Founder Capital Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">Target Destination Wallet</label>
                    <select 
                      value={newInjectionTarget}
                      onChange={(e) => setNewInjectionTarget(e.target.value)}
                      className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white font-bold outline-none focus:border-amber-500"
                    >
                      <option value="e1b07221-50e5-4d76-bc34-31f41e57c601">Owner Treasury Wallet</option>
                      <option value="e1b07221-50e5-4d76-bc34-31f41e57c603">Yield Reserve Wallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">Injection Amount (USD)</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      value={newInjectionAmount}
                      onChange={(e) => setNewInjectionAmount(e.target.value)}
                      className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 font-bold mb-1.5">Compliance Justification</label>
                    <input 
                      type="text"
                      placeholder="Provide reason for equity injection"
                      value={newInjectionReason}
                      onChange={(e) => setNewInjectionReason(e.target.value)}
                      className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={requestInjectionMutation.isPending}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl transition uppercase tracking-widest text-[10px] shadow-lg shadow-amber-600/10"
                  >
                    {requestInjectionMutation.isPending ? 'Requesting...' : 'Request Capital Injection'}
                  </button>
                </form>
              </div>
            </div>

            {/* Risk Controls & Active investments */}
            <div className="lg:col-span-2 space-y-8">
              {/* Exposure Limits Gauges */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Asset Concentration Exposure Limits</h3>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const total = investments ? investments.filter(i => i.status === 'ACTIVE').reduce((s, o) => s + o.principal, 0) : 0;
                    const getPct = (type: string) => {
                      if (!total) return 0;
                      const sum = investments ? investments.filter(i => i.status === 'ACTIVE' && i.assetType === type).reduce((s, o) => s + o.principal, 0) : 0;
                      return (sum / total) * 100;
                    };

                    return (
                      <>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">Treasury Bills (Limit: &le; 80%)</span>
                            <span className={`font-bold ${getPct('TREASURY_BILLS') > 80 ? 'text-rose-400' : 'text-emerald-400'}`}>{getPct('TREASURY_BILLS').toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${Math.min(getPct('TREASURY_BILLS'), 100)}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">Corporate Bonds AAA (Limit: &le; 30%)</span>
                            <span className={`font-bold ${getPct('CORPORATE_BONDS') > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>{getPct('CORPORATE_BONDS').toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${Math.min(getPct('CORPORATE_BONDS'), 100)}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">Money Market Funds (Limit: &le; 25%)</span>
                            <span className={`font-bold ${getPct('MONEY_MARKET_FUNDS') > 25 ? 'text-rose-400' : 'text-emerald-400'}`}>{getPct('MONEY_MARKET_FUNDS').toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-cyan-500 h-full transition-all" style={{ width: `${Math.min(getPct('MONEY_MARKET_FUNDS'), 100)}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-400">Cash Reserve Buffer (Limit: &ge; 5%)</span>
                            <span className={`font-bold ${getPct('CASH_RESERVE') < 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{getPct('CASH_RESERVE').toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full transition-all" style={{ width: `${Math.min(getPct('CASH_RESERVE'), 100)}%` }} />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Active Portfolio Investments */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Active Portfolio Allocations</h3>
                
                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 font-black text-[9px] uppercase">
                        <th className="pb-3">Investment ID / Asset</th>
                        <th className="pb-3 text-right">Principal</th>
                        <th className="pb-3 text-right">Current Value</th>
                        <th className="pb-3 text-right">Profit</th>
                        <th className="pb-3 text-right">Expected</th>
                        <th className="pb-3 text-right">Days Left</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {investments && investments.filter(i => i.status === 'ACTIVE').length > 0 ? (
                        investments.filter(i => i.status === 'ACTIVE').map((ord: any) => {
                          const elapsedDays = Math.max(0, Math.floor((new Date().getTime() - new Date(ord.investedAt || ord.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
                          const totalDays = ord.maturityDate ? Math.max(1, Math.floor((new Date(ord.maturityDate).getTime() - new Date(ord.investedAt || ord.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 90;
                          const daysRemaining = Math.max(0, totalDays - elapsedDays);
                          const totalExpectedProfit = ord.principal * (ord.expectedReturn / 100) * (totalDays / 365);
                          const profitGenerated = totalExpectedProfit * Math.min(1, elapsedDays / totalDays);
                          const currentValue = ord.principal + profitGenerated;

                          return (
                            <tr key={ord.id} className="hover:bg-white/[0.01]">
                              <td className="py-3 font-semibold text-white">
                                <span className="text-[9px] text-gray-500 font-mono block truncate max-w-[120px]" title={ord.id}>{ord.id}</span>
                                {ord.assetType}
                                <span className="block text-[8px] text-gray-500 font-normal">{ord.notes}</span>
                              </td>
                              <td className="py-3 text-right font-bold text-white">${ord.principal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 text-right font-bold text-white">${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-3 text-right font-bold text-emerald-400">+${profitGenerated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-3 text-right font-bold text-emerald-400">{ord.expectedReturn}% APY</td>
                              <td className="py-3 text-right text-gray-400">{daysRemaining} Days</td>
                              <td className="py-3 text-center">
                                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold">ACTIVE</span>
                              </td>
                              <td className="py-3 text-right pr-2 space-x-1.5 whitespace-nowrap">
                                <button 
                                  onClick={() => setPreviewOrderId(ord.id)}
                                  className="px-2 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded font-bold text-[9px] uppercase tracking-wider"
                                >
                                  Preview
                                </button>
                                <button 
                                  onClick={() => matureInvestmentMutation.mutate(ord.id)}
                                  disabled={matureInvestmentMutation.isPending}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[9px] uppercase tracking-wider"
                                >
                                  Mature
                                </button>
                                <button 
                                  onClick={() => failInvestmentMutation.mutate(ord.id)}
                                  disabled={failInvestmentMutation.isPending}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[9px] uppercase tracking-wider"
                                >
                                  Fail
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-500">
                            No active investments in portfolio.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Maturity Allocation Preview panel */}
              {previewOrderId && (() => {
                const order = investments?.find(i => i.id === previewOrderId);
                if (!order) return null;
                const elapsedDays = Math.max(0, Math.floor((new Date().getTime() - new Date(order.investedAt || order.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
                const totalDays = order.maturityDate ? Math.max(1, Math.floor((new Date(order.maturityDate).getTime() - new Date(order.investedAt || order.createdAt).getTime()) / (1000 * 60 * 60 * 24))) : 90;
                const totalExpectedProfit = order.principal * (order.expectedReturn / 100) * (totalDays / 365);
                const profitGenerated = totalExpectedProfit * Math.min(1, elapsedDays / totalDays);
                const yieldReserveAlloc = profitGenerated * 0.8;
                const platformRevenueAlloc = profitGenerated * 0.2;

                return (
                  <div className="glass-panel p-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center pb-2 border-b border-amber-500/10">
                      <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="h-4.5 w-4.5 text-amber-500" />
                        Maturity Allocation Preview
                      </h4>
                      <button onClick={() => setPreviewOrderId(null)} className="text-amber-400 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-300">
                      Pre-maturation allocation check for investment: <span className="font-mono text-white">{order.id}</span>
                    </p>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Profit Generated:</span>
                        <span className="text-white font-bold">${profitGenerated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Yield Reserve Allocation (80%):</span>
                        <span className="text-emerald-400 font-bold">${yieldReserveAlloc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Platform Revenue Allocation (20%):</span>
                        <span className="text-violet-400 font-bold">${platformRevenueAlloc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => {
                          matureInvestmentMutation.mutate(order.id);
                          setPreviewOrderId(null);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[9px] uppercase tracking-wider"
                      >
                        Approve Maturation
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Pending Capital Injections approvals */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Capital Injections Queue (Governance approvals)</h3>
                
                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500 font-black text-[9px] uppercase">
                        <th className="pb-3">Source</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3 text-right">Amount</th>
                        <th className="pb-3">Approver</th>
                        <th className="pb-3 text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {injections && injections.length > 0 ? (
                        injections.map((inj: any) => (
                          <tr key={inj.id} className="hover:bg-white/[0.01]">
                            <td className="py-3 font-semibold text-white">Owner Treasury</td>
                            <td className="py-3 text-gray-400 truncate max-w-[120px]">{inj.reason}</td>
                            <td className="py-3 text-right font-bold text-white">${inj.amount.toLocaleString()}</td>
                            <td className="py-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                inj.approvedBy === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {inj.approvedBy}
                              </span>
                            </td>
                            <td className="py-3 text-right pr-2">
                              {inj.approvedBy === 'PENDING_APPROVAL' ? (
                                <button 
                                  onClick={() => setSelectedInjectionId(inj.id)}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold text-[9px] uppercase tracking-wider"
                                >
                                  Approve
                                </button>
                              ) : '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No capital injections registered or pending.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {activeTab === 'pnl' && (
        <div className="space-y-8 animate-fade-in font-sans">
          {/* Stress-Testing Gauges */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Yield Sustainability Stress-Testing Simulator</h3>
              </div>
              <span className="text-[9px] font-mono text-gray-500">Assumes AUM: ${(adminStats?.totalAum || 150000.00).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              {stressTests && stressTests.map((test: any, idx: number) => {
                const color = test.portfolioYield >= 5.5 ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : test.portfolioYield >= 3 ? 'border-indigo-500/20 text-indigo-400 bg-indigo-500/5' : test.portfolioYield >= 0 ? 'border-amber-500/20 text-amber-400 bg-amber-500/5' : 'border-rose-500/20 text-rose-400 bg-rose-500/5';
                
                return (
                  <div key={idx} className={`p-4 rounded-2xl border ${color} space-y-3`}>
                    <p className="font-bold text-[10px] uppercase tracking-wide">{test.scenarioName}</p>
                    <div className="space-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Obligation:</span>
                        <span className="text-white">${test.userObligations.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Yield Return:</span>
                        <span className="text-white">${test.expectedReturns.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Annual Deficit:</span>
                        <span className="text-rose-400">${test.expectedDeficit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-white/5">
                        <span className="text-gray-500">Survival Runway:</span>
                        <span>{test.survivalRunway >= 99.9 ? 'Infinite (Surplus)' : `${test.survivalRunway.toFixed(1)} Months`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Yield Economics & Historical trend container */}
            <div className="lg:col-span-1 space-y-6">
              {/* Yield Economics Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Percent className="h-4.5 w-4.5 text-emerald-400" />
                  Yield Economics
                </h3>
                {(() => {
                  const generated = pnlLogs?.reduce((sum: number, log: any) => sum + (log.grossYield || 0), 0) || 0;
                  const paid = pnlLogs?.reduce((sum: number, log: any) => sum + (log.userInterestPaid || 0), 0) || 0;
                  const spread = Math.max(0, generated - paid);
                  const netProfit = pnlLogs?.reduce((sum: number, log: any) => sum + (log.netProfit || 0), 0) || 0;

                  return (
                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Interest Generated:</span>
                        <span className="text-white font-bold">${generated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Interest Paid To Users:</span>
                        <span className="text-rose-400 font-bold">-${paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Platform Spread Retained:</span>
                        <span className="text-emerald-400 font-bold">${spread.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center mt-2.5">
                        <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Net Treasury Profit</span>
                        <span className={`font-black text-sm ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                          ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* P&L Spline Chart */}
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Historical Profitability trend</h3>
                <div className="h-48 flex items-end justify-between px-2 pt-6 pb-2 border-b border-l border-white/5 relative font-mono text-[9px]">
                  <div className="absolute top-2 left-2 text-emerald-400 font-bold">Inflows</div>
                  <div className="absolute bottom-2 right-2 text-rose-400 font-bold">Losses</div>
                  
                  {pnlLogs && pnlLogs.map((log: any) => {
                    const maxVal = 80000;
                    const grossHeight = Math.min((log.grossYield / maxVal) * 100, 100);
                    const lossHeight = Math.min((log.investmentLosses / maxVal) * 100, 100);
                    
                    return (
                      <div key={log.id} className="flex flex-col items-center gap-1 w-1/3">
                        <div className="flex gap-1 w-full justify-center items-end h-32">
                          <div className="w-3 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all" style={{ height: `${grossHeight}%` }} title={`Gross Yield: $${log.grossYield}`} />
                          {log.investmentLosses > 0 && (
                            <div className="w-3 bg-rose-500/80 hover:bg-rose-400 rounded-t transition-all" style={{ height: `${lossHeight}%` }} title={`Losses: $${log.investmentLosses}`} />
                          )}
                        </div>
                        <span className="text-gray-500 text-[8px]">{log.period}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* P&L Statement Grid */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">Profit & Loss (P&L) Ledger Accounts</h3>
              
              <div className="overflow-x-auto text-xs font-mono">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-550 font-black text-[9px] uppercase">
                      <th className="pb-3">Period</th>
                      <th className="pb-3 text-right">Gross Yield</th>
                      <th className="pb-3 text-right">User Interest</th>
                      <th className="pb-3 text-right">Reserve Contrib</th>
                      <th className="pb-3 text-right">Platform Revenue</th>
                      <th className="pb-3 text-right">Losses</th>
                      <th className="pb-3 text-right pr-2">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pnlLogs && pnlLogs.length > 0 ? (
                      pnlLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-bold text-white">{log.period}</td>
                          <td className="py-3 text-right text-white">${log.grossYield.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 text-right text-gray-400">-${log.userInterestPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 text-right text-indigo-400">${log.reserveContribution.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 text-right text-amber-400">${log.platformRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 text-right text-rose-400">-${log.investmentLosses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className={`py-3 text-right pr-2 font-bold ${log.netProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            ${log.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          No historical P&L records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capital Injection approval credentials modal */}
      {selectedInjectionId && (() => {
        const selectedInj = injections?.find((i: any) => i.id === selectedInjectionId);
        return (
          <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0c0c10]/95 max-w-sm w-full space-y-6">
              <div>
                <h3 className="font-display font-black text-base text-white uppercase tracking-tight">Authorize Emergency Injection</h3>
                <p className="text-xs text-gray-400 mt-1">
                  This transaction will inject ${selectedInj ? selectedInj.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'} from Founder Capital Account into Owner Treasury Wallet for justification: "{selectedInj?.reason || 'N/A'}".
                </p>
              </div>

              {approveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
                  {approveSuccess}
                </div>
              )}
              {approveError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                  {approveError}
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!approvePin || approvePin.length !== 4) {
                    alert('Please enter a 4-digit Transaction PIN.');
                    return;
                  }
                  approveInjectionMutation.mutate({
                    injectionId: selectedInjectionId,
                    adminPin: approvePin,
                    mfaCode: ''
                  });
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-gray-500 font-bold mb-1.5">Transaction PIN</label>
                  <input 
                    type="password"
                    maxLength={4}
                    placeholder="••••"
                    value={approvePin}
                    onChange={(e) => setApprovePin(e.target.value)}
                    className="w-full bg-[#0b0b0f] border border-white/5 rounded-2xl py-3 px-4 text-white text-center font-mono font-bold tracking-widest outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedInjectionId(null);
                      setApprovePin('');
                      setApproveMfa('');
                      setApproveError('');
                    }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase text-[10px] tracking-wider transition"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={approveInjectionMutation.isPending}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-wider transition shadow-lg shadow-amber-600/10"
                  >
                    {approveInjectionMutation.isPending ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {activeTab === 'registry' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Internal Wallets Management & Reporting Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-violet-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Asset Class Allocation</h3>
                </div>
                <span className="text-[10px] font-mono text-gray-500">Maturity Matching Active</span>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* SVG Donut Chart */}
                <div className="relative w-40 h-40 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1f1f2e" strokeWidth="12" />
                    {/* T-Bills (70%) - circumference = 251.3, length = 175.9 */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="12" 
                      strokeDasharray="251.3" strokeDashoffset="75.4" />
                    {/* Corporate Bonds (15%) - length = 37.7 */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="12" 
                      strokeDasharray="37.7 251.3" strokeDashoffset="-175.9" />
                    {/* Money Market (10%) - length = 25.1 */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#06b6d4" strokeWidth="12" 
                      strokeDasharray="25.1 251.3" strokeDashoffset="-213.6" />
                    {/* Cash Reserve (5%) - length = 12.6 */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="12" 
                      strokeDasharray="12.6 251.3" strokeDashoffset="-238.7" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Gross APY</span>
                    <span className="text-lg font-black text-white">5.50%</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-xs">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="w-3 h-3 rounded bg-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-white">Treasury Bills (70%)</p>
                      <p className="text-[10px] text-gray-500 font-mono">${(adminStats.totalAum * 0.70).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="w-3 h-3 rounded bg-purple-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-white">Corporate Bonds (15%)</p>
                      <p className="text-[10px] text-gray-500 font-mono">${(adminStats.totalAum * 0.15).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="w-3 h-3 rounded bg-cyan-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-white">Money Market (10%)</p>
                      <p className="text-[10px] text-gray-500 font-mono">${(adminStats.totalAum * 0.10).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.01] border border-white/5">
                    <span className="w-3 h-3 rounded bg-emerald-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-white">Cash Reserve (5%)</p>
                      <p className="text-[10px] text-gray-500 font-mono">${(adminStats.totalAum * 0.05).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE 10: REVENUE INTELLIGENCE */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-fuchsia-400" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Revenue Spread Formula</h3>
                  </div>
                </div>
                
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-400">Gross Portfolio APY</span>
                    <span className="text-white font-bold">5.50%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-mono text-rose-400">
                    <span>- User Interest Paid</span>
                    <span className="font-bold">-{adminStats.apyRate.toFixed(2)}%</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center text-xs font-mono text-fuchsia-400 font-bold">
                    <span>= Platform Spread</span>
                    <span>{(5.50 - adminStats.apyRate).toFixed(2)}% APY</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleApySubmit} className="space-y-3.5 mt-6">
                <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest pl-0.5">Set User APY Target</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    step="0.05"
                    min="0.1"
                    max="5.4"
                    placeholder="User APY (e.g. 3.25)"
                    value={newApy}
                    onChange={(e) => setNewApy(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-center text-xs focus:outline-none focus:border-violet-500/50 transition"
                    required
                  />
                  <button
                    type="submit"
                    disabled={updateApyMutation.isPending}
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
                  >
                    Set APY
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* MODULE 4: YIELD DISTRIBUTION ENGINE & ACCRUALS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Yield Distribution Engine</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Daily Compounding
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-500">Gross Yield (5.5%):</span>
                    <span className="text-white">${(adminStats.totalAum * 0.055 / 365).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-gray-500">Paid to Users ({adminStats.apyRate}%):</span>
                    <span className="text-white">${(adminStats.totalAum * (adminStats.apyRate / 100) / 365).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between font-mono font-bold text-fuchsia-400">
                    <span>Net Platform Spread:</span>
                    <span>${(adminStats.totalAum * (5.50 - adminStats.apyRate) / 100 / 365).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/day</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Engine Switch:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePauseMutation.mutate(!adminStats.yieldEnginePaused)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        adminStats.yieldEnginePaused 
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {adminStats.yieldEnginePaused ? 'Resume Engine' : 'Pause Engine'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Trigger daily midnight yield vault interest accrual cycle now?')) {
                          triggerYieldMutation.mutate();
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 text-xs font-semibold transition-all"
                      title="Accrue Yield Vault Interest"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Trigger Accrual
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Trigger daily 4.5% APY savings interest accrual on all neobank balances now?')) {
                          triggerApyInterestMutation.mutate();
                        }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400 text-xs font-semibold transition-all"
                      title="Accrue 4.5% APY Savings Interest on Spendable Balances"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Trigger APY Savings
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* MODULE 6: LIQUIDITY & RISK MANAGEMENT */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Liquidity & Risk parameters</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Reserve Ratio</span>
                  <span className="text-white font-bold block mt-1">5.0% Fixed</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Stress Test Index</span>
                  <span className="text-emerald-400 font-bold block mt-1">98.4% SECURE</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">LCR Ratio</span>
                  <span className="text-white font-bold block mt-1">320% Target</span>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider block">Risk Index</span>
                  <span className="text-emerald-400 font-bold block mt-1">Low (US Treasury)</span>
                </div>
              </div>
            </div>

            {/* MODULE 5: LEDGER & FUND FLOW SCHEMATIC */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-6">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-cyan-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Treasury Fund Flow</h3>
              </div>

              <div className="relative p-4 rounded-xl bg-black/40 border border-white/5 space-y-4 text-[10px]">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded font-bold">1. Customer Deposits</span>
                  <span className="text-gray-600">→</span>
                  <span className="px-2 py-1 bg-violet-500/10 text-violet-400 rounded font-bold">2. Vault Pool</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded font-bold">4. User Yield (3.25%)</span>
                  <span className="text-gray-600">←</span>
                  <span className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded font-bold">3. Spread Revenue</span>
                </div>
                <p className="text-[9px] text-gray-500 text-center font-mono">Real-time daily compounding cycle active.</p>
              </div>
            </div>

          </div>

          {/* MODULE 3: TREASURY OPERATIONS & ORDERS */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/60 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Treasury Allocation Orders</h3>
              </div>
              <span className="text-[10px] font-bold text-gray-500 font-mono">Rebalancing status: Synced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    <th className="py-3 pl-2">Order ID</th>
                    <th className="py-3">Asset Type</th>
                    <th className="py-3">Allocation Amt</th>
                    <th className="py-3">Expected Yield</th>
                    <th className="py-3">Maturity Date</th>
                    <th className="py-3 text-right pr-2">Execution Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs font-mono">
                  <tr className="hover:bg-white/[0.01]">
                    <td className="py-4 pl-2 text-gray-400">TX-TBT-8271</td>
                    <td className="py-4 text-white font-sans font-medium">US Treasury Bills (4-Week)</td>
                    <td className="py-4 font-bold text-indigo-400">${(adminStats.totalAum * 0.70 * 0.4).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="py-4 text-emerald-400">5.38% APY</td>
                    <td className="py-4 text-gray-500">Aug 14, 2026</td>
                    <td className="py-4 text-right pr-2"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold">COMPLETED</span></td>
                  </tr>
                  <tr className="hover:bg-white/[0.01]">
                    <td className="py-4 pl-2 text-gray-400">TX-CBP-1934</td>
                    <td className="py-4 text-white font-sans font-medium">Corporate AAA Bonds Pool</td>
                    <td className="py-4 font-bold text-purple-400">${(adminStats.totalAum * 0.15).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="py-4 text-emerald-400">6.12% APY</td>
                    <td className="py-4 text-gray-500">Dec 20, 2026</td>
                    <td className="py-4 text-right pr-2"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold">ACTIVE</span></td>
                  </tr>
                  <tr className="hover:bg-white/[0.01]">
                    <td className="py-4 pl-2 text-gray-400">TX-MMF-0492</td>
                    <td className="py-4 text-white font-sans font-medium">Fidelity Cash Reserves MMF</td>
                    <td className="py-4 font-bold text-cyan-400">${(adminStats.totalAum * 0.10).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                    <td className="py-4 text-emerald-400">5.05% APY</td>
                    <td className="py-4 text-gray-500">Daily Liquid</td>
                    <td className="py-4 text-right pr-2"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold">ACTIVE</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Balance Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 flex flex-col justify-between hover:border-violet-500/20 transition duration-300 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-fuchsia-600/5 opacity-50 pointer-events-none" />
              <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-wider">Admin Ledger Wallet</span>
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 font-mono">Current Spendable Balance</span>
                  <p className="text-3xl font-black text-white font-display">
                    ${adminBalance ? adminBalance.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">Idempotent Ledger</span>
                  <button 
                    type="button"
                    onClick={() => refetchAdminBalance()}
                    className="text-[10px] text-violet-400 hover:text-white font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Transfer Form Card */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-violet-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Send Funds & Ledger Transfers</h2>
              </div>
              <p className="text-xs text-gray-400">
                Instantly transfer spendable cash pools to any user account via phone number, username, or account ID.
              </p>

              {transferSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{transferSuccess}</span>
                </div>
              )}

              {transferError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{transferError}</span>
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setTransferError('');
                  setTransferSuccess('');
                  const amtVal = parseFloat(transferAmount);
                  if (isNaN(amtVal) || amtVal <= 0) {
                    setTransferError('Please enter a valid transfer amount.');
                    return;
                  }
                  if (transferPin.length !== 4) {
                    setTransferError('Please enter your 4-digit Transaction PIN.');
                    return;
                  }
                  adminTransferMutation.mutate({
                    target: transferTarget.trim(),
                    amt: amtVal,
                    pin: transferPin
                  });
                }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
              >
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recipient User / Phone</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={transferTarget}
                      onChange={(e) => setTransferTarget(e.target.value)}
                      placeholder="Username, Phone or UUID"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50 transition placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50 transition font-mono placeholder:text-gray-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Transaction PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={transferPin}
                    onChange={(e) => setTransferPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50 transition text-center font-mono tracking-widest placeholder:text-gray-600"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={adminTransferMutation.isPending}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md shadow-violet-600/10 flex items-center gap-2"
                  >
                    {adminTransferMutation.isPending ? 'Executing Transfer...' : 'Send Money'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* User Accounts Registry Section */}
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
            Ledger Accounts Registrations
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center">
              <p className="font-semibold">Access Denied or Connection Failure</p>
              <p className="text-xs text-rose-500/80 mt-1">You must be logged in as an administrator to access this console.</p>
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="glass-panel rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider font-semibold font-mono">
                      <th className="p-4 pl-6">Username / Email</th>
                      <th className="p-4">Account ID</th>
                      <th className="p-4">KYC Status</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4">MFA Setup</th>
                      <th className="p-4">Vault Active</th>
                      <th className="p-4">Vault Balance</th>
                      <th className="p-4">Lifetime Yield</th>
                      <th className="p-4 pr-6 text-right font-semibold">Decisive Audit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {accounts.map((acc) => {
                      const vaultAcc = vaultAccounts?.find(v => v.userId === acc.id);
                      const isVaultActive = vaultAcc ? (vaultAcc.status === 'ACTIVE' || vaultAcc.status === 'PAUSED' || vaultAcc.status === 'FROZEN') : false;
                      const vaultBalance = vaultAcc ? vaultAcc.investedBalance : 0;
                      const lifetimeYield = vaultAcc ? vaultAcc.totalYieldEarned : 0;
                      const vaultStatus = vaultAcc ? vaultAcc.status : 'INACTIVE';

                      return (
                        <tr key={acc.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 pl-6">
                            <p className="font-semibold text-white">{acc.username}</p>
                            <p className="text-xs text-gray-400">{acc.email}</p>
                          </td>
                          <td className="p-4 font-mono text-xs text-gray-400">{acc.id}</td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                              acc.kycStatus === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : acc.kycStatus === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {acc.kycStatus || 'NOT_STARTED'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${getStatusBadge(acc.status)}`}>
                              {acc.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                              acc.mfaEnabled
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {acc.mfaEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${
                              isVaultActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-white/5 text-gray-500 border border-white/10'
                            }`}>
                              {isVaultActive ? vaultStatus : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-bold text-white">
                            ${vaultBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 font-mono font-bold text-emerald-400">
                            ${lifetimeYield.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 pr-6">
                            <div className="flex flex-col gap-2 items-end">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setInspectAccountId(acc.id);
                                    setInspectUsername(acc.username);
                                  }}
                                  className="px-2 py-1 rounded-lg border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400 text-[10px] font-bold transition-all"
                                >
                                  View History
                                </button>
                                {acc.kycStatus && acc.kycDocumentBase64 && (
                                  <button
                                    onClick={() => setSelectedKycDoc({
                                      type: acc.kycDocumentType || 'ID_CARD',
                                      data: acc.kycDocumentBase64 || '',
                                      number: acc.kycDocumentNumber || 'N/A',
                                      selfie: acc.kycSelfieBase64 || '',
                                      user: acc.username,
                                      faceMatchScore: acc.faceMatchScore,
                                      ocrConfidence: acc.ocrConfidence,
                                      riskScore: acc.riskScore
                                    })}
                                    className="px-2 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 text-[10px] font-bold transition"
                                  >
                                    Review KYC
                                  </button>
                                )}

                                {acc.mfaEnabled && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Reset MFA configuration for ${acc.username}?`)) {
                                        resetMfaMutation.mutate(acc.id);
                                      }
                                    }}
                                    disabled={resetMfaMutation.isPending}
                                    className="px-2 py-1 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-bold transition"
                                  >
                                    Reset 2FA
                                  </button>
                                )}

                                {acc.status === 'ACTIVE' ? (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to freeze ledger withdrawals for ${acc.username}?`)) {
                                        freezeMutation.mutate(acc.id);
                                      }
                                    }}
                                    disabled={freezeMutation.isPending}
                                    className="px-2 py-1 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-[10px] font-bold transition"
                                  >
                                    Freeze
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Unfreeze active transactions access for ${acc.username}?`)) {
                                        unfreezeMutation.mutate(acc.id);
                                      }
                                    }}
                                    disabled={unfreezeMutation.isPending}
                                    className="px-2 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-bold transition"
                                  >
                                    Unfreeze
                                  </button>
                                )}
                              </div>

                              {isVaultActive && (
                                <div className="flex gap-2 justify-end">
                                  {vaultStatus !== 'FROZEN' ? (
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Enter reason for freezing vault:');
                                        if (reason) {
                                          updateVaultStatusMutation.mutate({ accountId: acc.id, status: 'FROZEN', reason });
                                        }
                                      }}
                                      disabled={updateVaultStatusMutation.isPending}
                                      className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-450 text-[10px] font-bold"
                                    >
                                      Freeze Vault
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Enter reason for unfreezing vault:');
                                        if (reason) {
                                          updateVaultStatusMutation.mutate({ accountId: acc.id, status: 'ACTIVE', reason });
                                        }
                                      }}
                                      disabled={updateVaultStatusMutation.isPending}
                                      className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold"
                                    >
                                      Unfreeze Vault
                                    </button>
                                  )}

                                  {vaultStatus === 'ACTIVE' && (
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Enter reason for pausing vault interest accrual:');
                                        if (reason) {
                                          updateVaultStatusMutation.mutate({ accountId: acc.id, status: 'PAUSED', reason });
                                        }
                                      }}
                                      disabled={updateVaultStatusMutation.isPending}
                                      className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[10px] font-bold"
                                    >
                                      Pause APY
                                    </button>
                                  )}

                                  {vaultStatus === 'PAUSED' && (
                                    <button
                                      onClick={() => {
                                        const reason = prompt('Enter reason for resuming vault interest accrual:');
                                        if (reason) {
                                          updateVaultStatusMutation.mutate({ accountId: acc.id, status: 'ACTIVE', reason });
                                        }
                                      }}
                                      disabled={updateVaultStatusMutation.isPending}
                                      className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold"
                                    >
                                      Resume APY
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 font-semibold italic border border-white/5 rounded-3xl bg-white/[0.01]">
              No active customer accounts registered.
            </div>
          )}



        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-8 animate-fade-in font-sans">
          
          {/* Summary Cards Grid */}
          {(() => {
            const today = new Date().toLocaleDateString('sv').substring(0, 10);
            
            const todayTransactions = treasuryHistory?.filter(t => t.createdAt && t.createdAt.substring(0, 10) === today) || [];
            
            const totalMoneyMoved = todayTransactions.reduce((sum, t) => sum + (t.debitAmount || 0), 0);
            const investmentFunding = todayTransactions
              .filter(t => t.operationType === 'Investment Created')
              .reduce((sum, t) => sum + (t.debitAmount || 0), 0);
            const yieldDistributed = todayTransactions
              .filter(t => t.operationType === 'Yield Distribution')
              .reduce((sum, t) => sum + (t.debitAmount || 0), 0);
            const cashbackFunding = todayTransactions
              .filter(t => t.operationType === 'Cashback Funding')
              .reduce((sum, t) => sum + (t.debitAmount || 0), 0);
              
            const failedOps = treasuryHistory?.filter(t => t.status === 'FAILED') || [];
            const pendingOps = treasuryHistory?.filter(t => t.status === 'PENDING' || t.status === 'PAUSED') || [];

            return (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-[#12121a]/60 space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Today's Operations</span>
                    <Activity className="h-4.5 w-4.5 text-violet-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black text-white">{todayTransactions.length} Txns</div>
                    <div className="text-[10px] text-gray-400 font-mono">Vol: ${totalMoneyMoved.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-[#12121a]/60 space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Yield & Capital today</span>
                    <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black text-white">${yieldDistributed.toLocaleString('en-US', { maximumFractionDigits: 2 })} Paid</div>
                    <div className="text-[10px] text-gray-400 font-mono">Invested: ${investmentFunding.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-[#12121a]/60 space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Cashback Funding</span>
                    <Gift className="h-4.5 w-4.5 text-fuchsia-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black text-white">${cashbackFunding.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                    <div className="text-[10px] text-gray-400 font-mono">From Owner Treasury Wallet</div>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-3xl border border-white/5 bg-[#12121a]/60 space-y-2">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Unresolved Ops</span>
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xl font-black text-rose-400">{failedOps.length} Failed</div>
                    <div className="text-[10px] text-gray-400 font-mono">{pendingOps.length} Pending / Paused</div>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* Filters Console */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/80 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider border-b border-white/5 pb-3">
              <SlidersHorizontal className="h-4.5 w-4.5 text-violet-400" />
              <span>Filter Treasury History</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => { setFilterStartDate(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => { setFilterEndDate(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">System Wallet</label>
                <select
                  value={filterWallet}
                  onChange={(e) => { setFilterWallet(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500 text-xs font-sans"
                >
                  <option value="">All Wallets</option>
                  <option value="Founder Capital">Founder Capital Account</option>
                  <option value="Owner Treasury">Owner Treasury Wallet</option>
                  <option value="Investment Portfolio">Treasury Investment Portfolio</option>
                  <option value="Yield Reserve">Yield Reserve Wallet</option>
                  <option value="Platform Revenue">Platform Revenue Wallet</option>
                  <option value="Settlement Wallet">Settlement Wallet</option>
                  <option value="Cashback Wallet">Cashback Wallet</option>
                  <option value="Operations Wallet">Operations Wallet</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">Operation Type</label>
                <select
                  value={filterOpType}
                  onChange={(e) => { setFilterOpType(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500 text-xs font-sans"
                >
                  <option value="">All Types</option>
                  <option value="Capital Injection">Capital Injection</option>
                  <option value="Treasury Funding">Treasury Funding</option>
                  <option value="Investment Created">Investment Created</option>
                  <option value="Investment Matured">Investment Matured</option>
                  <option value="Profit Allocation">Profit Allocation</option>
                  <option value="Yield Distribution">Yield Distribution</option>
                  <option value="Cashback Funding">Cashback Funding</option>
                  <option value="Cashback Distribution">Cashback Distribution</option>
                  <option value="Reserve Transfer">Reserve Transfer</option>
                  <option value="Settlement Transfer">Settlement Transfer</option>
                  <option value="Treasury Adjustment">Treasury Adjustment</option>
                  <option value="Ledger Repair">Ledger Repair</option>
                  <option value="Manual Admin Transfer">Manual Admin Transfer</option>
                  <option value="System Correction">System Correction</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500 text-xs font-sans"
                >
                  <option value="">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAUSED">Paused</option>
                  <option value="REVERSED">Reversed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">Min Amount ($)</label>
                <input
                  type="number"
                  placeholder="Min"
                  value={filterMinAmount}
                  onChange={(e) => { setFilterMinAmount(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">Max Amount ($)</label>
                <input
                  type="number"
                  placeholder="Max"
                  value={filterMaxAmount}
                  onChange={(e) => { setFilterMaxAmount(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-500 uppercase font-black">Search Transaction ID</label>
                <input
                  type="text"
                  placeholder="Search UUID..."
                  value={searchTxId}
                  onChange={(e) => { setSearchTxId(e.target.value); setHistoryPage(1); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-violet-500"
                />
              </div>

            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setFilterWallet('');
                  setFilterOpType('');
                  setFilterStatus('');
                  setFilterCategory('');
                  setFilterMinAmount('');
                  setFilterMaxAmount('');
                  setSearchTxId('');
                  setHistoryPage(1);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all active:scale-95"
              >
                Reset Filters
              </button>
            </div>

          </div>

          {/* Activity Log Table */}
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 bg-[#12121a]/85">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-black tracking-wider uppercase font-mono">
                    <th className="p-4 pl-6">Timestamp</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Operation</th>
                    <th className="p-4">Source Wallet</th>
                    <th className="p-4">Destination Wallet</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Triggered By</th>
                    <th className="p-4 pr-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                  {(() => {
                    if (!treasuryHistory) {
                      return (
                        <tr>
                          <td colSpan={9} className="p-12 text-center text-gray-500 italic">
                            Loading activity history...
                          </td>
                        </tr>
                      );
                    }

                    const filtered = treasuryHistory.filter(item => {
                      if (filterStartDate && item.createdAt && item.createdAt.substring(0, 10) < filterStartDate) return false;
                      if (filterEndDate && item.createdAt && item.createdAt.substring(0, 10) > filterEndDate) return false;
                      
                      if (filterWallet) {
                        const inSource = item.sourceWallet && item.sourceWallet.includes(filterWallet);
                        const inDest = item.destinationWallet && item.destinationWallet.includes(filterWallet);
                        if (!inSource && !inDest) return false;
                      }

                      if (filterOpType && item.operationType !== filterOpType) return false;
                      if (filterStatus && item.status !== filterStatus) return false;
                      
                      const minAmt = parseFloat(filterMinAmount);
                      if (!isNaN(minAmt) && (item.debitAmount || 0) < minAmt) return false;

                      const maxAmt = parseFloat(filterMaxAmount);
                      if (!isNaN(maxAmt) && (item.debitAmount || 0) > maxAmt) return false;

                      if (searchTxId && item.transactionId && !item.transactionId.toLowerCase().includes(searchTxId.toLowerCase())) return false;

                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="p-12 text-center text-gray-500 italic">
                            No treasury operations match the specified filters.
                          </td>
                        </tr>
                      );
                    }

                    const totalItems = filtered.length;
                    const totalPages = Math.ceil(totalItems / historyItemsPerPage);
                    const currentHistoryPage = Math.min(historyPage, totalPages || 1);
                    const startIndex = (currentHistoryPage - 1) * historyItemsPerPage;
                    const paginated = filtered.slice(startIndex, startIndex + historyItemsPerPage);

                    return (
                      <>
                        {paginated.map((tx) => {
                          const statusColor = (() => {
                            if (tx.status === 'COMPLETED') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                            if (tx.status === 'FAILED') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                            if (tx.status === 'PENDING' || tx.status === 'PAUSED') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                            return 'text-gray-400 bg-white/5 border-white/10';
                          })();

                          return (
                            <tr key={tx.transactionId} className="hover:bg-white/[0.01] transition-colors">
                              <td className="p-4 pl-6 text-gray-400 font-sans">
                                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}
                              </td>
                              <td className="p-4 text-violet-400">
                                TXN-{tx.transactionId.substring(0, 8).toUpperCase()}
                              </td>
                              <td className="p-4 font-sans font-black text-[10px] text-white uppercase tracking-wider">
                                {tx.operationType}
                              </td>
                              <td className="p-4 font-sans text-gray-400">
                                {tx.sourceWallet || 'N/A'}
                              </td>
                              <td className="p-4 font-sans text-gray-400">
                                {tx.destinationWallet || 'N/A'}
                              </td>
                              <td className="p-4 font-bold text-white">
                                ${tx.debitAmount ? tx.debitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0.00'}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${statusColor}`}>
                                  {tx.status}
                                </span>
                              </td>
                              <td className="p-4 font-sans text-gray-400">
                                {tx.triggeredBy || 'System'}
                              </td>
                              <td className="p-4 pr-6 text-right">
                                <button
                                  onClick={() => setSelectedHistoryTx(tx)}
                                  className="px-2.5 py-1 bg-violet-600/10 hover:bg-violet-650 text-violet-400 hover:text-white rounded-lg border border-violet-500/20 font-sans font-bold transition-all"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        <tr>
                          <td colSpan={9} className="p-4 bg-black/10 border-t border-white/5">
                            <div className="flex justify-between items-center px-2 text-xs font-sans text-gray-400">
                              <div>
                                Showing <span className="text-white font-bold">{startIndex + 1}</span> to{' '}
                                <span className="text-white font-bold">{Math.min(startIndex + historyItemsPerPage, totalItems)}</span> of{' '}
                                <span className="text-white font-bold">{totalItems}</span> system operations
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={currentHistoryPage === 1}
                                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                  className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                  Prev
                                </button>
                                <span className="font-mono text-gray-400">Page {currentHistoryPage} of {totalPages || 1}</span>
                                <button
                                  disabled={currentHistoryPage === totalPages || totalPages === 0}
                                  onClick={() => setHistoryPage(p => p + 1)}
                                  className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="space-y-8 animate-fade-in font-sans">
          
          {/* Rewards Exhaustion Warning Banner */}
          {(() => {
            const cashbackWalletBal = systemWallets?.find(w => w.id === 'e1b07221-50e5-4d76-bc34-31f41e57c605')?.runningBalance || 0;
            const reservedRewards = Math.max(0, (rewardsAnalytics?.totalDisbursed || 0) - (rewardsAnalytics?.totalRedeemed || 0));
            const availableRewardBudget = Math.max(0, cashbackWalletBal - reservedRewards);

            return (
              <>
                {cashbackWalletBal <= 0 && (
                  <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex gap-4 animate-pulse mb-6">
                    <ShieldAlert className="h-6 w-6 shrink-0 text-rose-400 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-black uppercase tracking-wider text-[10px]">⚠ Rewards distribution paused</p>
                      <p className="text-gray-300">
                        Cashback Wallet balance is fully exhausted ($0.00). All check-ins, cashbacks, and game rewards are suspended until the wallet is topped up.
                      </p>
                    </div>
                  </div>
                )}

                {/* Cashback Funding Status Console */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 text-[8px] font-black font-mono text-gray-500 uppercase tracking-widest">
                      Cashback Wallet Pool
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Cashback Wallet Balance</span>
                      <p className="text-2xl font-black text-white font-mono mt-1">
                        ${cashbackWalletBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">Ledger Account Balance e1b07221...605</p>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 text-[8px] font-black font-mono text-amber-500 uppercase tracking-widest">
                      Committed Payouts
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Reserved Rewards</span>
                      <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                        ${reservedRewards.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">Credited to customer balances but unredeemed</p>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 text-[8px] font-black font-mono text-violet-500 uppercase tracking-widest">
                      Solvent Budget
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Available Reward Budget</span>
                      <p className="text-2xl font-black text-violet-400 font-mono mt-1">
                        ${availableRewardBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">Net liquid uncommitted cashback funds</p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
          
          {/* Cashback Offer Campaigns */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/80 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-violet-400" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Active Promotional Campaigns</h3>
              </div>
              <button
                onClick={() => setShowCreateOfferForm(!showCreateOfferForm)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-violet-600/10"
              >
                {showCreateOfferForm ? 'Close Campaign Form' : 'New Campaign Offer'}
              </button>
            </div>

            {showCreateOfferForm && (
              <form onSubmit={handleCreateOfferSubmit} className="space-y-4 p-5 rounded-2xl bg-black/40 border border-white/5 animate-slide-up">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Create New Cashback Offer</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Offer Title</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI Transfer Incentive"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Trigger Transaction Type</label>
                    <select
                      value={offerTxType}
                      onChange={(e) => setOfferTxType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                    >
                      <option value="TRANSFER">TRANSFER (UPI / Wallet Transfer)</option>
                      <option value="DEPOSIT">DEPOSIT (Deposit Funds)</option>
                      <option value="WITHDRAWAL">WITHDRAWAL (ATM / Bank Cashout)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Campaign Description</label>
                    <textarea
                      placeholder="Describe the offer details, e.g. Get 5% cashback on all transfers over $100."
                      value={offerDescription}
                      onChange={(e) => setOfferDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50 min-h-[80px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Min Transaction Amount ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={offerMinAmt}
                      onChange={(e) => setOfferMinAmt(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Cashback Percentage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 5.0 (set to 0 if fixed reward)"
                      value={offerPct}
                      onChange={(e) => setOfferPct(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Fixed Reward Amount ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10 (set to 0 if percentage-based)"
                      value={offerFixed}
                      onChange={(e) => setOfferFixed(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Max Cashback Cap ($)</label>
                    <input
                      type="number"
                      placeholder="e.g. 50 (max limit per transaction)"
                      value={offerMax}
                      onChange={(e) => setOfferMax(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateOfferForm(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createOfferMutation.isPending}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition shadow-md"
                  >
                    {createOfferMutation.isPending ? 'Launching Campaign...' : 'Launch Campaign'}
                  </button>
                </div>
              </form>
            )}

            {offers && offers.length > 0 ? (
              <div className="glass-panel rounded-3xl overflow-hidden border border-white/5 bg-[#12121a]/85 animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider font-semibold font-mono">
                        <th className="p-4 pl-6">Campaign details</th>
                        <th className="p-4">Trigger Action</th>
                        <th className="p-4">Rule Config</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {offers.map((offer) => (
                        <tr key={offer.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="p-4 pl-6 max-w-xs">
                            <p className="font-semibold text-white">{offer.title}</p>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{offer.description}</p>
                          </td>
                          <td className="p-4 font-mono text-xs font-bold text-violet-400">
                            {offer.transactionType}
                          </td>
                          <td className="p-4 font-mono text-xs space-y-1">
                            <p className="text-gray-300">Min Spend: ${offer.minAmount}</p>
                            {offer.cashbackPercentage > 0 && (
                              <p className="text-emerald-400">Reward: {offer.cashbackPercentage}% (Max ${offer.maxCashback})</p>
                            )}
                            {offer.fixedCashback > 0 && (
                              <p className="text-emerald-400">Reward: Fixed ${offer.fixedCashback}</p>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              offer.active 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {offer.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => toggleOfferMutation.mutate({ id: offer.id, active: !offer.active })}
                              disabled={toggleOfferMutation.isPending}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                offer.active 
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400' 
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {offer.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 italic text-xs font-medium bg-black/20 border border-white/5 rounded-2xl">
                No active reward campaigns configured.
              </div>
            )}
          </div>

          {gamifySuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5" />
              <span>{gamifySuccess}</span>
            </div>
          )}

          {gamifyError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{gamifyError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Spin Wheel Configuration */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4">
              <h3 className="text-sm font-bold text-white">Lucky Spin Wheel Prizes</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Configure segments, weights, points, and cashback rewards for the lucky wheel.
              </p>
              <textarea
                value={spinWheelJson}
                onChange={(e) => setSpinWheelJson(e.target.value)}
                className="w-full h-64 p-4 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-violet-500/50"
              />
              <button
                onClick={() => updateGamifyConfigMutation.mutate({ key: 'spin_wheel', value: spinWheelJson })}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Save Wheel Prizes JSON
              </button>
            </div>

            {/* Scratch Card Configuration */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 space-y-4">
              <h3 className="text-sm font-bold text-white">Scratch Card Prizes</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Configure reward pools and win probabilities for client scratch cards.
              </p>
              <textarea
                value={scratchCardJson}
                onChange={(e) => setScratchCardJson(e.target.value)}
                className="w-full h-64 p-4 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-violet-500/50"
              />
              <button
                onClick={() => updateGamifyConfigMutation.mutate({ key: 'scratch_card', value: scratchCardJson })}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition shadow-md"
              >
                Save Scratch Card JSON
              </button>
            </div>
          </div>

        </div>
      )}

      {/* KYC Document Viewer Modal */}
      {selectedKycDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-3xl glass-panel p-6 rounded-3xl relative border border-white/10 shadow-2xl">
            <button
              onClick={() => setSelectedKycDoc(null)}
              className="absolute right-4 top-4 p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-display font-bold text-lg text-white mb-1">
              Audit Identity Verification Details
            </h3>
            <p className="text-xs text-gray-400 mb-2">
              User: <span className="font-semibold text-violet-400">{selectedKycDoc.user}</span> | Document Type: {selectedKycDoc.type}
            </p>
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Document / ID Number: <span className="font-bold text-fuchsia-400">{selectedKycDoc.number}</span>
            </p>

            {selectedKycDoc.faceMatchScore !== undefined && selectedKycDoc.faceMatchScore !== null && (
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 grid grid-cols-3 gap-4 text-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Face Match Confidence</span>
                  <p className="text-base font-extrabold text-violet-400 font-mono mt-1">{selectedKycDoc.faceMatchScore.toFixed(2)}%</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">OCR Text Match</span>
                  <p className="text-base font-extrabold text-fuchsia-400 font-mono mt-1">{selectedKycDoc.ocrConfidence?.toFixed(2)}%</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Fraud Risk Index</span>
                  <p className={`text-base font-extrabold font-mono mt-1 ${selectedKycDoc.riskScore && selectedKycDoc.riskScore > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedKycDoc.riskScore}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: ID Document */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ID Document Photo</h4>
                <div className="border border-white/5 rounded-2xl bg-black/30 overflow-hidden flex items-center justify-center p-2 min-h-[250px] max-h-[350px]">
                  {selectedKycDoc.data.startsWith('data:') ? (
                    <img 
                      src={selectedKycDoc.data} 
                      alt="KYC ID Attachment" 
                      className="max-w-full max-h-[300px] object-contain rounded-lg"
                    />
                  ) : (
                    <iframe
                      src={selectedKycDoc.data}
                      title="KYC PDF Viewer"
                      className="w-full h-[300px] border-0 rounded-lg bg-white"
                    />
                  )}
                </div>
              </div>

              {/* Right Column: User Selfie */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">User Live Selfie</h4>
                <div className="border border-white/5 rounded-2xl bg-black/30 overflow-hidden flex items-center justify-center p-2 min-h-[250px] max-h-[350px]">
                  {selectedKycDoc.selfie ? (
                    <img 
                      src={selectedKycDoc.selfie} 
                      alt="KYC Selfie Attachment" 
                      className="max-w-full max-h-[300px] object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-xs text-gray-500 font-semibold italic">No Selfie uploaded</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedKycDoc(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Account Transactions Modal */}
      {inspectAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-white/10 bg-[#0e0e16]/95 shadow-[0_10px_50px_rgba(0,0,0,0.5)] space-y-5">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-violet-400" />
                <h3 className="font-display font-black text-lg text-white">Ledger Statement Preview</h3>
              </div>
              <button
                onClick={() => {
                  setInspectAccountId(null);
                  setInspectUsername(null);
                }}
                className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider"
              >
                Close
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Inspecting Customer Profile</span>
              <p className="text-sm text-white font-bold">Username: <span className="text-violet-450">@{inspectUsername}</span></p>
              <p className="text-[10px] text-gray-500 font-mono">Account ID: {inspectAccountId}</p>
            </div>

            <div className="space-y-3">
              <span className="text-[9px] uppercase font-black text-gray-500 tracking-wider">Latest 10 Transactions (On-Demand Scoped Load)</span>
              
              <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
                {isInspectingEntries ? (
                  <div className="py-8 text-center text-gray-500 text-xs animate-pulse font-semibold">
                    Loading ledger data...
                  </div>
                ) : inspectedEntries.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-xs italic font-semibold">
                    No transactions recorded for this account.
                  </div>
                ) : (
                  inspectedEntries.slice(0, 10).map((entry: any) => {
                    const isCredit = entry.entryType === 'CREDIT';
                    return (
                      <div 
                        key={entry.id} 
                        className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isCredit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                            }`}>
                              {entry.entryType}
                            </span>
                            <span className="text-xs font-bold text-gray-300">
                              {entry.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono">UTR ID: {'UTR' + entry.id.substring(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-black font-mono ${isCredit ? 'text-emerald-400' : 'text-rose-450'}`}>
                            {isCredit ? '+' : '-'}${entry.amount.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-gray-500 block font-mono mt-0.5">Bal: ${entry.balanceAfter.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setInspectAccountId(null);
                  setInspectUsername(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Treasury History Detail Drawer Overlay */}
      {selectedHistoryTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="max-w-3xl w-full bg-[#0d0d12]/95 border border-white/10 rounded-3xl p-6 relative shadow-2xl animate-scale-up space-y-6 overflow-y-auto max-h-[90vh]">
            
            <div className="flex justify-between items-start border-b border-white/5 pb-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-violet-400 font-mono">Operation Details Audit</span>
                <h2 className="text-lg font-black text-white uppercase tracking-wider mt-0.5">{selectedHistoryTx.operationType}</h2>
              </div>
              <button
                onClick={() => setSelectedHistoryTx(null)}
                className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-mono text-gray-300">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Transaction ID</span>
                <span className="text-white select-all">{selectedHistoryTx.transactionId}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Reference / UTR</span>
                <span className="text-gray-400">{selectedHistoryTx.reference || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Created Time</span>
                <span className="text-gray-400">{selectedHistoryTx.createdAt ? new Date(selectedHistoryTx.createdAt).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Completed Time</span>
                <span className="text-gray-400">{selectedHistoryTx.completedAt ? new Date(selectedHistoryTx.completedAt).toLocaleString() : 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Triggered By</span>
                <span className="text-violet-300 font-bold">{selectedHistoryTx.triggeredBy || 'System'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Currency</span>
                <span className="text-white">{selectedHistoryTx.currency || 'USD'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Balance Before</span>
                <span className="text-white">${selectedHistoryTx.balanceBefore ? selectedHistoryTx.balanceBefore.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Balance After</span>
                <span className="text-white">${selectedHistoryTx.balanceAfter ? selectedHistoryTx.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
              </div>
              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans">Description / Audit Notes</span>
                <p className="text-gray-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl font-sans text-xs italic">
                  {selectedHistoryTx.description || 'System booking entry.'}
                </p>
              </div>
            </div>

            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Visual money flow path</div>
              <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 font-mono text-[10px] text-center pt-2">
                {selectedHistoryTx.operationType === 'Capital Injection' && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold">Founder Capital Account</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">Owner Treasury Wallet</div>
                    <div className="text-gray-600 font-sans font-bold">&amp;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 font-bold">Yield Reserve Wallet</div>
                  </>
                )}
                {selectedHistoryTx.operationType === 'Treasury Funding' && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">Owner Treasury Wallet</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">Platform Revenue Wallet</div>
                  </>
                )}
                {selectedHistoryTx.operationType === 'Cashback Funding' && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">Owner Treasury Wallet</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 font-bold">Cashback Wallet</div>
                  </>
                )}
                {selectedHistoryTx.operationType === 'Investment Created' && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">Owner Treasury Wallet</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold">Treasury Investment Portfolio</div>
                  </>
                )}
                {selectedHistoryTx.operationType === 'Investment Matured' && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold">Treasury Investment Portfolio</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">Owner Treasury (Principal)</div>
                    <div className="text-gray-600 font-sans font-bold">&amp;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 font-bold">Yield Reserve (80% Profit)</div>
                    <div className="text-gray-600 font-sans font-bold">&amp;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">Platform Revenue (20% Profit)</div>
                  </>
                )}
                {selectedHistoryTx.operationType === 'Yield Distribution' && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 font-bold">Yield Reserve Wallet</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 font-bold">User Savings / Vault Account</div>
                  </>
                )}
                {selectedHistoryTx.operationType === 'Cashback Distribution' && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 font-bold">Cashback Wallet</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 font-bold">User Reward Balance</div>
                  </>
                )}
                {!['Capital Injection', 'Treasury Funding', 'Cashback Funding', 'Investment Created', 'Investment Matured', 'Yield Distribution', 'Cashback Distribution'].includes(selectedHistoryTx.operationType) && (
                  <>
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-bold">Source: {selectedHistoryTx.sourceWallet || 'N/A'}</div>
                    <div className="text-gray-600 font-sans font-bold">&rarr;</div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-bold">Destination: {selectedHistoryTx.destinationWallet || 'N/A'}</div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] text-gray-550 block uppercase font-bold font-sans tracking-wider">Ledger journal entries ({selectedHistoryTx.ledgerEntries ? selectedHistoryTx.ledgerEntries.length : 0})</span>
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden bg-black/20 text-[11px] font-mono">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500 font-black text-[9px] uppercase">
                      <th className="p-3 pl-4">Entry ID</th>
                      <th className="p-3">Wallet / Account Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3 pr-4 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {selectedHistoryTx.ledgerEntries && selectedHistoryTx.ledgerEntries.length > 0 ? (
                      selectedHistoryTx.ledgerEntries.map((ent: any) => (
                        <tr key={ent.entryId} className="hover:bg-white/[0.01]">
                          <td className="p-3 pl-4 text-gray-500">
                            ENT-{ent.entryId.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="p-3 text-white font-sans font-medium">
                            {ent.accountName}
                          </td>
                          <td className="p-3">
                            <span className={`font-bold ${ent.entryType === 'CREDIT' ? 'text-emerald-455' : 'text-rose-455'}`}>
                              {ent.entryType}
                            </span>
                          </td>
                          <td className="p-3 text-white font-bold">
                            ${ent.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 pr-4 text-right text-gray-450">
                            ${ent.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-500 italic">
                          No ledger journal entries recorded for this operation (Audit Log record only).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedHistoryTx(null)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
              >
                Close Audit Panel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
