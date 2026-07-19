import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { 
  CreditCard, Eye, EyeOff, Snowflake, Flame, Plus, 
  CheckCircle2, AlertCircle, ShoppingCart, X, Lock,
  Search, Grid, List, HelpCircle,
  Compass, Zap, Gamepad2, Tv, Utensils, Home
} from 'lucide-react';

interface VirtualCard {
  id: string;
  accountId: string;
  cardNumber: string;
  cardholderName: string;
  cvv: string;
  expiryDate: string;
  status: string;
  cardLimit: number;
  spentAmount?: number;
  createdAt: string;
  colorTheme?: string;
  isSingleUse?: boolean;
  singleUse?: boolean;
  cardNickname?: string;
}

const getCardCategoryDetails = (nickname: string = '') => {
  const name = nickname.toLowerCase();
  if (name.includes('netflix') || name.includes('spotify') || name.includes('hulu') || name.includes('sub') || name.includes('prime') || name.includes('disney')) {
    return {
      icon: <Tv className="h-4.5 w-4.5 text-violet-400" />,
      label: 'Subscriptions',
      textColor: 'text-violet-400',
      badgeBg: 'bg-violet-500/10 border-violet-500/20'
    };
  }
  if (name.includes('food') || name.includes('dining') || name.includes('eat') || name.includes('restaurant') || name.includes('utensils') || name.includes('cafe')) {
    return {
      icon: <Utensils className="h-4.5 w-4.5 text-rose-400" />,
      label: 'Food & Dining',
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 border-rose-500/20'
    };
  }
  if (name.includes('grocery') || name.includes('groceries') || name.includes('market') || name.includes('shop')) {
    return {
      icon: <ShoppingCart className="h-4.5 w-4.5 text-emerald-400" />,
      label: 'Groceries & Shopping',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/20'
    };
  }
  if (name.includes('travel') || name.includes('flight') || name.includes('trip') || name.includes('hotel') || name.includes('map') || name.includes('compass')) {
    return {
      icon: <Compass className="h-4.5 w-4.5 text-sky-400" />,
      label: 'Travel & Transport',
      textColor: 'text-sky-400',
      badgeBg: 'bg-sky-500/10 border-sky-500/20'
    };
  }
  if (name.includes('bill') || name.includes('electric') || name.includes('power') || name.includes('water') || name.includes('zap') || name.includes('utility')) {
    return {
      icon: <Zap className="h-4.5 w-4.5 text-amber-400" />,
      label: 'Utilities & Bills',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/20'
    };
  }
  if (name.includes('rent') || name.includes('home') || name.includes('house') || name.includes('stay')) {
    return {
      icon: <Home className="h-4.5 w-4.5 text-teal-400" />,
      label: 'Rent & Lodging',
      textColor: 'text-teal-400',
      badgeBg: 'bg-teal-500/10 border-teal-500/20'
    };
  }
  if (name.includes('game') || name.includes('steam') || name.includes('play') || name.includes('xbox') || name.includes('fun')) {
    return {
      icon: <Gamepad2 className="h-4.5 w-4.5 text-pink-400" />,
      label: 'Gaming & Fun',
      textColor: 'text-pink-400',
      badgeBg: 'bg-pink-500/10 border-pink-500/20'
    };
  }
  return {
    icon: <CreditCard className="h-4.5 w-4.5 text-gray-400" />,
    label: 'General Spending',
    textColor: 'text-gray-400',
    badgeBg: 'bg-white/5 border-white/5'
  };
};

