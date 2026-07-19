import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { User, Calendar, ShieldAlert, ShieldCheck, Copy, Check } from 'lucide-react';

interface AccountData {
  id: string;
  email: string;
  fullName: string;
  username: string;
  kycStatus: string;
  status: string;
  phoneNumber?: string;
  createdAt?: string;
  kycDocumentType?: string;
  kycDocumentNumber?: string;
}

export const Profile: React.FC = () => {
  const accountId = localStorage.getItem('accountId') || '';
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch Account Details
  const { data: account } = useQuery<AccountData>({
    queryKey: ['accountInfo'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/me');
      return response.data;
    }
  });

  // Delete Account Mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.delete('/api/accounts/me');
      return response.data;
    },
    onSuccess: () => {
      localStorage.clear();
      window.location.href = '/login';
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to delete account.';
      alert(typeof msg === 'string' ? msg : 'Failed to delete account.');
    }
  });

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Get Initials for Avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Cover Profile Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-violet-950/40 via-fuchsia-950/20 to-[#0e0e12]/80 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-fuchsia-600/10 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row items-center gap-6 z-10">
          {/* Large Hero Initials Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[3px] shadow-[0_0_30px_rgba(124,58,237,0.4)]">
              <div className="w-full h-full rounded-full bg-[#0b0b0f] flex items-center justify-center">
                <span className="font-display font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">
                  {getInitials(account?.fullName)}
                </span>
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[#0b0b0f] shadow-md" title="Account Status: Active" />
          </div>

          <div className="text-center md:text-left space-y-1.5">
            <h2 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight leading-none">
              {account?.fullName || 'Loading Profile...'}
            </h2>
            <p className="text-sm font-semibold text-violet-400 font-mono tracking-wider">
              @{account?.username || 'username'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
              {account?.kycStatus === 'APPROVED' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  KYC Verified
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  KYC Pending
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                {account?.status || 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>

        {/* Total Ledger Registration Date card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 text-center min-w-[180px] z-10 shrink-0 self-center md:self-auto bg-black/40">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Ledger Registered</span>
          <p className="font-mono text-base font-black text-white mt-1.5">
            {account?.createdAt ? new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="space-y-6">
        <div className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
          Profile Attributes Registry
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Full Name card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 hover:border-violet-500/30 transition-all duration-300 flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest block">Full Name</span>
                <p className="text-lg font-bold text-white uppercase tracking-wide">{account?.fullName || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 transition-all">
                <User className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Email Address card */}
          <div 
            onClick={() => account?.email && handleCopy(account.email, 'email')}
            className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 hover:border-violet-500/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer relative"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 overflow-hidden">
                <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest block">Email Address</span>
                <p className="text-lg font-mono font-bold text-white truncate select-all">{account?.email || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 transition-all shrink-0">
                {copiedField === 'email' ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
              </div>
            </div>
            {copiedField === 'email' && (
              <span className="absolute bottom-2 right-4 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Copied!</span>
            )}
          </div>

          {/* Phone Number card */}
          <div 
            onClick={() => account?.phoneNumber && handleCopy(account.phoneNumber, 'phone')}
            className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 hover:border-violet-500/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer relative"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest block">Phone Number</span>
                <p className="text-lg font-mono font-bold text-white select-all">{account?.phoneNumber || 'Not Registered'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 transition-all">
                {copiedField === 'phone' ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
              </div>
            </div>
            {copiedField === 'phone' && (
              <span className="absolute bottom-2 right-4 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Copied!</span>
            )}
          </div>

          {/* Membership Date card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 hover:border-violet-500/30 transition-all duration-300 flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest block">Membership Date</span>
                <p className="text-lg font-bold text-white">{formatDate(account?.createdAt)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 transition-all">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Registered Account ID card */}
          <div 
            onClick={() => accountId && handleCopy(account?.id || accountId, 'uuid')}
            className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 hover:border-violet-500/30 transition-all duration-300 md:col-span-2 flex flex-col justify-between group cursor-pointer relative"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5 overflow-hidden">
                <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest block">Registered Account ID (UUID)</span>
                <p className="text-sm font-mono font-bold text-gray-200 truncate select-all">{account?.id || accountId}</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 transition-all shrink-0">
                {copiedField === 'uuid' ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
              </div>
            </div>
            {copiedField === 'uuid' && (
              <span className="absolute bottom-2 right-4 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Copied!</span>
            )}
          </div>

          {/* KYC Document number card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-[#12121a]/85 hover:border-violet-500/30 transition-all duration-300 md:col-span-2 flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-extrabold text-violet-400 tracking-widest block">KYC Verification Document Details</span>
                <p className="text-base font-bold text-white">
                  {account?.kycDocumentType ? `${account.kycDocumentType} - #${account.kycDocumentNumber || 'N/A'}` : 'No documents verified'}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20 transition-all">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="glass-panel p-6 rounded-3xl relative overflow-hidden border border-rose-500/20 mt-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 rounded-full blur-3xl" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h3 className="font-display font-bold text-lg text-rose-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 shrink-0 animate-pulse" />
              <span>Danger Zone: Delete Account</span>
            </h3>
            <p className="text-xs text-gray-400 leading-normal">
              Permanently delete your profile, auth credentials, and wallet settings. This action is irreversible.
              All active projections and balances will be completely cleared from the ledger registers.
            </p>
          </div>
          
          <button
            onClick={() => {
              if (window.confirm("WARNING: This will permanently delete your wallet account and log you out. Are you sure you want to proceed?")) {
                deleteAccountMutation.mutate();
              }
            }}
            disabled={deleteAccountMutation.isPending}
            className="px-5 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all disabled:opacity-50 shrink-0"
          >
            {deleteAccountMutation.isPending ? 'Deleting Account...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
