import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { 
  Gift, Trophy, Coins, Compass, Sparkles,
  Calendar, AlertCircle, CheckCircle2,
  Play, Award, Zap, UserPlus, Check, TrendingUp, Lock, X
} from 'lucide-react';

interface RewardWallet {
  userId: string;
  cashbackBalance: number;
  totalCashbackEarned: number;
  cashbackUsed: number;
  loyaltyPoints: number;
  loyaltyLevel: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  updatedAt: string;
  checkinStreak: number;
  claimedToday?: boolean;
  spunToday?: boolean;
}

interface CashbackOffer {
  id: string;
  title: string;
  description: string;
  transactionType: string;
  minAmount: number;
  cashbackPercentage: number;
  fixedCashback: number;
  maxCashback: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface CashbackTransaction {
  id: string;
  userId: string;
  transactionId: string | null;
  cashbackAmount: number;
  offerId: string | null;
  status: string;
  creditedAt: string;
  expiresAt: string | null;
}

export const Rewards: React.FC = () => {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState<string>(() => localStorage.getItem('accountId') || '');
  const [userRole, setUserRole] = useState<string>('');
  
  // Tab control: 'USER' | 'ADMIN'
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN'>('USER');

  // Input states for redemption
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState('');



  // Admin offer creator states
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [offerType, setOfferType] = useState('TRANSFER');
  const [minAmt, setMinAmt] = useState('10.00');
  const [cbPercent, setCbPercent] = useState('0');
  const [fixedCb, setFixedCb] = useState('1.00');
  const [maxCb, setMaxCb] = useState('5.00');
  const [adminOfferSuccess, setAdminOfferSuccess] = useState('');
  const [showReferredModal, setShowReferredModal] = useState(false);

  // Extract accountId & admin role from JWT
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedId = localStorage.getItem('accountId');
    if (storedId) {
      setAccountId(storedId);
    }
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const tokenRole = payload.role;
        const tokenRoles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
        if (tokenRole === 'ROLE_ADMIN' || tokenRole === 'ADMIN' || 
            tokenRoles.includes('ROLE_ADMIN') || tokenRoles.includes('ADMIN')) {
          setUserRole('ADMIN');
        }
      } catch (e) {
        console.error('Failed to parse token details', e);
      }
    }
  }, []);

  // 1. Fetch user's Reward Wallet
  const { data: wallet, refetch: refetchWallet } = useQuery<RewardWallet>({
    queryKey: ['rewards-wallet', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/rewards/wallet?userId=${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch Account Data to get referral code
  const { data: account } = useQuery<any>({
    queryKey: ['accountInfo'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/me');
      return response.data;
    }
  });

  // Fetch Referred Users list
  const { data: referredUsers = [], refetch: refetchReferredUsers } = useQuery<any[]>({
    queryKey: ['referredUsers'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/referred-users');
      return response.data;
    }
  });

  // 2. Fetch Active Cashback Offers
  const { data: activeOffers = [], refetch: refetchOffers } = useQuery<CashbackOffer[]>({
    queryKey: ['rewards-offers'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/rewards/offers');
      return response.data;
    },
  });

  // 3. Fetch All Cashback Offers (for title resolution & history)
  const { data: allOffers = [], refetch: refetchAllOffers } = useQuery<CashbackOffer[]>({
    queryKey: ['rewards-admin-offers'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/rewards/admin/offers');
      return response.data;
    },
  });

  // 4. Fetch User Cashback History
  const { data: cbHistory = [], refetch: refetchHistory } = useQuery<CashbackTransaction[]>({
    queryKey: ['rewards-history', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/rewards/history?userId=${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // 5. Fetch Admin Analytics
  const { data: analytics, refetch: refetchAnalytics } = useQuery<any>({
    queryKey: ['rewards-admin-analytics'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/rewards/admin/analytics');
      return response.data;
    },
    enabled: userRole === 'ADMIN',
  });





  // 6. Redeem Cashback Mutation
  const redeemMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await axiosInstance.post(`/api/rewards/redeem?userId=${accountId}&amount=${amount}`);
      return response.data;
    },
    onSuccess: (data) => {
      setRedeemSuccess(data.message || 'Redemption successful!');
      setRedeemAmount('');
      refetchWallet();
      refetchHistory();
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      setTimeout(() => setRedeemSuccess(''), 4000);
    },
    onError: (err: any) => {
      setRedeemError(err.response?.data?.message || 'Failed to redeem cashback. Make sure your KYC is APPROVED.');
      setTimeout(() => setRedeemError(''), 4000);
    }
  });



  // 8. Create Offer Mutation (Admin)
  const createOfferMutation = useMutation({
    mutationFn: async (newOffer: Partial<CashbackOffer>) => {
      const response = await axiosInstance.post('/api/rewards/admin/offers', newOffer);
      return response.data;
    },
    onSuccess: () => {
      setAdminOfferSuccess('Campaign created successfully!');
      setOfferTitle('');
      setOfferDesc('');
      refetchOffers();
      refetchAllOffers();
      refetchAnalytics();
      setTimeout(() => setAdminOfferSuccess(''), 4000);
    }
  });

  // 9. Toggle Offer Mutation (Admin)
  const toggleOfferMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await axiosInstance.post(`/api/rewards/admin/offers/${id}/toggle?active=${active}`);
      return response.data;
    },
    onSuccess: () => {
      refetchOffers();
      refetchAllOffers();
      refetchAnalytics();
    }
  });

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(redeemAmount);
    if (isNaN(amt) || amt <= 0) {
      setRedeemError('Please enter a valid amount.');
      return;
    }
    if (wallet && amt > wallet.cashbackBalance) {
      setRedeemError('Insufficient cashback balance.');
      return;
    }
    redeemMutation.mutate(amt);
  };



  const handleAdminOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOffer = {
      title: offerTitle,
      description: offerDesc,
      transactionType: offerType,
      minAmount: parseFloat(minAmt),
      cashbackPercentage: parseFloat(cbPercent),
      fixedCashback: parseFloat(fixedCb),
      maxCashback: parseFloat(maxCb),
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      active: true
    };
    createOfferMutation.mutate(newOffer);
  };

  if (false as any) {
    console.log(Calendar, AlertCircle, Play, Zap, UserPlus, Lock, X, activeTab, setActiveTab, setOfferType, setMinAmt, setCbPercent, setFixedCb, setMaxCb, adminOfferSuccess, refetchReferredUsers, allOffers, analytics, toggleOfferMutation, handleAdminOfferSubmit);
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      


      {/* Rewards Page Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-r from-violet-950/60 via-indigo-950/60 to-fuchsia-950/60 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl glow-purple">
        <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 z-10 text-center md:text-left">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 p-[3px] shadow-[0_0_25px_rgba(124,58,237,0.45)] flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-[#0a0a0e] flex items-center justify-center text-violet-400">
                <Gift className="h-8 w-8 text-violet-300" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="font-display font-black text-3xl text-white tracking-tight">
              Cashback & Rewards
            </h2>
            <p className="text-sm text-gray-300 max-w-lg leading-relaxed">
              Earn real-time cash credits on ledger transactions, claim cashback on recharges and transfers, and manage your rewards!
            </p>
          </div>
        </div>
      </div>

      {/* Stats Analytics Dashboard Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between relative overflow-hidden bg-[#0c0c14]/90 glow-purple">
          <div className="absolute right-4 top-4 w-9 h-9 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Coins className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Cashback</span>
          <p className="font-display font-black text-3xl text-white mt-3 font-mono">
            ${wallet?.cashbackBalance.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between relative overflow-hidden bg-[#0c0c14]/90">
          <div className="absolute right-4 top-4 w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Trophy className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Cashback Earned</span>
          <p className="font-display font-black text-3xl text-white mt-3 font-mono">
            ${wallet?.totalCashbackEarned.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between relative overflow-hidden bg-[#0c0c14]/90">
          <div className="absolute right-4 top-4 w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cashback Redeemed</span>
          <p className="font-display font-black text-3xl text-white mt-3 font-mono">
            ${wallet?.cashbackUsed.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Streaks and Daily check-ins */}
        <div className="lg:col-span-2 space-y-8">
          


          {/* Active Cashback Campaigns */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0c0c14]/90 space-y-5">
            <h3 className="font-display font-black text-lg text-white flex items-center gap-2">
              <Compass className="h-5 w-5 text-violet-400" />
              <span>Available Cashback Offers</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(() => {
                const visibleOffers = activeOffers.filter(offer => {
                  const offerIdLower = String(offer.id).toLowerCase();
                  const alreadyClaimed = cbHistory.some(tx => {
                    if (!tx.offerId) return false;
                    return String(tx.offerId).toLowerCase() === offerIdLower;
                  });
                  if (alreadyClaimed) {
                    return false;
                  }
                  if (offerIdLower === '77777777-7777-7777-7777-777777777777') {
                    return false;
                  }
                  return true;
                });
                
                if (visibleOffers.length === 0) {
                  return (
                    <div className="col-span-2 py-8 text-center text-gray-500 text-xs border border-dashed border-white/5 rounded-2xl w-full">
                      No additional transaction offers available at this time.
                    </div>
                  );
                }
                
                return visibleOffers.map((offer) => (
                  <div key={offer.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/[0.02] transition-all flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-violet-600/10 border border-violet-500/30 text-violet-300 w-fit block">
                        {offer.transactionType}
                      </span>
                      <h4 className="font-black text-white text-sm mt-1">{offer.title}</h4>
                      <p className="text-xs text-gray-300 leading-relaxed">{offer.description}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                      <span className="text-xs text-gray-400 font-mono">Min Tx: ${offer.minAmount}</span>
                      <span className="text-xs font-black text-emerald-400">
                        {offer.fixedCashback > 0 ? `$${offer.fixedCashback.toFixed(2)} Fixed` : `${offer.cashbackPercentage}% Cashback`}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
              
            {/* Referral promo banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-tr from-violet-600/15 via-fuchsia-600/15 to-indigo-950/15 border border-violet-500/30 flex flex-col justify-between gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-fuchsia-600/10 border border-fuchsia-500/30 text-fuchsia-300 w-fit block">REFERRAL</span>
                <h4 className="font-black text-white text-sm mt-1">Loyalty Invitation Program</h4>
                <p className="text-xs text-gray-300 leading-relaxed">Invite a friend to open their digital neobank wallet and earn a $10.00 cash bonus when they verify their KYC status.</p>
              </div>

               <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                <span className="text-xs text-gray-200 font-mono font-bold uppercase tracking-wider bg-black/40 border border-white/5 px-2.5 py-1 rounded-lg">
                  {account?.referralCode || 'REF-PENDING'}
                </span>
                 <div className="flex items-center gap-3.5">
                  <button
                    onClick={() => {
                      const code = account?.referralCode || 'REF-PENDING';
                      navigator.clipboard.writeText(code);
                      alert('Referral invitation code copied to clipboard!');
                    }}
                    className="text-[10px] font-black text-white uppercase tracking-wider hover:text-violet-300 transition-colors"
                  >
                    Copy Code
                  </button>
                  <button
                    onClick={() => setShowReferredModal(true)}
                    className="text-[10px] font-black text-violet-400 uppercase tracking-wider hover:text-violet-300 transition-colors"
                  >
                    My Invites ({referredUsers.length})
                  </button>
                </div>
              </div>
            </div>

          </div>



        </div>

        {/* Right Column: Scratch cards, Spin the wheel, manual redemption */}
        <div className="space-y-8">
          
          {/* Manual Redemption */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0c0c14]/90 space-y-5">
            <div className="space-y-1">
              <span className="text-[10px] text-violet-400 uppercase tracking-widest font-black block">Balance Transfer</span>
              <h3 className="font-display font-black text-lg text-white">Redeem to Wallet</h3>
            </div>

            {redeemError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-350 text-xs font-semibold">
                {redeemError}
              </div>
            )}
            {redeemSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-350 text-xs font-semibold">
                {redeemSuccess}
              </div>
            )}

            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  placeholder="e.g. 5.00"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={redeemMutation.isPending}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {redeemMutation.isPending ? 'Redeeming...' : 'Confirm Redemption'}
              </button>
            </form>
          </div>





        </div>

      </div>

      {/* Referred Users Modal */}
      {showReferredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-white/10 bg-[#0e0e16]/95 shadow-[0_10px_50px_rgba(0,0,0,0.5)] space-y-5">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-fuchsia-400" />
                <h3 className="font-display font-black text-lg text-white">Referred Joiners</h3>
              </div>
              <button
                onClick={() => setShowReferredModal(false)}
                className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-wider"
              >
                Close
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
              {referredUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs">
                  No friends have signed up using your code yet.
                </div>
              ) : (
                referredUsers.map((user, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{user.fullName}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5 font-bold">@{user.username}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        user.kycStatus === 'APPROVED' 
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-450' 
                          : user.kycStatus === 'REJECTED'
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-450'
                            : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                      }`}>
                        {user.kycStatus === 'APPROVED' ? 'KYC Approved' : user.kycStatus === 'REJECTED' ? 'KYC Failed' : 'KYC Pending'}
                      </span>
                      {user.kycStatus === 'APPROVED' && (
                        <span className="text-[10px] text-emerald-400 font-black block mt-1">+$10.00 Credited</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <p className="text-[10px] text-gray-500 text-center leading-relaxed">
              Rewards are credited instantly to your Rewards wallet once your friends complete their KYC verification successfully.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