export const Cards: React.FC = () => {
  const queryClient = useQueryClient();
  const accountId = localStorage.getItem('accountId') || '';
  
  // Visibility State for card details
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  // View States
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MULTI' | 'SINGLE' | 'FROZEN'>('ALL');
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // PIN verification states for card reveal
  const [cardIdToUnlock, setCardIdToUnlock] = useState<string | null>(null);
  const [pinAction, setPinAction] = useState<'reveal' | 'freeze' | 'terminate' | null>(null);
  const [pinPrompt, setPinPrompt] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  
  // Card Creation Form States
  const [cardholderName, setCardholderName] = useState('');
  const [cardLimit, setCardLimit] = useState('5000.00');
  const [cardNickname, setCardNickname] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [colorTheme, setColorTheme] = useState('midnight');
  const [isSingleUse, setIsSingleUse] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Payment Simulator Form States
  const [simCardNumber, setSimCardNumber] = useState('');
  const [simCvv, setSimCvv] = useState('');
  const [simExpiry, setSimExpiry] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simPaymentChannel, setSimPaymentChannel] = useState<'ONLINE' | 'CONTACTLESS'>('ONLINE');
  const [simSuccessMsg, setSimSuccessMsg] = useState('');
  const [simErrorMsg, setSimErrorMsg] = useState('');

  // Card Custom 4-digit PIN setup states
  const [cardIdForPinSetup, setCardIdForPinSetup] = useState<string | null>(null);
  const [newCardPin, setNewCardPin] = useState('');
  const [cardPinError, setCardPinError] = useState('');
  const [cardPinSuccess, setCardPinSuccess] = useState('');

  const handleUpdateCardPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardIdForPinSetup) return;
    if (newCardPin.length !== 4 || !/^\d+$/.test(newCardPin)) {
      setCardPinError('PIN must be exactly 4 digits.');
      return;
    }
    try {
      await axiosInstance.post(`/api/transactions/cards/${cardIdForPinSetup}/pin?pin=${newCardPin}`);
      setCardPinSuccess('Card PIN updated successfully!');
      setNewCardPin('');
      setCardPinError('');
      queryClient.invalidateQueries({ queryKey: ['cards', accountId] });
      setTimeout(() => {
        setCardPinSuccess('');
        setCardIdForPinSetup(null);
      }, 1500);
    } catch (err) {
      setCardPinError('Failed to update card PIN. Please try again.');
    }
  };

  // Fetch Account Details (to get username)
  const { data: account } = useQuery({
    queryKey: ['accountInfo', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/accounts/me');
      return response.data;
    },
    enabled: !!accountId
  });
  
  // Fetch Virtual Cards
  const { data: cards = [], isLoading } = useQuery<VirtualCard[]>({
    queryKey: ['cards', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/cards/${accountId}`);
      return response.data;
    },
    enabled: !!accountId
  });

  // Create Virtual Card Mutation
  const createCardMutation = useMutation({
    mutationFn: async (payload: { accountId: string; cardholderName: string; cardLimit: number; colorTheme: string; isSingleUse: boolean; cardNickname: string }) => {
      const response = await axiosInstance.post('/api/transactions/cards', payload);
      return response.data;
    },
    onSuccess: () => {
      setCreateSuccess('Virtual card generated successfully!');
      setCardholderName('');
      setCardNickname('');
      setIsSingleUse(false);
      setColorTheme('midnight');
      queryClient.invalidateQueries({ queryKey: ['cards', accountId] });
      setTimeout(() => setCreateSuccess(''), 4000);
    }
  });

  // Toggle Freeze Mutation
  const toggleFreezeMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const response = await axiosInstance.post(`/api/transactions/cards/${cardId}/toggle-freeze`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', accountId] });
    }
  });

  // Terminate Card Mutation
  const terminateCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const response = await axiosInstance.post(`/api/transactions/cards/${cardId}/terminate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', accountId] });
    }
  });

  // Process Simulated Payment Mutation
  const payMutation = useMutation({
    mutationFn: async (payload: { cardId: string; cardNumber: string; cvv: string; expiryDate: string; amount: number; paymentChannel?: string }) => {
      const response = await axiosInstance.post(`/api/transactions/cards/${payload.cardId}/pay`, payload);
      return response.data;
    },
    onSuccess: () => {
      setSimSuccessMsg('Simulated transaction completed successfully! Balance debited.');
      setSimErrorMsg('');
      setSimAmount('');
      // Invalidate balance and card queries (disposable card may terminate)
      queryClient.invalidateQueries({ queryKey: ['balance', accountId] });
      queryClient.invalidateQueries({ queryKey: ['cards', accountId] });
      setTimeout(() => setSimSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.errorMessage || 'Payment declined. Please check details or limits.';
      setSimErrorMsg(errMsg);
      setSimSuccessMsg('');
    }
  });

  const handleCreateCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCardMutation.mutate({
      accountId,
      cardholderName: cardholderName.trim(),
      cardLimit: parseFloat(cardLimit),
      colorTheme,
      isSingleUse,
      cardNickname: cardNickname.trim()
    });
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCard = cards.find(c => c.cardNumber === simCardNumber.replace(/\s+/g, ''));
    if (!matchedCard) {
      setSimErrorMsg('Card number not found. Please copy card details.');
      return;
    }

    payMutation.mutate({
      cardId: matchedCard.id,
      cardNumber: simCardNumber.replace(/\s+/g, ''),
      cvv: simCvv.trim(),
      expiryDate: simExpiry.trim(),
      amount: parseFloat(simAmount),
      paymentChannel: simPaymentChannel
    });
  };

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.username || !cardIdToUnlock || !pinAction) return;
    if (pinPrompt.length !== 4) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    setIsVerifyingPin(true);
    setPinError('');
    try {
      const response = await axiosInstance.post(
        `/api/accounts/pin/verify?username=${encodeURIComponent(account.username)}&pin=${encodeURIComponent(pinPrompt)}`
      );
      if (response.data === true) {
        const targetId = cardIdToUnlock;
        
        if (pinAction === 'reveal') {
          setRevealedCards(prev => ({
            ...prev,
            [targetId]: true
          }));
          
          // Auto-hide card details after 30 seconds
          setTimeout(() => {
            setRevealedCards(prev => ({
              ...prev,
              [targetId]: false
            }));
          }, 30000);
        } else if (pinAction === 'freeze') {
          toggleFreezeMutation.mutate(targetId);
        } else if (pinAction === 'terminate') {
          terminateCardMutation.mutate(targetId);
        }
        
        setCardIdToUnlock(null);
        setPinAction(null);
        setPinPrompt('');
      } else {
        setPinError('Incorrect PIN. Please try again.');
        setPinPrompt('');
      }
    } catch (err) {
      setPinError('Failed to verify PIN. Please try again.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const toggleReveal = (id: string) => {
    if (revealedCards[id]) {
      setRevealedCards(prev => ({ ...prev, [id]: false }));
    } else {
      setCardIdToUnlock(id);
      setPinAction('reveal');
      setPinPrompt('');
      setPinError('');
    }
  };

  const triggerFreezePin = (id: string) => {
    setCardIdToUnlock(id);
    setPinAction('freeze');
    setPinPrompt('');
    setPinError('');
  };

  const triggerTerminatePin = (id: string) => {
    setCardIdToUnlock(id);
    setPinAction('terminate');
    setPinPrompt('');
    setPinError('');
  };

  const formatCardNumber = (no: string, reveal: boolean) => {
    if (!reveal) {
      return `•••• •••• •••• ${no.substring(12)}`;
    }
    return no.replace(/(.{4})/g, '$1 ').trim();
  };

  // Card Color Theme details
  const getThemeDetails = (theme?: string) => {
    switch (theme) {
      case 'cyberpunk':
        return {
          cardClass: 'border-pink-500/20 bg-gradient-to-br from-[#2a0845] to-[#6441a5]',
          glow: 'from-cyan-400 to-pink-500',
          badgeBg: 'bg-pink-500/10 text-pink-400 border-pink-500/20'
        };
      case 'rosegold':
        return {
          cardClass: 'border-amber-500/10 bg-gradient-to-br from-[#3e2723] via-[#2d1500] to-[#1a0c00]',
          glow: 'from-amber-200 via-rose-300 to-orange-300',
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        };
      case 'emerald':
        return {
          cardClass: 'border-emerald-500/20 bg-gradient-to-br from-[#064e3b]/40 via-[#0a1b18] to-[#022c22]/40',
          glow: 'from-emerald-400 to-teal-300',
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        };
      default: // midnight
        return {
          cardClass: 'border-violet-500/20 bg-gradient-to-br from-[#1c1236] to-[#0d091a]',
          glow: 'from-violet-400 to-fuchsia-400',
          badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
        };
    }
  };

  // Filtering cards list
  const activeCards = cards.filter(c => c.status !== 'TERMINATED');
  
  const filteredCards = activeCards.filter(card => {
    // Type Filter
    const isSingle = card.isSingleUse || card.singleUse;
    if (filterType === 'MULTI' && isSingle) return false;
    if (filterType === 'SINGLE' && !isSingle) return false;
    if (filterType === 'FROZEN' && card.status !== 'FROZEN') return false;

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchHolder = card.cardholderName.toLowerCase().includes(q);
      const matchNo = card.cardNumber.includes(q);
      const matchNickname = card.cardNickname?.toLowerCase().includes(q);
      return matchHolder || matchNo || matchNickname;
    }
    return true;
  });


  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Premium Unified Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-slate-900/60 via-violet-950/20 to-[#0e0e12]/80 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row items-center gap-6 z-10">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[3px] shadow-[0_0_25px_rgba(124,58,237,0.35)] flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-[#0b0b0f] flex items-center justify-center text-violet-400">
                <CreditCard className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="text-center md:text-left space-y-1">
            <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
              Virtual Debit Cards
            </h2>
            <p className="text-xs text-gray-400 max-w-md leading-normal">
              Generate customizable, secure virtual Visa cards linked to your primary account ledger instantly.
            </p>
          </div>
        </div>

        {/* Action Controls & Simulator Toggle */}
        <div className="flex items-center gap-3 z-10 self-center md:self-auto shrink-0">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 shadow-md">
            <span className="text-xs font-bold text-gray-300">Sandbox Mode</span>
            <button
              type="button"
              onClick={() => setIsSandboxMode(!isSandboxMode)}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isSandboxMode ? 'bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-white/10'}`}
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSandboxMode ? 'translate-x-4.5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      </div>

      {createSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>{createSuccess}</span>
        </div>
      )}

      {/* Main Grid: Left is Cards List, Right is Creation Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Side: Cards Inventory */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Inventory Controls Panel */}
          <div className="glass-panel p-4 rounded-3xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search cardholder or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 self-stretch sm:self-auto overflow-x-auto">
              {(['ALL', 'MULTI', 'SINGLE', 'FROZEN'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${filterType === type ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  {type === 'MULTI' ? 'Multi-Use' : type === 'SINGLE' ? 'Single-Use' : type === 'FROZEN' ? 'Frozen' : 'All'}
                </button>
              ))}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/5 self-end sm:self-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* Cards Display Grid/List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-52 bg-white/5 rounded-3xl animate-pulse" />
              <div className="h-52 bg-white/5 rounded-3xl animate-pulse" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-white/5 bg-white/[0.01]">
              <CreditCard className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-400">No active virtual cards match your filters.</p>
              <p className="text-xs text-gray-500 mt-1">Configure your card settings on the right panel to generate a new card.</p>
            </div>
          ) : viewMode === 'grid' ? (
            // Grid View: Horizontal Swipeable Card Carousel Deck
            <div className="space-y-6">
              {/* Floating Active Card Category Header Panel */}
              {(() => {
                const safeIndex = Math.min(activeCardIndex, filteredCards.length - 1);
                const focusedCard = filteredCards[safeIndex >= 0 ? safeIndex : 0];
                if (!focusedCard) return null;

                const isSingle = focusedCard.isSingleUse || focusedCard.singleUse;
                const nickname = focusedCard.cardNickname || 'Virtual Card';
                const category = getCardCategoryDetails(nickname);

                return (
                  <div className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-3xl p-5 mb-4 animate-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl" />
                    
                    <div className="flex items-center gap-4 z-10">
                      <div className="p-3 rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                        {category.icon}
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Card Category</span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border leading-none ${category.textColor} ${category.badgeBg}`}>
                            {category.label}
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-white tracking-tight flex items-center gap-2">
                          <span>{nickname}</span>
                          {isSingle && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded font-black tracking-normal uppercase">
                              Disposable
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right z-10 hidden sm:block">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Linked Account</span>
                      <span className="text-xs font-mono font-bold text-gray-300">**** **** **** {focusedCard.cardNumber.substring(12)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex overflow-x-auto gap-6 snap-x snap-mandatory pb-4 scrollbar-none scroll-smooth items-center min-h-[230px]">
                {filteredCards.map((card, idx) => {
                  const isFrozen = card.status === 'FROZEN';
                  const theme = getThemeDetails(card.colorTheme);
                  const isSingle = card.isSingleUse || card.singleUse;
                  const isSelected = activeCardIndex === idx;

                  return (
                    <div 
                      key={card.id} 
                      onClick={() => setActiveCardIndex(idx)}
                      className={`snap-center shrink-0 w-72 sm:w-80 cursor-pointer transition-all duration-300 transform select-none relative ${isSelected ? 'scale-100 opacity-100 ring-2 ring-violet-500/30 rounded-[28px]' : 'scale-90 opacity-40 hover:opacity-70'}`}
                    >
                      {/* Card Skin Container */}
                      <div 
                        className={`p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-48 border transition-all duration-300 ${theme.cardClass} shadow-xl`}
                      >
                        {/* Frozen Overlay */}
                        {isFrozen && (
                          <div className="absolute inset-0 bg-[#07070a]/75 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 rounded-3xl">
                            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-1 shadow-md">
                              <Snowflake className="h-5 w-5" />
                            </div>
                            <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Frozen</span>
                          </div>
                        )}

                        {/* Top: Chip & Visa Logo */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="w-8 h-6 bg-amber-500/80 rounded relative overflow-hidden border border-amber-600/40">
                              <div className="absolute inset-x-1.5 top-1.5 h-0.5 bg-amber-950/20" />
                              <div className="absolute inset-y-1 left-2.5 w-0.5 bg-amber-950/20" />
                            </div>
                            <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-widest block">
                              {isSingle ? '⚡ Single-Use' : '💳 Multi-Use'}
                            </span>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <span className={`font-display font-extrabold italic text-xs text-white tracking-wide bg-gradient-to-r ${theme.glow} bg-clip-text text-transparent`}>
                              VISA
                            </span>
                            <span className={`block text-[7px] border px-1 py-0.5 rounded font-extrabold uppercase tracking-wider mt-1 ${isFrozen ? 'bg-sky-950 text-sky-400 border-sky-800/40' : isSingle ? 'bg-amber-950 text-amber-400 border-amber-800/40' : 'bg-violet-950 text-violet-400 border-violet-800/40'}`}>
                              {isFrozen ? 'Frozen' : isSingle ? 'Disposable' : 'Active'}
                            </span>
                          </div>
                        </div>

                        {/* Card Number */}
                        <div className="my-1">
                          <p className="font-mono font-bold text-sm sm:text-base text-white tracking-widest select-all">
                            {formatCardNumber(card.cardNumber, !!revealedCards[card.id])}
                          </p>
                        </div>

                        {/* Footer details */}
                        <div className="flex items-end justify-between">
                          <div className="space-y-0.5 overflow-hidden max-w-[120px]">
                            <span className="text-[7px] uppercase font-bold text-gray-500 tracking-wider">Cardholder</span>
                            <p className="font-semibold text-[10px] text-gray-200 uppercase truncate">{card.cardholderName}</p>
                          </div>
                          <div className="flex gap-3">
                            <div className="space-y-0.5">
                              <span className="text-[7px] uppercase font-bold text-gray-500 tracking-wider">Expires</span>
                              <p className="font-mono text-[10px] text-gray-300">{card.expiryDate}</p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[7px] uppercase font-bold text-gray-500 tracking-wider">CVV</span>
                              <p className="font-mono text-[10px] text-gray-300">{!!revealedCards[card.id] ? card.cvv : '•••'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indicator dots */}
              <div className="flex justify-center gap-1.5 mt-2 pb-4">
                {filteredCards.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCardIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${activeCardIndex === idx ? 'bg-violet-500 w-5' : 'bg-white/10 w-1.5'}`}
                  />
                ))}
              </div>

              {/* Control Deck for the currently Focused/Active Card */}
              {(() => {
                const safeIndex = Math.min(activeCardIndex, filteredCards.length - 1);
                const focusedCard = filteredCards[safeIndex >= 0 ? safeIndex : 0];
                if (!focusedCard) return null;

                const isFrozen = focusedCard.status === 'FROZEN';
                const reveal = !!revealedCards[focusedCard.id];
                const isSingle = focusedCard.isSingleUse || focusedCard.singleUse;

                return (
                  <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-gradient-to-b from-[#111116] to-[#07070a] space-y-5 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selected Card Settings</h4>
                        <p className="text-sm font-black text-white mt-1">{focusedCard.cardNickname || 'Virtual Card'}</p>
                      </div>
                      <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border ${isSingle ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'}`}>
                        {isSingle ? '⚡ Single-Use Profile' : '💳 Multi-Use Profile'}
                      </span>
                    </div>

                    {/* Spend progress bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400 font-semibold">Total Debited Amount:</span>
                        <span className="text-white font-bold">${focusedCard.spentAmount != null ? focusedCard.spentAmount.toFixed(2) : '0.00'} / ${focusedCard.cardLimit.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(((focusedCard.spentAmount || 0) / focusedCard.cardLimit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Specs grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs py-2 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                      <div>
                        <span className="text-[8px] block uppercase font-bold text-gray-500">Status</span>
                        <span className={`font-semibold ${isFrozen ? 'text-sky-400' : 'text-emerald-400'}`}>{focusedCard.status}</span>
                      </div>
                      <div>
                        <span className="text-[8px] block uppercase font-bold text-gray-500">Theme Skin</span>
                        <span className="font-semibold text-gray-300 capitalize">{focusedCard.colorTheme || 'midnight'}</span>
                      </div>
                      <div>
                        <span className="text-[8px] block uppercase font-bold text-gray-500">Holder</span>
                        <span className="font-semibold text-gray-300 uppercase truncate block">{focusedCard.cardholderName}</span>
                      </div>
                      <div>
                        <span className="text-[8px] block uppercase font-bold text-gray-500">Created Date</span>
                        <span className="font-semibold text-gray-300">{new Date(focusedCard.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Carousel card controls buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        onClick={() => toggleReveal(focusedCard.id)}
                        className={`flex-1 py-3 px-4 rounded-xl border font-extrabold text-[10px] tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${reveal ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20' : 'bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border-violet-500/20 shadow-md'}`}
                      >
                        {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span>{reveal ? 'Hide Details' : 'Reveal Credentials'}</span>
                      </button>

                      <button
                        onClick={() => triggerFreezePin(focusedCard.id)}
                        className={`flex-1 py-3 px-4 rounded-xl border font-extrabold text-[10px] tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${isFrozen ? 'bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border-sky-500/30' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/5'}`}
                      >
                        {isFrozen ? <Flame className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
                        <span>{isFrozen ? 'Unfreeze Card' : 'Freeze Card'}</span>
                      </button>

                      <button
                        onClick={() => triggerTerminatePin(focusedCard.id)}
                        className="flex-1 py-3 px-4 rounded-xl border border-rose-500/20 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-extrabold text-[10px] tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <X className="h-4 w-4" />
                        <span>Delete Card</span>
                      </button>

                      <button
                        onClick={() => { setCardIdForPinSetup(focusedCard.id); setNewCardPin(''); setCardPinError(''); setCardPinSuccess(''); }}
                        className="flex-1 py-3 px-4 rounded-xl border border-violet-500/20 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 font-extrabold text-[10px] tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Lock className="h-4 w-4" />
                        <span>Set Card PIN</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            // List View: Compact row elements (ideal when there are many cards)
            <div className="glass-panel rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {filteredCards.map((card) => {
                const isFrozen = card.status === 'FROZEN';
                const reveal = !!revealedCards[card.id];
                const theme = getThemeDetails(card.colorTheme);
                const isSingle = card.isSingleUse || card.singleUse;

                return (
                  <div key={card.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                    <div className="flex items-center gap-4">
                      {/* Mini Card Indicator */}
                      <div className={`w-12 h-8 rounded-lg border ${theme.cardClass} flex items-center justify-center shrink-0`}>
                        <span className="text-[7px] font-black text-white/50 tracking-wider">VISA</span>
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-white">{card.cardNickname || 'Virtual Card'}</p>
                          <span className="text-[9px] text-gray-500 font-semibold truncate max-w-[80px]">({card.cardholderName})</span>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 rounded ${isSingle ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'}`}>
                            {isSingle ? 'Single-Use' : 'Multi-Use'}
                          </span>
                          {isFrozen && (
                            <span className="text-[8px] font-extrabold uppercase px-1.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse">
                              Frozen
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-gray-400">
                          {formatCardNumber(card.cardNumber, reveal)}
                        </p>
                      </div>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="flex gap-4 text-left font-mono">
                        <div className="text-[10px]">
                          <span className="text-[8px] block uppercase font-bold text-gray-500">Expiry</span>
                          <span className="text-gray-300">{card.expiryDate}</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="text-[8px] block uppercase font-bold text-gray-500">CVV</span>
                          <span className="text-gray-300">{reveal ? card.cvv : '•••'}</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="text-[8px] block uppercase font-bold text-gray-500">Spent / Limit</span>
                          <span className="text-gray-300">${card.spentAmount != null ? card.spentAmount.toFixed(2) : '0.00'} / ${card.cardLimit.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleReveal(card.id)}
                          className={`p-2 rounded-lg border transition-all ${reveal ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                          title={reveal ? 'Hide Details' : 'Reveal Details'}
                        >
                          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => triggerFreezePin(card.id)}
                          className={`p-2 rounded-lg border transition-all ${isFrozen ? 'bg-sky-600/20 border-sky-500/30 text-sky-400' : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'}`}
                          title={isFrozen ? 'Unfreeze Card' : 'Freeze Card'}
                        >
                          {isFrozen ? <Flame className="h-4 w-4" /> : <Snowflake className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setCardIdForPinSetup(card.id); setNewCardPin(''); setCardPinError(''); setCardPinSuccess(''); }}
                          className="p-2 rounded-lg border border-white/5 bg-white/5 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/20 transition-all"
                          title="Set Card PIN"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => triggerTerminatePin(card.id)}
                          className="p-2 rounded-lg border border-white/5 bg-white/5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                          title="Delete Card"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Archived Collapsible Panel */}
          {cards.filter(c => c.status === 'TERMINATED').length > 0 && (
            <div className="glass-panel p-5 rounded-3xl border border-white/5 relative overflow-hidden transition-all duration-300">
              <button 
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="w-full flex items-center justify-between text-left focus:outline-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gray-500/10 text-gray-400">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-sm text-white">Archived / Spent Cards</h3>
                    <p className="text-[10px] text-gray-400">Disposable cards that have been spent and deactivated</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors uppercase tracking-wider">
                  {showArchived ? 'Hide' : `Show (${cards.filter(c => c.status === 'TERMINATED').length})`}
                </span>
              </button>

              {showArchived && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 pt-5 border-t border-white/5 animate-fade-in">
                  {cards.filter(c => c.status === 'TERMINATED').map((card) => {
                    const reveal = !!revealedCards[card.id];

                    return (
                      <div key={card.id} className="flex flex-col gap-3 opacity-50 grayscale hover:opacity-85 transition-all duration-300">
                        <div className={`p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-52 border border-white/5 bg-[#141418]/60`}>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="w-9 h-7 bg-gray-700/80 rounded-lg relative overflow-hidden border border-gray-600/40">
                                <div className="absolute inset-x-2 top-2 h-0.5 bg-gray-900/20" />
                                <div className="absolute inset-y-1 left-3.5 w-0.5 bg-gray-900/20" />
                              </div>
                              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">{card.cardNickname || 'Virtual Card'}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-display font-extrabold italic text-sm text-gray-500 tracking-wide">
                                VISA
                              </span>
                              <span className="block text-[8px] bg-rose-950/80 text-rose-400 border border-rose-800/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider mt-1">
                                Spent
                              </span>
                            </div>
                          </div>

                          <div className="my-2">
                            <p className="font-mono font-bold text-lg text-gray-400 tracking-widest select-all">
                              {formatCardNumber(card.cardNumber, reveal)}
                            </p>
                          </div>

                          <div className="flex items-end justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[8px] uppercase font-bold text-gray-600 tracking-wider">Cardholder</span>
                              <p className="font-semibold text-xs text-gray-400 uppercase">{card.cardholderName}</p>
                            </div>
                            <div className="flex gap-4">
                              <div className="space-y-0.5">
                                <span className="text-[8px] uppercase font-bold text-gray-600 tracking-wider">Expires</span>
                                <p className="font-mono text-xs text-gray-400">{card.expiryDate}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[8px] uppercase font-bold text-gray-600 tracking-wider">CVV</span>
                                <p className="font-mono text-xs text-gray-400">{reveal ? card.cvv : '•••'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Side: Card Creation Form */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Creation Form */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden border border-white/5">
            <h3 className="font-display font-semibold text-base text-white mb-4">Card Configurator</h3>
            
            <form onSubmit={handleCreateCardSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Card Label / Nickname
                </label>
                <input
                  type="text"
                  required
                  value={cardNickname}
                  onChange={(e) => setCardNickname(e.target.value)}
                  placeholder="e.g. Travel, Netflix, Dining Out"
                  maxLength={25}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Name on card"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Card Spending Limit ($)
                </label>
                <input
                  type="number"
                  required
                  value={cardLimit}
                  onChange={(e) => setCardLimit(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Theme Skin
                </label>
                <select
                  value={colorTheme}
                  onChange={(e) => setColorTheme(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#111118] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium focus:ring-1 focus:ring-violet-500/30"
                >
                  <option value="midnight">🔮 Midnight Velvet</option>
                  <option value="cyberpunk">🌌 Cyberpunk Neon</option>
                  <option value="rosegold">👑 Rose Gold Metallic</option>
                  <option value="emerald">💚 Emerald Mint</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
                <div>
                  <p className="text-xs font-semibold text-white">Single-Use (Disposable)</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Destroy card automatically after use</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSingleUse(!isSingleUse)}
                  className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isSingleUse ? 'bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'bg-white/10'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSingleUse ? 'translate-x-4.5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={createCardMutation.isPending}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Plus className="h-4 w-4" />
                <span>{createCardMutation.isPending ? 'Generating...' : 'Generate Virtual Card'}</span>
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Slide-over Sandbox Modal/Drawer */}
      {isSandboxMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-40 animate-fade-in">
          <div className="w-full max-w-md h-full bg-[#0d0d12]/95 border-l border-white/5 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-600/10 text-sky-400">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">E-Commerce Simulator</h3>
                    <p className="text-xs text-gray-400">Mock card spending & channels</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSandboxMode(false)}
                  className="p-1.5 text-gray-500 hover:text-white rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {simSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{simSuccessMsg}</span>
                </div>
              )}

              {simErrorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{simErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handlePaySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={simCardNumber}
                    onChange={(e) => setSimCardNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                    placeholder="4532 XXXX XXXX XXXX"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Copy and paste from any active card details</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      value={simExpiry}
                      onChange={(e) => setSimExpiry(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      CVV Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="000"
                      maxLength={3}
                      value={simCvv}
                      onChange={(e) => setSimCvv(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Payment Method / Mode
                  </label>
                  <select
                    value={simPaymentChannel}
                    onChange={(e) => setSimPaymentChannel(e.target.value as 'ONLINE' | 'CONTACTLESS')}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#111118] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs font-medium focus:ring-1 focus:ring-violet-500/30"
                  >
                    <option value="ONLINE">🌐 Online Purchase (E-commerce)</option>
                    <option value="CONTACTLESS">📶 Tap-to-Pay (NFC Chip)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Purchase Amount ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-semibold text-gray-400 text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={payMutation.isPending}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-[0_4px_20px_rgba(14,165,233,0.2)] mt-6 text-xs"
                >
                  {payMutation.isPending ? 'Processing...' : 'Process Simulated Payment'}
                </button>
              </form>
            </div>
            
            <div className="text-[10px] text-gray-500 text-center leading-relaxed mt-12 border-t border-white/5 pt-4 flex items-center justify-center gap-1">
              <HelpCircle className="h-3 w-3" />
              <span>Simulated transactions honor live channel & category settings</span>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal for card reveal */}
      {cardIdToUnlock && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl relative glow-purple border-violet-500/20 text-center">
            <button
              onClick={() => setCardIdToUnlock(null)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-rose-400 rounded-full hover:bg-white/10 transition-all duration-200"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-2xl bg-violet-600/10 text-violet-400 border border-violet-500/20">
                <Lock className="h-6 w-6" />
              </div>
            </div>

            <h3 className="font-display font-bold text-lg text-white mb-1">
              {pinAction === 'reveal' ? 'Verify Transaction PIN' : pinAction === 'freeze' ? 'Authorize Status Toggle' : 'Confirm Card Destruction'}
            </h3>
            <p className="text-xs text-gray-400 mb-6">
              {pinAction === 'reveal' 
                ? 'Please enter your 4-digit PIN to visually expose sensitive card details.' 
                : pinAction === 'freeze' 
                ? 'Please enter your 4-digit PIN to freeze or unfreeze this card.' 
                : 'Please enter your 4-digit PIN to permanently deactivate and destroy this card. This action is irreversible.'}
            </p>

            {pinError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d*"
                  required
                  autoFocus
                  value={pinPrompt}
                  onChange={(e) => setPinPrompt(e.target.value.replace(/\D/g, ''))}
                  className="w-40 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-[1.5em] font-bold text-xl placeholder-gray-600"
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCardIdToUnlock(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl border border-white/5 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPin}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-xs"
                >
                  {isVerifyingPin ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Card Custom PIN Modal */}
      {cardIdForPinSetup && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm glass-panel p-6 rounded-3xl relative border border-white/10 shadow-2xl text-center space-y-5">
            <button
              onClick={() => setCardIdForPinSetup(null)}
              className="absolute right-4 top-4 p-1 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1 pt-3">
              <h3 className="font-display font-black text-lg text-white">Set 4-Digit Card PIN</h3>
              <p className="text-xs text-gray-400">Configure a custom 4-digit PIN for sandbox ATM & Online purchases</p>
            </div>

            {cardPinError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{cardPinError}</span>
              </div>
            )}

            {cardPinSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{cardPinSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCardPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d*"
                  required
                  autoFocus
                  value={newCardPin}
                  onChange={(e) => setNewCardPin(e.target.value.replace(/\D/g, ''))}
                  className="w-40 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none text-white font-mono text-center tracking-[1.5em] font-bold text-xl placeholder-gray-600"
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCardIdForPinSetup(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl border border-white/5 transition-all text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all text-xs shadow-md"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
