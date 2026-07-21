import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { axiosInstance } from '../api/axiosInstance';
import { APP_PUBLIC_URL } from '../config/appConfig';
import { 
  ArrowDownRight, ArrowUpRight, 
  Wallet, RefreshCw, AlertCircle, CheckCircle2, X,
  Lock, Unlock, LogOut, Phone, Send, ArrowLeft, User,
  Smartphone, Building2, Eye, EyeOff, Sparkles, Award, Coins, ChevronRight, Gift,
  QrCode, Camera, Share2
} from 'lucide-react';

interface BalanceData {
  accountId: string;
  currentBalance: number;
  currency: string;
  lastLedgerEntryId: string;
  updatedAt: string;
}

interface TransactionResponse {
  transactionId: string;
  status: string;
  message: string;
}

const parseError = (err: any, fallback: string): string => {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.errorMessage) return data.errorMessage;
  if (data.message) return data.message;
  if (typeof data === 'object') return Object.values(data).join(', ');
  return fallback;
};

interface AccountData {
  id: string;
  email: string;
  fullName: string;
  username: string;
  kycStatus: string;
  status: string;
  pinSet: boolean;
  phoneNumber?: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState<string>('');
  const [activeModal, setActiveModal] = useState<'deposit' | 'withdraw' | 'transfer' | 'bank_action' | 'check_balance' | 'wallet' | 'recharge' | null>(null);

  // Mobile Recharge States
  const [rechargePhone, setRechargePhone] = useState('');
  const [rechargeOperator, setRechargeOperator] = useState('Jio');
  const [rechargePlan, setRechargePlan] = useState('299');
  const [rechargeAmount, setRechargeAmount] = useState('299');

