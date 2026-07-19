import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { 
  Calendar, ArrowLeftRight, Sparkles, CheckCircle2, AlertCircle, 
  User, FileText, Ban, RefreshCw
} from 'lucide-react';

interface ScheduledPayment {
  id: string;
  sourceAccountId: string;
  targetAccountId: string | null;
  amount: number;
  currency: string;
  category: string;
  frequency: string;
  paymentType: string;
  lastRunAt: string | null;
  nextRunAt: string;
  status: string;
  notes?: string;
}

export const RecurringScheduler: React.FC = () => {
  const queryClient = useQueryClient();
  const accountId = localStorage.getItem('accountId') || '';
  
  // Scheduled Payment Form States
  const [targetInput, setTargetInput] = useState(''); // Account UUID or Phone Number
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [category, setCategory] = useState('RENT');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [notes, setNotes] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [createError, setCreateError] = useState('');

  // Fetch Scheduled Payments
  const { data: payments = [], isLoading } = useQuery<ScheduledPayment[]>({
    queryKey: ['scheduledPayments', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/recurring/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  // Create Scheduled Payment Mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (payload: Partial<ScheduledPayment>) => {
      const response = await axiosInstance.post('/api/transactions/recurring', payload);
      return response.data;
    },
    onSuccess: () => {
      setCreateSuccess('Scheduled bank transfer established successfully!');
      setCreateError('');
      setAmount('');
      setTargetInput('');
      setScheduledDateTime('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['scheduledPayments', accountId] });
      setTimeout(() => setCreateSuccess(''), 4500);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to establish scheduled transfer.';
      setCreateError(msg);
    }
  });

  // Cancel Payment Mutation
  const cancelPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.post(`/api/transactions/recurring/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledPayments', accountId] });
      setCreateSuccess('Scheduled transfer cancelled successfully.');
      setTimeout(() => setCreateSuccess(''), 3000);
    },
    onError: () => {
      setCreateError('Failed to cancel scheduled transfer.');
      setTimeout(() => setCreateError(''), 3000);
    }
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!targetInput.trim()) {
      setCreateError("Recipient Account ID or Phone Number is required.");
      return;
    }

    if (!scheduledDateTime) {
      setCreateError("Schedule date and time is required.");
      return;
    }

    const scheduledDate = new Date(scheduledDateTime);
    if (scheduledDate <= new Date()) {
      setCreateError("Schedule time must be in the future.");
      return;
    }

    try {
      let targetAccountIdResolved = '';
      
      // Determine if target input is a phone number or UUID
      const isPhoneNumber = /^\+?[0-9\s\-]{7,15}$/.test(targetInput.trim());
      
      if (isPhoneNumber) {
        // Resolve phone number to Account ID
        const phoneRes = await axiosInstance.get('/api/accounts/by-phone', {
          params: { phoneNumber: targetInput.trim() }
        });
        
        if (!phoneRes.data || !phoneRes.data.id) {
          setCreateError("Recipient phone number is not registered on PayVora.");
          return;
        }
        
        if (phoneRes.data.kycStatus !== 'APPROVED') {
          setCreateError("Recipient must have completed KYC before receiving funds.");
          return;
        }
        
        targetAccountIdResolved = phoneRes.data.id;
      } else {
        // Assume UUID, check details
        try {
          const uuidRes = await axiosInstance.get(`/api/accounts/${targetInput.trim()}`);
          if (!uuidRes.data || !uuidRes.data.id) {
            setCreateError("Recipient Account ID not found.");
            return;
          }
          if (uuidRes.data.kycStatus !== 'APPROVED') {
            setCreateError("Recipient must have completed KYC before receiving funds.");
            return;
          }
          targetAccountIdResolved = uuidRes.data.id;
        } catch {
          setCreateError("Invalid Account ID. Ensure it is a valid UUID or registered Phone Number.");
          return;
        }
      }

      if (targetAccountIdResolved === accountId) {
        setCreateError("You cannot establish a scheduled transfer to your own account.");
        return;
      }

      const payload: Partial<ScheduledPayment> = {
        sourceAccountId: accountId,
        targetAccountId: targetAccountIdResolved,
        amount: parseFloat(amount),
        currency,
        category,
        frequency: 'ONCE',
        paymentType: 'TRANSFER',
        nextRunAt: scheduledDateTime.includes(':') && scheduledDateTime.split(':').length === 2 ? `${scheduledDateTime}:00` : scheduledDateTime,
        notes: notes.trim() || 'Scheduled Transfer'
      };
      
      createPaymentMutation.mutate(payload);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Error checking recipient validation details.');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400';
      case 'Processing':
        return 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse';
      case 'Completed':
        return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
      case 'Failed':
        return 'bg-rose-500/10 border border-rose-500/20 text-rose-400';
      case 'Cancelled':
        return 'bg-white/5 border border-white/10 text-gray-400';
      default:
        return 'bg-white/5 border border-white/10 text-gray-400';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Scheduled Transfers
        </h1>
        <p className="text-sm text-gray-400 mt-1">Set up automated future-dated bank transfers or trigger interest yields.</p>
      </div>

      {createSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5" />
          <span>{createSuccess}</span>
        </div>
      )}

      {createError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5" />
          <span>{createError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Scheduled Payments List & Savings Cron */}
        <div className="lg:col-span-2 space-y-8">
          

          {/* List of Payments */}
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-400" />
              <span>Upcoming Scheduled Transfers</span>
            </h2>

            {isLoading ? (
              <div className="h-48 w-full bg-white/5 rounded-3xl animate-pulse" />
            ) : payments.length === 0 ? (
              <div className="p-8 text-center rounded-3xl border border-dashed border-white/5 bg-white/[0.01]">
                <Calendar className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No scheduled transfers active. Set one up using the form.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => {
                  const canCancel = p.status === 'Scheduled';
                  
                  return (
                    <div 
                      key={p.id} 
                      className={`p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-white/5 text-gray-300">
                          <ArrowLeftRight className="h-5 w-5 text-violet-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <p className="text-sm font-semibold text-white uppercase tracking-tight">
                              Scheduled Transfer
                            </p>
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${getStatusBadgeClass(p.status)}`}>
                              {p.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 font-mono">
                            Recipient: {p.targetAccountId?.substring(0, 8)}...
                          </p>
                          {p.notes && (
                            <p className="text-[10px] text-gray-500 font-sans italic mt-1.5 flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />
                              <span>{p.notes}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-[10px] text-gray-500 mt-2 font-mono">
                            <span>Execute Date: {formatDate(p.nextRunAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-white font-mono">${p.amount.toFixed(2)}</p>
                          <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-widest mt-0.5">{p.category}</span>
                        </div>

                        {canCancel && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Are you sure you want to cancel this scheduled transfer?")) {
                                cancelPaymentMutation.mutate(p.id);
                              }
                            }}
                            disabled={cancelPaymentMutation.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                            title="Cancel Transfer"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Setup Scheduler Form */}
        <div>
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-600/10 rounded-full blur-3xl" />
            
            <div className="space-y-6">
              <h3 className="font-display font-semibold text-lg text-white">Create New Schedule</h3>
              
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Payment Action
                  </label>
                  <div className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-white text-xs font-semibold flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-violet-400" />
                    <span>Send Bank Transfer Only</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Recipient Account ID (UUID) or Phone Number
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      placeholder="e.g. 123e4567-e89b... or +919876543210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Execution Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-semibold text-gray-400 text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 text-white text-xs font-medium"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Transfer Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#111118] border border-white/5 focus:border-violet-500/50 text-white text-xs font-medium"
                  >
                    <option value="RENT">Rent & Housing</option>
                    <option value="GROCERIES">Groceries</option>
                    <option value="ENTERTAINMENT">Entertainment</option>
                    <option value="UTILITIES">Utilities & Bills</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="OTHERS">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Description / Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Monthly rent allowance"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-[0_4px_20px_rgba(139,92,246,0.2)] mt-6 text-xs disabled:opacity-50"
                >
                  {createPaymentMutation.isPending ? 'Scheduling...' : 'Confirm & Schedule Transfer'}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