  // QR Generator & Scanner States
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [qrScanError, setQrScanError] = useState('');

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrScanError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setQrScanError('Failed to initialize canvas context.');
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, img.width, img.height);
        if (code) {
          try {
            const data = JSON.parse(code.data);
            if (data.phone) {
              setTargetAccount(data.phone);
              setChatRecipientPhone(data.phone);
              if (data.name) setChatRecipientName(data.name);
              setShowScannerModal(false);
              setActiveModal('transfer');
              startConversation(data.phone);
            } else if (data.accountId) {
              setTargetAccount(data.accountId);
              setShowScannerModal(false);
              setActiveModal('transfer');
            } else {
              setQrScanError('Scanned QR code format is not recognized.');
            }
          } catch (err) {
            const trimmed = code.data.trim();
            if (trimmed.length >= 8) {
              setTargetAccount(trimmed);
              setChatRecipientPhone(trimmed);
              setShowScannerModal(false);
              setActiveModal('transfer');
              startConversation(trimmed);
            } else {
              setQrScanError('Failed to parse QR code data.');
            }
          }
        } else {
          setQrScanError('No QR code detected in the uploaded image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Fetch Account Details
  const { data: account } = useQuery<AccountData>({
    queryKey: ['accountInfo', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/me');
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch Reward Wallet details for unified dashboard wallet view
  const { data: rewardWallet } = useQuery<any>({
    queryKey: ['rewards-wallet-dashboard', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/rewards/wallet?userId=${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });
  
  // Form States
  const [amount, setAmount] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('OTHERS');
  const [pin, setPin] = useState('');
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [withdrawalChannel, setWithdrawalChannel] = useState<'BANK' | 'ATM'>('BANK');
  const [atmPhoneNumber, setAtmPhoneNumber] = useState('');

  // PhonePe Chat Transfer States
  const [chatRecipientPhone, setChatRecipientPhone] = useState('');
  const [chatRecipientName, setChatRecipientName] = useState('');
  const [chatRecipientKyc, setChatRecipientKyc] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatMsgInput, setChatMsgInput] = useState('');
  const [recentRecipients, setRecentRecipients] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [showPayPinPrompt, setShowPayPinPrompt] = useState(false);
  const [chatError, setChatError] = useState('');
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);
  const [checkBalanceError, setCheckBalanceError] = useState('');

  // Lock Screen States & Handlers
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('ledger_unlocked') === 'true');
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Forgot PIN States & Handlers
  const [forgotPinMode, setForgotPinMode] = useState<'none' | 'otp_sent'>('none');
  const [otpCode, setOtpCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isResettingPin, setIsResettingPin] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleForgotPinClick = async () => {
    setIsRequestingOtp(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const response = await axiosInstance.post('/api/accounts/pin/forgot-request');
      if (response.data.status === 'SUCCESS') {
        setMaskedPhone(response.data.maskedPhone || '');
        setForgotPinMode('otp_sent');
      } else {
        setForgotError(response.data.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setForgotError(parseError(err, 'Failed to send OTP. Make sure a phone number is registered.'));
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmNewPin) {
      setForgotError('PINs do not match.');
      return;
    }
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setForgotError('PIN must be exactly 4 digits.');
      return;
    }
    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      setForgotError('OTP must be exactly 6 digits.');
      return;
    }
    setIsResettingPin(true);
    setForgotError('');
    try {
      const response = await axiosInstance.post('/api/accounts/pin/forgot-reset', {
        otp: otpCode,
        newPin: newPin
      });
      if (response.data.status === 'SUCCESS') {
        setForgotSuccess('Transaction PIN reset successfully!');
        setTimeout(() => {
          setForgotPinMode('none');
          setForgotSuccess('');
          setOtpCode('');
          setNewPin('');
          setConfirmNewPin('');
          queryClient.invalidateQueries({ queryKey: ['accountInfo', accountId] });
        }, 2000);
      } else {
        setForgotError(response.data.message || 'Reset failed.');
      }
    } catch (err: any) {
      setForgotError(parseError(err, 'Failed to reset PIN. Invalid or expired OTP.'));
    } finally {
      setIsResettingPin(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.username) return;
    if (unlockPin.length !== 4) {
      setUnlockError('PIN must be exactly 4 digits.');
      return;
    }
    setIsUnlocking(true);
    setUnlockError('');
    try {
      const response = await axiosInstance.post(
        `/api/accounts/pin/verify?username=${encodeURIComponent(account.username)}&pin=${encodeURIComponent(unlockPin)}`
      );
      if (response.data === true) {
        setIsUnlocked(true);
        sessionStorage.setItem('ledger_unlocked', 'true');
      } else {
        setUnlockError('Incorrect PIN. Please try again.');
        setUnlockPin('');
      }
    } catch (err) {
      setUnlockError('Verification failed. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCheckBalanceVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.username || pin.length !== 4) return;
    setSubmitDisabled(true);
    setCheckBalanceError('');
    try {
      const response = await axiosInstance.post(
        `/api/accounts/pin/verify?username=${encodeURIComponent(account.username)}&pin=${encodeURIComponent(pin)}`
      );
      if (response.data === true) {
        setIsBalanceRevealed(true);
        setActiveModal(null);
        resetForm();
      } else {
        setCheckBalanceError('Incorrect Transaction PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      setCheckBalanceError('Failed to verify Transaction PIN.');
    } finally {
      setSubmitDisabled(false);
    }
  };

  const handleLockLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accountId');
    sessionStorage.removeItem('ledger_unlocked');
    window.dispatchEvent(new Event('auth-expired'));
  };
  
  // Feedback States
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);

  // Extract accountId and check Admin role from token
  useEffect(() => {
    const storedId = localStorage.getItem('accountId');
    if (storedId) {
      setAccountId(storedId);
    }
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const tokenRole = payload.role;
        const tokenRoles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
        if (tokenRole === 'ROLE_ADMIN' || tokenRole === 'ADMIN' || 
            tokenRoles.includes('ROLE_ADMIN') || tokenRoles.includes('ADMIN')) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error('Failed to parse token details', e);
      }
    }

    // Read redirected query params from Admin Dashboard
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action) {
      resetForm();
      if (action === 'transfer') {
        setActiveModal('transfer');
      } else if (action === 'deposit') {
        setActiveModal('bank_action');
        setWithdrawalChannel('BANK'); // Trigger Deposit Tab
      } else if (action === 'withdraw') {
        setActiveModal('bank_action');
        setWithdrawalChannel('ATM'); // Trigger Withdrawal Tab
      } else if (action === 'wallet') {
        setActiveModal('wallet');
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch Account Balance
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance, isFetching } = useQuery<BalanceData>({
    queryKey: ['balance', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/balances/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
    refetchInterval: 5000, // Polling balance every 5s for live updates
  });

  const resetForm = () => {
    setAmount('');
    setTargetAccount('');
    setCategory('OTHERS');
    setPin('');
    setSubmitDisabled(false);
    setErrorMsg('');
    setWithdrawalChannel('BANK');
    setAtmPhoneNumber('');
    setChatRecipientPhone('');
    setChatRecipientName('');
    setChatRecipientKyc('');
    setChatHistory([]);
    setChatMsgInput('');
    setShowPayPinPrompt(false);
    setChatError('');
    setRechargePhone('');
    setRechargeOperator('Jio');
    setRechargePlan('299');
    setRechargeAmount('299');
  };

  const handleTransactionSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setActiveModal(null);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ['balance', accountId] });
    queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
    queryClient.invalidateQueries({ queryKey: ['spending', accountId] });
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Deposit Mutation
  const depositMutation = useMutation({
    mutationFn: async ({ amt, cur, key, cat, pinCode }: { amt: number; cur: string; key: string; cat: string; pinCode: string }) => {
      const response = await axiosInstance.post(
        '/api/transactions/deposit',
        { targetAccountId: accountId, amount: amt, currency: cur, idempotencyKey: key, category: cat, pin: pinCode }
      );
      return response.data;
    },
    onSuccess: (data: TransactionResponse) => {
      handleTransactionSuccess(`Successfully deposited ${currency} ${parseFloat(amount).toFixed(2)}. TxID: ${data.transactionId}`);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Transaction failed. Please try again.'));
      setSubmitDisabled(false);
    }
  });

  // Withdraw Mutation
  const withdrawMutation = useMutation({
    mutationFn: async ({ amt, cur, key, cat, pinCode, channel, phone }: { amt: number; cur: string; key: string; cat: string; pinCode: string; channel?: string; phone?: string }) => {
      const response = await axiosInstance.post(
        '/api/transactions/withdraw',
        { sourceAccountId: accountId, amount: amt, currency: cur, idempotencyKey: key, category: cat, pin: pinCode, paymentChannel: channel, phoneNumber: phone }
      );
      return response.data;
    },
    onSuccess: (data: TransactionResponse) => {
      handleTransactionSuccess(`Successfully withdrew ${currency} ${parseFloat(amount).toFixed(2)}. TxID: ${data.transactionId}`);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Transaction failed. Please try again.'));
      setSubmitDisabled(false);
    }
  });

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: async ({ target, amt, cur, key, cat, pinCode }: { target: string; amt: number; cur: string; key: string; cat: string; pinCode: string }) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
      const payload: any = {
        sourceAccountId: accountId,
        amount: amt,
        currency: cur,
        idempotencyKey: key,
        category: cat,
        pin: pinCode
      };
      if (isUuid) {
        payload.targetAccountId = target;
      } else {
        payload.phoneNumber = target;
      }
      const response = await axiosInstance.post('/api/transactions/transfer', payload);
      return response.data;
    },
    onSuccess: () => {
      const displayTarget = targetAccount.includes('-') 
        ? `account ending in ${targetAccount.substring(0, 8)}...` 
        : `phone number ${targetAccount}`;
      handleTransactionSuccess(`Successfully transferred ${currency} ${parseFloat(amount).toFixed(2)} to ${displayTarget}`);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Transaction failed. Please try again.'));
      setSubmitDisabled(false);
    }
  });

  // Recharge Mutation
  const rechargeMutation = useMutation({
    mutationFn: async ({ phone, oper, amt, pinCode }: { phone: string; oper: string; amt: number; pinCode: string }) => {
      const response = await axiosInstance.post('/api/transactions/recharge', {
        accountId: accountId,
        phoneNumber: phone,
        operator: oper,
        amount: amt,
        pin: pinCode
      });
      return response.data;
    },
    onSuccess: (data: any) => {
      handleTransactionSuccess(`Successfully recharged ${rechargeOperator} connection (+91 ${rechargePhone}) with $${parseFloat(rechargeAmount).toFixed(2)}. ${data.message || ''}`);
    },
    onError: (err: any) => {
      setErrorMsg(parseError(err, 'Recharge transaction failed. Please check balance/PIN.'));
      setSubmitDisabled(false);
    }
  });

  // PhonePe Chat Transfer Helper Functions
  const fetchRecentRecipients = async () => {
    try {
      const response = await axiosInstance.get(`/api/transactions/chat/recipients?myAccountId=${accountId}`);
      setRecentRecipients(response.data || []);
    } catch (err) {
      console.error("Failed to load recent chat recipients", err);
    }
  };

  const fetchChatHistory = async (phone: string) => {
    try {
      const response = await axiosInstance.get(`/api/transactions/chat/history?myAccountId=${accountId}&recipientPhone=${encodeURIComponent(phone)}`);
      setChatHistory(response.data || []);
      // Mark messages from this sender as read
      await axiosInstance.post(`/api/transactions/chat/mark-read?myAccountId=${accountId}&senderPhone=${encodeURIComponent(phone)}`);
      fetchRecentRecipients();
    } catch (err) {
      console.error("Failed to load chat history", err);
    }
  };

  const startConversation = async (phone: string) => {
    if (!phone.trim()) return;
    if (phone.trim() === account?.phoneNumber) {
      alert("You cannot pay or message yourself!");
      return;
    }
    setLoadingChat(true);
    setChatError('');
    try {
      const profileRes = await axiosInstance.get(`/api/accounts/by-phone?phoneNumber=${encodeURIComponent(phone.trim())}`);
      if (profileRes.data) {
        const resolvedPhone = profileRes.data.phoneNumber || phone.trim();
        setChatRecipientPhone(resolvedPhone);
        setChatRecipientName(profileRes.data.fullName || '');
        setChatRecipientKyc(profileRes.data.kycStatus || 'NOT_STARTED');
        await fetchChatHistory(resolvedPhone);
      }
    } catch (err: any) {
      setChatRecipientPhone(phone.trim());
      setChatRecipientName('Unregistered Contact');
      setChatRecipientKyc('UNREGISTERED');
      await fetchChatHistory(phone.trim());
    } finally {
      setLoadingChat(false);
    }
  };

  const sendChatMessageText = async () => {
    if (!chatMsgInput.trim() || !chatRecipientPhone) return;
    try {
      await axiosInstance.post('/api/transactions/chat/send', {
        senderAccountId: accountId,
        recipientPhoneNumber: chatRecipientPhone,
        messageContent: chatMsgInput.trim()
      });
      setChatMsgInput('');
      fetchChatHistory(chatRecipientPhone);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  // Poll recent recipients list (badge count) every 5 seconds
  useEffect(() => {
    if (!accountId) return;
    fetchRecentRecipients();
    const interval = setInterval(() => {
      fetchRecentRecipients();
    }, 5000);
    return () => clearInterval(interval);
  }, [accountId]);

  // Poll chat history every 3 seconds when chat modal is open
  useEffect(() => {
    if (!accountId || !chatRecipientPhone) return;
    fetchChatHistory(chatRecipientPhone);
    const interval = setInterval(() => {
      fetchChatHistory(chatRecipientPhone);
    }, 3000);
    return () => clearInterval(interval);
  }, [accountId, chatRecipientPhone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than zero.');
      return;
    }

    const roundedAmount = Math.round(parsedAmount * 100) / 100;

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setErrorMsg('Please enter a valid 4-digit Transaction PIN.');
      return;
    }

    setSubmitDisabled(true);
    setErrorMsg('');

    // Generate Client-Side Idempotency Key
    const idempotencyKey = crypto.randomUUID();

    if (activeModal === 'deposit') {
      depositMutation.mutate({ amt: roundedAmount, cur: currency, key: idempotencyKey, cat: category, pinCode: pin });
    } else if (activeModal === 'withdraw') {
      if (withdrawalChannel === 'ATM' && !atmPhoneNumber.trim()) {
        setErrorMsg('Please enter your phone number to authorize ATM withdrawal.');
        setSubmitDisabled(false);
        return;
      }
      withdrawMutation.mutate({
        amt: roundedAmount,
        cur: currency,
        key: idempotencyKey,
        cat: category,
        pinCode: pin,
        channel: withdrawalChannel,
        phone: withdrawalChannel === 'ATM' ? atmPhoneNumber.trim() : undefined
      });
    } else if (activeModal === 'transfer') {
      if (!targetAccount.trim()) {
        setErrorMsg('Please enter the target account ID.');
        setSubmitDisabled(false);
        return;
      }
      transferMutation.mutate({ target: targetAccount.trim(), amt: roundedAmount, cur: currency, key: idempotencyKey, cat: category, pinCode: pin });
    }
  };

  const formatCurrency = (val: number, curCode: string) => {
    const symbol = curCode === 'EUR' ? '€' : curCode === 'GBP' ? '£' : '$';
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (account?.pinSet && !isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07070a]/90 backdrop-blur-xl animate-fade-in">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl" />

        <div className="glass-panel max-w-md w-full p-8 rounded-3xl relative overflow-hidden border border-white/5 shadow-2xl mx-4 text-center">
          {forgotPinMode === 'otp_sent' ? (
            <div className="space-y-6">
              {/* Reset Header */}
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-violet-600/10 text-violet-400 border border-violet-500/20 relative">
                  <Phone className="h-8 w-8" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">Reset PIN</h2>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  We've sent a 6-digit OTP to your phone ending in <strong className="text-violet-400">******{maskedPhone}</strong>.
                </p>
              </div>

              {forgotError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 animate-pulse" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPinSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-widest font-bold text-sm"
                    placeholder="Enter OTP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    New 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-widest font-bold text-sm"
                    placeholder="••••"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-widest font-bold text-sm"
                    placeholder="••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isResettingPin}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isResettingPin ? 'Resetting...' : 'Reset Transaction PIN'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setForgotPinMode('none')}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold text-xs rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    Back to Unlock
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Locked Icon Header */}
              <div className="flex justify-center">
                <div className="p-4 rounded-2xl bg-violet-600/10 text-violet-400 border border-violet-500/20 relative animate-pulse">
                  <Lock className="h-8 w-8" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">Ledger Locked</h2>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Enter your 4-digit Transaction PIN to unlock and view your wallet balance.
                </p>
              </div>

              {unlockError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{unlockError}</span>
                </div>
              )}

              {forgotError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d*"
                    required
                    autoFocus
                    value={unlockPin}
                    onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                    className="w-48 px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-[1.5em] font-bold text-2xl placeholder-gray-600 animate-pulse"
                    placeholder="••••"
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={isUnlocking}
                    className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Unlock className="h-4 w-4" />
                    {isUnlocking ? 'Unlocking...' : 'Unlock Wallet'}
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isRequestingOtp}
                      onClick={handleForgotPinClick}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-xs rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      {isRequestingOtp ? 'Requesting...' : 'Forgot PIN?'}
                    </button>

                    <button
                      type="button"
                      onClick={handleLockLogout}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-semibold text-xs rounded-xl border border-white/5 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalMessageCount = recentRecipients.reduce((sum, rec) => sum + (rec.messageCount || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-violet-900/40 via-indigo-950/40 to-fuchsia-950/40 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 glow-purple">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="space-y-3 relative z-10 text-center md:text-left max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Instant Settlement Project Projection</span>
          </div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight leading-tight">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{account?.fullName || 'Valued Member'}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
            Securely manage virtual credit skins, run sandboxed card simulations, and perform instant zero-fee UPI chat transfers mapped on the event-sourced ledger.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 relative z-20">
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>Show My QR</span>
            </button>
            <button
              onClick={() => { setShowScannerModal(true); setQrScanError(''); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold border border-white/5 transition-all cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              <span>Scan QR Code</span>
            </button>
          </div>
        </div>
        
        <div className="relative shrink-0 flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-fuchsia-500/15 rounded-full blur-2xl animate-pulse" />
          <div className="px-5 py-4 rounded-2xl glass-panel border border-violet-500/20 flex flex-col items-center gap-1.5 shadow-xl relative z-10 glow-emerald text-center">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded">Ledger Active</span>
            <p className="text-white text-xs font-semibold mt-1">KYC Status</p>
            <span className={`text-xs font-black px-3 py-1 rounded-lg border uppercase ${
              account?.kycStatus === 'APPROVED' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {account?.kycStatus || 'NOT_STARTED'}
            </span>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3 shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-300">Transaction Complete</p>
            <p className="text-emerald-400/90 mt-0.5">{successMsg}</p>
          </div>
        </div>
      )}

      {/* KYC Verification Alert banner if not approved */}
      {account && account.kycStatus !== 'APPROVED' && !isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs leading-normal flex items-start gap-2.5 shadow-md">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">KYC Verification Pending</p>
            <p className="text-amber-400/90 mt-0.5">Your current status is <strong>{account.kycStatus || 'NOT_STARTED'}</strong>. Complete verification under the <strong>Security</strong> tab to unlock transfers and account balance controls.</p>
          </div>
        </div>
      )}

      {/* Four Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {/* Card 1: To Mobile Number */}
        <button
          onClick={() => { setActiveModal('transfer'); resetForm(); }}
          disabled={account?.kycStatus !== 'APPROVED' && !isAdmin}
          className="glass-panel p-6 rounded-3xl flex flex-col justify-between text-left border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300 group shadow-md disabled:opacity-40 disabled:cursor-not-allowed min-h-[160px] relative"
        >
          {totalMessageCount > 0 && (
            <span className="absolute top-4 right-4 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs font-black text-white shadow-lg shadow-violet-600/30 animate-pulse">
              {totalMessageCount}
            </span>
          )}
          <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 group-hover:text-violet-300 transition-colors w-fit">
            <Smartphone className="h-6 w-6" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition-colors">1. To Mobile Number</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Instant transfer and chat with any registered user by phone number</p>
          </div>
        </button>

        {/* Card 2: To Bank & Self A/c */}
        <button
          onClick={() => { setActiveModal('bank_action'); resetForm(); }}
          disabled={account?.kycStatus !== 'APPROVED' && !isAdmin}
          className="glass-panel p-6 rounded-3xl flex flex-col justify-between text-left border border-white/5 hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 transition-all duration-300 group shadow-md disabled:opacity-40 disabled:cursor-not-allowed min-h-[160px]"
        >
          <div className="p-3 rounded-2xl bg-fuchsia-600/10 text-fuchsia-400 group-hover:bg-fuchsia-600/20 group-hover:text-fuchsia-300 transition-colors w-fit">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-white group-hover:text-fuchsia-300 transition-colors">2. To Bank & Self A/c</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Deposit external funds, authorize wire transfers, or withdraw cash</p>
          </div>
        </button>

        {/* Card 3: Mobile Recharge */}
        <button
          onClick={() => { setActiveModal('recharge'); resetForm(); }}
          disabled={account?.kycStatus !== 'APPROVED' && !isAdmin}
          className="glass-panel p-6 rounded-3xl flex flex-col justify-between text-left border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-300 group shadow-md disabled:opacity-40 disabled:cursor-not-allowed min-h-[160px]"
        >
          <div className="p-3 rounded-2xl bg-amber-600/10 text-amber-400 group-hover:bg-amber-600/20 group-hover:text-amber-300 transition-colors w-fit">
            <Smartphone className="h-6 w-6 animate-pulse" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">3. Mobile Recharge</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Recharge Jio, Airtel, VI numbers instantly via secure transaction PIN</p>
          </div>
        </button>

        {/* Card 4: My Wallet */}
        <button
          onClick={() => { setActiveModal('wallet'); }}
          disabled={account?.kycStatus !== 'APPROVED' && !isAdmin}
          className="glass-panel p-6 rounded-3xl flex flex-col justify-between text-left border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-300 group shadow-md disabled:opacity-40 disabled:cursor-not-allowed min-h-[160px]"
        >
          <div className="p-3 rounded-2xl bg-emerald-600/10 text-emerald-400 group-hover:bg-emerald-600/20 group-hover:text-emerald-300 transition-colors w-fit">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="mt-4">
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">4. My Wallet</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">View unified balances, check cashback rewards, and track loyalty progress</p>
          </div>
        </button>
      </div>

      {/* Ledger Balance Card Section */}
      <div className="glass-panel p-8 relative overflow-hidden flex flex-col justify-between glow-purple border-violet-500/20 h-64 rounded-3xl shadow-xl">
        {/* Neon lights */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between z-10">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest bg-violet-950/60 border border-violet-800/40 px-3 py-1 rounded-full">
            Available Balance
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => refetchBalance()}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
              title="Sync Balance"
            >
              <RefreshCw className={`h-4.5 w-4.5 text-violet-400 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            {isBalanceRevealed ? (
              <button 
                onClick={() => setIsBalanceRevealed(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
                title="Hide Balance"
              >
                <EyeOff className="h-4.5 w-4.5" />
              </button>
            ) : (
              <button 
                onClick={() => { setActiveModal('check_balance'); resetForm(); }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
                title="Reveal Balance"
              >
                <Eye className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>

        <div className="my-6 z-10">
          {balanceLoading ? (
            <div className="h-12 w-48 bg-white/5 rounded-xl animate-pulse" />
          ) : !isBalanceRevealed ? (
            <div className="flex items-center gap-4">
              <h2 className="font-display font-extrabold text-4xl md:text-5xl text-gray-500 tracking-widest">
                ••••••
              </h2>
              <button
                onClick={() => { setActiveModal('check_balance'); resetForm(); }}
                disabled={account?.kycStatus !== 'APPROVED' && !isAdmin}
                className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-[11px] font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Check Balance</span>
              </button>
            </div>
          ) : balance ? (
            <h2 className="font-display font-extrabold text-5xl md:text-6xl text-white tracking-tight animate-fade-in">
              {formatCurrency(balance.currentBalance, balance.currency)}
            </h2>
          ) : (
            <h2 className="font-display font-bold text-3xl text-gray-500">
              No active balance found
            </h2>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-400 border-t border-white/5 pt-4 z-10">
          <span className="font-mono truncate max-w-[200px] md:max-w-none">ACCOUNT ID: {accountId}</span>
          <span className="font-mono text-[9px] md:text-[10px]">REBUILD VERSION: {balance?.lastLedgerEntryId ? `${balance.lastLedgerEntryId.substring(0, 8)}...` : 'N/A'}</span>
        </div>
      </div>

      {/* Quick transaction Modals */}
      {activeModal && activeModal === 'transfer' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg h-[500px] glass-panel rounded-3xl relative glow-purple border-violet-500/20 flex flex-col overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => { setActiveModal(null); resetForm(); }}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all duration-200 z-10"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {!chatRecipientPhone ? (
              /* Step 1: Search & Recipient List */
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <h3 className="font-display font-bold text-xl text-white mb-2">
                  Instant Pay & Chat
                </h3>
                <p className="text-xs text-gray-400 mb-6">
                  Search user by phone number to instantly chat or transfer funds.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Recipient Phone Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={targetAccount}
                        onChange={(e) => setTargetAccount(e.target.value)}
                        placeholder="e.g. +1234567890"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-mono"
                      />
                      <button
                        onClick={() => startConversation(targetAccount)}
                        disabled={loadingChat || !targetAccount.trim()}
                        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                      >
                        {loadingChat ? 'Connecting...' : 'Chat & Pay'}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-3">
                      Recent Chats
                    </span>
                    {recentRecipients.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-xs">
                        No recent chats. Start a new one above.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {recentRecipients.map((rec) => (
                          <button
                            key={rec.phoneNumber}
                            onClick={() => startConversation(rec.phoneNumber)}
                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-violet-600/10 text-violet-400">
                                <User className="h-4.5 w-4.5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{rec.fullName || rec.phoneNumber}</p>
                                <p className="text-[9px] text-gray-500 font-mono mt-0.5">{rec.phoneNumber}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {rec.messageCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-black text-white" title={`${rec.messageCount} messages`}>
                                  {rec.messageCount}
                                </span>
                              )}
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${rec.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {rec.kycStatus === 'APPROVED' ? 'KYC Verified' : 'KYC Pending'}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Step 2: Conversation View */
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
                  <button
                    onClick={() => { setChatRecipientPhone(''); setChatHistory([]); }}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {chatRecipientName}
                    </h4>
                    <p className="text-[9px] text-gray-500 font-mono truncate mt-0.5">
                      {chatRecipientPhone}
                    </p>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                    chatRecipientKyc === 'APPROVED' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : chatRecipientKyc === 'UNREGISTERED'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {chatRecipientKyc === 'APPROVED' ? 'KYC Verified' : chatRecipientKyc === 'UNREGISTERED' ? 'Not Registered' : 'KYC Pending'}
                  </span>
                </div>

                {/* Message History Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col bg-black/[0.15]">
                  {chatHistory.length === 0 ? (
                    <div className="my-auto text-center p-8 text-gray-500 text-xs">
                      Say hello to {chatRecipientName}! Type a message or amount below.
                    </div>
                  ) : (() => {
                    let lastDateStr = '';
                    return chatHistory.map((msg) => {
                      const msgDate = new Date(msg.createdAt);
                      const dateStr = msgDate.toLocaleDateString(undefined, { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      });
                      const showDateHeader = dateStr !== lastDateStr;
                      lastDateStr = dateStr;
                      const isMe = msg.senderAccountId === accountId;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateHeader && (
                            <div className="flex justify-center my-3 animate-fade-in select-none">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-white/[0.02] border border-white/5 px-3 py-1 rounded-full font-mono shadow-sm">
                                {dateStr}
                              </span>
                            </div>
                          )}
                          {msg.isPayment ? (
                            <div 
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full animate-fade-in`}
                            >
                              <div className={`max-w-[70%] p-3.5 rounded-2xl border text-xs flex flex-col gap-1.5 shadow-lg ${
                                msg.paymentStatus === 'COMPLETED' 
                                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 glow-emerald' 
                                  : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                              }`}>
                                <div className="flex items-center gap-2 font-bold font-mono">
                                  <span>{msg.paymentStatus === 'COMPLETED' ? '💳 Transfer Sent' : '❌ Transfer Failed'}</span>
                                  <span className="ml-auto">${msg.paymentAmount?.toFixed(2)}</span>
                                </div>
                                <p className="text-[10px] text-gray-400">
                                  {msg.paymentStatus === 'COMPLETED' ? 'Instantly settled on ledger' : msg.messageContent || 'Failed transaction'}
                                </p>
                                <span className="text-[8px] text-gray-500 self-end font-mono">
                                  {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full animate-fade-in`}
                            >
                              <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-xs ${
                                isMe 
                                  ? 'bg-violet-600/20 border border-violet-500/20 text-violet-200 rounded-tr-none' 
                                  : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none'
                              }`}>
                                <p>{msg.messageContent}</p>
                                <span className="text-[8px] text-gray-500 block text-right mt-1 font-mono">
                                  {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>

                {/* Error Banner */}
                {chatError && (
                  <div className="p-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-400 text-[10px] text-center flex items-center justify-center gap-2">
                    <AlertCircle className="h-3 w-3" />
                    <span>{chatError}</span>
                  </div>
                )}

                {/* Bottom Input Area */}
                <div className="p-3 border-t border-white/5 bg-white/[0.01]">
                  {showPayPinPrompt ? (
                    /* PIN entry inside chat */
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (pin.length !== 4) return;
                        setSubmitDisabled(true);
                        setChatError('');
                        try {
                          const parsedAmount = parseFloat(chatMsgInput);
                          await transferMutation.mutateAsync({
                            target: chatRecipientPhone,
                            amt: parsedAmount,
                            cur: 'USD',
                            key: crypto.randomUUID(),
                            cat: 'OTHERS',
                            pinCode: pin
                          });
                          setPin('');
                          setChatMsgInput('');
                          setShowPayPinPrompt(false);
                          fetchChatHistory(chatRecipientPhone);
                        } catch (err: any) {
                          setChatError(parseError(err, 'Payment failed. Invalid PIN or recipient has not completed KYC.'));
                        } finally {
                          setSubmitDisabled(false);
                        }
                      }}
                      className="flex items-center justify-between gap-3 animate-fade-in py-1"
                    >
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                        Pay ${parseFloat(chatMsgInput).toFixed(2)}
                      </span>
                      <input
                        type="password"
                        maxLength={4}
                        pattern="\d*"
                        required
                        autoFocus
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter PIN"
                        className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-white text-center font-mono tracking-widest w-24 focus:border-violet-500/50 focus:outline-none"
                        autoComplete="new-password"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setShowPayPinPrompt(false); setPin(''); }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[10px] font-bold transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitDisabled}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all"
                        >
                          {submitDisabled ? 'Paying...' : 'Confirm'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Default text/payment input bar */
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={chatMsgInput}
                        onChange={(e) => setChatMsgInput(e.target.value)}
                        placeholder="Type a message or amount to pay..."
                        className="flex-1 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const isNumeric = /^\d+(\.\d{1,2})?$/.test(chatMsgInput.trim());
                            if (isNumeric) {
                              setShowPayPinPrompt(true);
                            } else {
                              sendChatMessageText();
                            }
                          }
                        }}
                      />
                      {/^\d+(\.\d{1,2})?$/.test(chatMsgInput.trim()) ? (
                        <button
                          onClick={() => setShowPayPinPrompt(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1 animate-fade-in"
                        >
                          <span>Pay ${parseFloat(chatMsgInput).toFixed(2)}</span>
                        </button>
                      ) : (
                        <button
                          onClick={sendChatMessageText}
                          disabled={!chatMsgInput.trim()}
                          className="p-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Wallet Modal */}
      {activeModal && activeModal === 'wallet' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl relative glow-purple border-violet-500/20">
            <button
              onClick={() => { setActiveModal(null); resetForm(); }}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all duration-200"
              title="Close"
            >
              <X className="h-5.5 w-5.5" />
            </button>

            <h3 className="font-display font-bold text-xl text-white mb-2">
              My Wallet
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Unified view of ledger credits, cashbacks, and loyalty levels.
            </p>

            <div className="space-y-4">
              {/* Account Balance card */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider">Ledger Account Balance</span>
                <div className="flex items-center justify-between">
                  {balanceLoading ? (
                    <div className="h-7 w-24 bg-white/5 rounded-md animate-pulse" />
                  ) : !isBalanceRevealed ? (
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-mono font-bold text-gray-400">••••••</span>
                      <button
                        onClick={() => { setActiveModal('check_balance'); }}
                        className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase"
                      >
                        Verify PIN
                      </button>
                    </div>
                  ) : balance ? (
                    <span className="text-lg font-display font-bold text-white">
                      {formatCurrency(balance.currentBalance, balance.currency)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Failed to load</span>
                  )}
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    BANK BALANCE
                  </span>
                </div>
              </div>

              {/* Reward Cashback Balance card */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider">Rewards Wallet</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 block">Cashback Balance</span>
                  <span className="text-base font-display font-bold text-violet-400 flex items-center gap-1">
                    <Coins className="h-4 w-4" />
                    <span>${rewardWallet?.cashbackBalance.toFixed(2) || '0.00'}</span>
                  </span>
                </div>
              </div>

              {/* Action shortcuts */}
              <button
                onClick={() => { setActiveModal(null); navigate('/rewards'); }}
                className="flex items-center justify-between w-full p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border border-violet-500/20 hover:border-violet-500/40 text-left text-white transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Go to Rewards Hub</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Claim daily rewards & spin the wheel</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* To Bank & Self A/c Modal */}
      {activeModal && activeModal === 'bank_action' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl relative glow-purple border-violet-500/20">
            <button
              onClick={() => { setActiveModal(null); resetForm(); }}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all duration-200"
              title="Close"
            >
              <X className="h-5.5 w-5.5" />
            </button>

            <h3 className="font-display font-bold text-xl text-white mb-2">
              To Bank & Self Account
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Deposit credits or withdraw securely to bank or local ATM channels.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => { setActiveModal('deposit'); resetForm(); }}
                className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 text-left text-white transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 group-hover:text-violet-300 transition-colors">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Deposit Funds</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Add credits to your account projection</p>
                </div>
              </button>

              <button
                onClick={() => { setActiveModal('withdraw'); resetForm(); }}
                className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5 text-left text-white transition-all group"
              >
                <div className="p-2.5 rounded-xl bg-fuchsia-600/10 text-fuchsia-400 group-hover:bg-fuchsia-600/20 group-hover:text-fuchsia-300 transition-colors">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Withdraw Cash</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Secure bank transfer or ATM cash out</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Balance PIN Prompt Modal */}
      {activeModal && activeModal === 'check_balance' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl relative glow-purple border-violet-500/20">
            <button
              onClick={() => { setActiveModal(null); resetForm(); }}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all duration-200"
              title="Close"
            >
              <X className="h-5.5 w-5.5" />
            </button>

            <h3 className="font-display font-bold text-xl text-white mb-2">
              Check Account Balance
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              Enter your 4-digit Transaction PIN to check your ledger balance.
            </p>

            {checkBalanceError && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="h-4.5 w-4.5" />
                <span>{checkBalanceError}</span>
              </div>
            )}

            <form onSubmit={handleCheckBalanceVerify} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
                  Transaction PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d*"
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-[1.5em] font-bold text-lg"
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setActiveModal(null); resetForm(); }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl transition-all border border-white/5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  {submitDisabled ? 'Verifying...' : 'Check Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Recharge Modal */}
      {activeModal && activeModal === 'recharge' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl relative glow-purple border-violet-500/20">
            {/* Close Button */}
            <button
              onClick={() => { setActiveModal(null); resetForm(); }}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all duration-200 z-10"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="h-5 w-5 text-amber-400" />
              <h3 className="font-display font-bold text-lg text-white">Mobile Recharge</h3>
            </div>
            <p className="text-[11px] text-gray-400 mb-6">
              Enter operator and plan details to process instant wallet-debit recharge.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMsg}</span>
              </div>
            )}

            {rechargeMutation.isPending ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Connecting to operator network...</p>
                  <p className="text-[10px] text-gray-500 font-mono">Gateway: {rechargeOperator.toUpperCase()} // Port: 8083</p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (rechargePhone.length !== 10 || !/^\d+$/.test(rechargePhone)) {
                    setErrorMsg('Please enter a valid 10-digit mobile number.');
                    return;
                  }
                  const amtVal = parseFloat(rechargeAmount);
                  if (isNaN(amtVal) || amtVal <= 0) {
                    setErrorMsg('Please enter a valid recharge amount.');
                    return;
                  }
                  if (pin.length !== 4 || !/^\d+$/.test(pin)) {
                    setErrorMsg('Please enter your 4-digit Transaction PIN.');
                    return;
                  }
                  rechargeMutation.mutate({
                    phone: rechargePhone,
                    oper: rechargeOperator,
                    amt: amtVal,
                    pinCode: pin
                  });
                }}
                className="space-y-4"
              >
                {/* 1. Mobile Number */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-500">
                      +91
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      required
                      value={rechargePhone}
                      onChange={(e) => setRechargePhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-amber-500/50 focus:outline-none text-white font-mono text-sm tracking-widest"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                {/* 2. Operator Selection */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Select Network Provider
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Jio', 'Airtel', 'VI'].map((op) => (
                      <button
                        type="button"
                        key={op}
                        onClick={() => {
                          setRechargeOperator(op);
                          const defaultAmt = op === 'Airtel' ? '319' : '299';
                          setRechargePlan(defaultAmt);
                          setRechargeAmount(defaultAmt);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                          rechargeOperator === op
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                            : 'bg-white/[0.02] border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {op === 'Jio' ? '🔵 Jio' : op === 'Airtel' ? '🔴 Airtel' : '🟡 VI'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Recommended Plans */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Recommended Operator Plans
                  </label>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {(rechargeOperator === 'Jio'
                      ? [
                          { val: '299', desc: '$299 - 1.5GB/Day Data + Unlimited Calls (28 Days)' },
                          { val: '719', desc: '$719 - 2.0GB/Day Data + Unlimited Calls (84 Days)' },
                          { val: '155', desc: '$155 - 1GB High Speed Data Topup (28 Days)' }
                        ]
                      : rechargeOperator === 'Airtel'
                      ? [
                          { val: '319', desc: '$319 - 2GB/Day Data + Hero Unlimited (1 Month)' },
                          { val: '839', desc: '$839 - 2GB/Day Data + Disney+ Hotstar (84 Days)' },
                          { val: '179', desc: '$179 - 2GB High Speed Data Topup (28 Days)' }
                        ]
                      : [
                          { val: '299', desc: '$299 - 1.5GB/Day + Binge All Night (28 Days)' },
                          { val: '479', desc: '$479 - 1.5GB/Day + Data Roll-over (56 Days)' }
                        ]
                    ).map((plan) => (
                      <button
                        type="button"
                        key={plan.val}
                        onClick={() => {
                          setRechargePlan(plan.val);
                          setRechargeAmount(plan.val);
                        }}
                        className={`w-full text-left p-3 rounded-xl text-xs flex flex-col gap-0.5 border transition-all ${
                          rechargePlan === plan.val
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-white/[0.01] border-white/5 text-gray-400 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="font-bold text-white">{plan.desc.split(' - ')[0]}</span>
                        <span className="text-[10px] text-gray-500">{plan.desc.split(' - ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Custom Amount */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Or Enter Custom Amount ($)
                  </label>
                  <input
                    type="text"
                    required
                    value={rechargeAmount}
                    onChange={(e) => {
                      setRechargeAmount(e.target.value.replace(/\D/g, ''));
                      setRechargePlan('');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-amber-500/50 focus:outline-none text-white font-mono text-xs"
                    placeholder="Enter Amount"
                  />
                </div>

                {/* 5. Transaction PIN */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Confirm Transaction PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="\d*"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-amber-500/50 focus:outline-none text-white font-mono text-center tracking-[1.5em] font-bold text-sm"
                    placeholder="••••"
                    autoComplete="new-password"
                  />
                </div>

                {/* 6. Platform Fee breakdown */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>Recharge Plan:</span>
                    <span>${parseFloat(rechargeAmount || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400">
                    <span>Platform Fee:</span>
                    <span>+$1.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1.5 mt-1">
                    <span>Total Debit:</span>
                    <span>${(parseFloat(rechargeAmount || '0') + 1.00).toFixed(2)}</span>
                  </div>
                </div>

                {/* Confirm Buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => { setActiveModal(null); resetForm(); }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl border border-white/5 text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
                  >
                    Pay ${(parseFloat(rechargeAmount || '0') + 1.00).toFixed(2)}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {activeModal && (activeModal === 'deposit' || activeModal === 'withdraw') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl relative glow-purple border-violet-500/20">
            <button
              onClick={() => { setActiveModal(null); resetForm(); }}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all duration-200"
              title="Leave / Close"
            >
              <X className="h-5.5 w-5.5" />
            </button>

            <h3 className="font-display font-bold text-xl text-white mb-2 capitalize">
              {activeModal} Funds
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              This request is guarded with end-to-end idempotency checking.
            </p>

            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-semibold text-gray-400">
                    {currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-20 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-medium"
                    placeholder="0.00"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="bg-[#111118] border border-white/5 rounded-lg text-xs font-bold text-gray-300 px-2 py-1.5 focus:outline-none"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Withdrawal Method Selection */}
              {activeModal === 'withdraw' && (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Withdrawal Method
                    </label>
                    <select
                      value={withdrawalChannel}
                      onChange={(e) => setWithdrawalChannel(e.target.value as 'BANK' | 'ATM')}
                      className="w-full px-4 py-3 rounded-xl bg-[#111118] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium focus:ring-1 focus:ring-violet-500/30"
                    >
                      <option value="BANK">Bank Wire Transfer</option>
                      <option value="ATM">ATM Cash Out</option>
                    </select>
                  </div>

                  {withdrawalChannel === 'ATM' && (
                    <div className="animate-fade-in">
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        ATM Verification Phone Number
                      </label>
                      <input
                        type="text"
                        required
                        value={atmPhoneNumber}
                        onChange={(e) => setAtmPhoneNumber(e.target.value)}
                        placeholder="e.g. +1234567890"
                        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium"
                      />
                      <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                        Must match your registered phone number.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Category Dropdown (Mainly for withdrawals) */}
              <div className="mb-4">
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#111118] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium focus:ring-1 focus:ring-violet-500/30"
                >
                  <option value="OTHERS">Others / General</option>
                  <option value="GROCERIES">Groceries</option>
                  <option value="ENTERTAINMENT">Entertainment & Leisure</option>
                  <option value="UTILITIES">Utilities & Bills</option>
                  <option value="RENT">Rent & Housing</option>
                  <option value="INVESTMENT">Investment & Savings</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  4-Digit Transaction PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d*"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-[1.5em] font-bold text-lg"
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => { setActiveModal(null); resetForm(); }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl transition-all border border-white/5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md text-sm"
                >
                  {submitDisabled ? 'Processing...' : `Confirm ${activeModal}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show My QR Code Modal */}
      {showQrModal && account && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl relative border border-white/10 shadow-2xl text-center space-y-6 glow-purple">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 pt-3">
              <h3 className="font-display font-black text-xl text-white">My PayVora QR</h3>
              <p className="text-xs text-gray-400">Scan to pay instantly via UPI Transfer</p>
            </div>

            {/* QR Code Wrapper */}
            <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-lg border-4 border-violet-500/25">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0b0b0f&data=${encodeURIComponent(
                  JSON.stringify({
                    name: account.fullName,
                    phone: account.phoneNumber || account.username, // mapping user as phone identifier
                    accountId: account.id
                  })
                )}`}
                alt="My Payment QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="space-y-1 bg-black/40 p-3 rounded-xl border border-white/5 text-xs">
              <p className="font-bold text-white">{account.fullName}</p>
              <p className="text-gray-400 font-mono">Username: {account.username}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-mono">ID: {account.id}</p>
            </div>

            <div className="flex gap-3">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `PAYVORA DIGITAL BANKING - INSTANT PAYMENT REQUEST\n\n` +
                  `Payee Name: ${account.fullName}\n` +
                  `Phone / Identifier: ${account.phoneNumber || account.username}\n` +
                  `Account ID: ${account.id}\n` +
                  `Issuing Bank: PayVora Neobank Core\n\n` +
                  `Send zero-fee instant payments directly via PayVora:\n` +
                  `${APP_PUBLIC_URL}/pay?recipient=${encodeURIComponent(account.phoneNumber || account.username)}\n\n` +
                  `----------------------------------------\n` +
                  `Secured & Processed by PayVora Event-Sourced Ledger`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>Share WhatsApp</span>
              </a>
              <button
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan QR Code Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl relative border border-white/10 shadow-2xl space-y-6">
            <button
              onClick={() => setShowScannerModal(false)}
              className="absolute right-4 top-4 p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 text-center pt-3">
              <h3 className="font-display font-black text-xl text-white">Scan QR Code</h3>
              <p className="text-xs text-gray-400">Upload a PayVora QR image to make a payment</p>
            </div>

            {qrScanError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{qrScanError}</span>
              </div>
            )}

            {/* File Upload Zone */}
            <label className="border-2 border-dashed border-white/15 hover:border-violet-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.01] transition-all text-center">
              <QrCode className="h-10 w-10 text-violet-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-white">Upload QR Code Image</p>
                <p className="text-[10px] text-gray-500 mt-1">Supports PNG, JPG, or Screenshots</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setShowScannerModal(false)}
              className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
