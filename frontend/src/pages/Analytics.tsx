import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import { RefreshCw, AlertCircle, BarChart3, Wallet, CreditCard, TrendingDown, Target, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';

interface BalanceData {
  accountId: string;
  currentBalance: number;
  currency: string;
  lastLedgerEntryId: string;
  updatedAt: string;
}

interface VirtualCard {
  id: string;
  status: string;
}

const categoryColors: Record<string, { stroke: string; text: string; bg: string; label: string }> = {
  GROCERIES: { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Groceries' },
  ENTERTAINMENT: { stroke: '#f43f5e', text: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Entertainment' },
  UTILITIES: { stroke: '#3b82f6', text: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Utilities' },
  RENT: { stroke: '#8b5cf6', text: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Rent & Housing' },
  INVESTMENT: { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Investments' },
  OTHERS: { stroke: '#6b7280', text: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Others' }
};

export const Analytics: React.FC = () => {
  const [accountId, setAccountId] = useState<string>('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [budgetLimit, setBudgetLimit] = useState<number>(3000);
  const [activeWeeklyPoint, setActiveWeeklyPoint] = useState<number | null>(null);

  // Extract accountId from localStorage
  useEffect(() => {
    const storedId = localStorage.getItem('accountId');
    if (storedId) {
      setAccountId(storedId);
    }
  }, []);

  // Fetch Account Balance
  const { data: balance, refetch: refetchBalance, isFetching } = useQuery<BalanceData>({
    queryKey: ['balance', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/balances/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch Spending Aggregates
  const { data: spending = [], isLoading, isError } = useQuery<{ category: string; amount: number }[]>({
    queryKey: ['spending', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/balances/${accountId}/spending`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch Virtual Cards to get counts
  const { data: cards = [] } = useQuery<VirtualCard[]>({
    queryKey: ['cards', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/transactions/cards/${accountId}`);
      return response.data;
    },
    enabled: !!accountId,
  });

  // Fetch Ledger Entries for Weekly Spend Spline
  const { data: ledgerEntries = [] } = useQuery<any[]>({
    queryKey: ['ledger-entries', accountId],
    queryFn: async () => {
      const response = await axiosInstance.get(`/api/ledger/accounts/${accountId}/entries`);
      return response.data;
    },
    enabled: !!accountId,
  });

  const formatCurrency = (val: number, curCode: string) => {
    const symbol = curCode === 'EUR' ? '€' : curCode === 'GBP' ? '£' : '$';
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to map DB category to UI category
  const mapDbCategoryToFrontendCategory = (dbCategory: string): string => {
    const upper = (dbCategory || '').toUpperCase().trim();
    if (upper === 'GROCERIES') return 'GROCERIES';
    if (upper === 'ENTERTAINMENT' || upper === 'GAMBLING') return 'ENTERTAINMENT';
    if (upper === 'UTILITIES' || upper.startsWith('RECHARGE')) return 'UTILITIES';
    if (upper === 'RENT' || upper === 'RENT & HOUSING') return 'RENT';
    if (upper.startsWith('INVESTMENT') || upper.startsWith('YIELD')) return 'INVESTMENT';
    return 'OTHERS';
  };

  // Group database spending by mapped UI category
  const aggregatedSpending: Record<string, number> = {
    GROCERIES: 0,
    ENTERTAINMENT: 0,
    UTILITIES: 0,
    RENT: 0,
    INVESTMENT: 0,
    OTHERS: 0
  };

  spending.forEach((item) => {
    const mapped = mapDbCategoryToFrontendCategory(item.category);
    aggregatedSpending[mapped] = (aggregatedSpending[mapped] || 0) + item.amount;
  });

  const totalSpending = Object.values(aggregatedSpending).reduce((sum, val) => sum + val, 0);

  useEffect(() => {
    if (totalSpending > 0) {
      setBudgetLimit(prev => prev === 3000 ? Math.max(3000, Math.ceil((totalSpending * 1.3) / 1000) * 1000) : prev);
    }
  }, [totalSpending]);

  const chartData = Object.keys(categoryColors).map(catKey => {
    const amount = aggregatedSpending[catKey] || 0;
    const percent = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
    return {
      category: catKey,
      amount,
      percent,
      color: categoryColors[catKey]
    };
  });

  // Donut chart math
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159

  const activeCardsCount = cards.filter(c => c.status === 'ACTIVE' || c.status === 'FROZEN').length;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Cover Analytics Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 bg-gradient-to-r from-slate-900/60 via-violet-950/20 to-[#0e0e12]/80 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 left-10 w-48 h-48 bg-emerald-600/5 rounded-full blur-3xl" />

        <div className="flex flex-col md:flex-row items-center gap-6 z-10">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[3px] shadow-[0_0_25px_rgba(124,58,237,0.35)] flex items-center justify-center">
              <div className="w-full h-full rounded-xl bg-[#0b0b0f] flex items-center justify-center text-violet-400">
                <BarChart3 className="h-8 w-8" />
              </div>
            </div>
          </div>

          <div className="text-center md:text-left space-y-1">
            <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight">
              Spending Analytics
            </h2>
            <p className="text-xs text-gray-400 max-w-md leading-normal">
              Real-time expenditure aggregates. Visual category breakdowns compiled from transactional journal records.
            </p>
          </div>
        </div>

        {/* Sync Action */}
        <button
          onClick={() => { refetchBalance(); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-[#111118]/80 hover:bg-white/[0.05] text-xs font-bold text-gray-300 z-10 shadow-md transition-all shrink-0 self-center md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-violet-400 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
      ) : isError ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Failed to load spending aggregates. Please refresh.</span>
        </div>
      ) : (
        <>
          {/* Three-Column Expense Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Outgoing Expenses Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.3)] bg-gradient-to-br from-[#1c0f1b] via-[#100713]/90 to-[#0e0711]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Total Outgoing Expenses</span>
              </div>
              <span className="text-3xl font-black text-rose-400 mt-6 font-mono">
                {formatCurrency(totalSpending, balance?.currency || 'USD')}
              </span>
              <p className="text-[9px] text-gray-400 mt-2 font-semibold">Accumulated from debit cards, transfers, and cashout events</p>
            </div>
            
            {/* Account Balance Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.3)] bg-gradient-to-br from-[#0c1815] via-[#05110e]/95 to-[#040c0a]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Current Account Balance</span>
              </div>
              <span className="text-3xl font-black text-emerald-400 mt-6 font-mono">
                {formatCurrency(balance?.currentBalance || 0, balance?.currency || 'USD')}
              </span>
              <p className="text-[9px] text-gray-400 mt-2 font-semibold">Liquid double-entry ledger funds available to spend</p>
            </div>

            {/* Active Cards Count Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.3)] bg-gradient-to-br from-[#120f26] via-[#090715]/95 to-[#0b0817]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl" />
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Active Virtual Cards</span>
              </div>
              <span className="text-3xl font-black text-violet-400 mt-6 font-mono">
                {activeCardsCount} <span className="text-xs text-gray-500 font-semibold font-sans">Cards</span>
              </span>
              <p className="text-[9px] text-gray-400 mt-2 font-semibold">Total active multi-use and single-use digital profiles</p>
            </div>

          </div>

          {/* Interactive Graph Details Panel */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden bg-gradient-to-br from-[#121218] to-[#08080c] border border-white/5">
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl" />

            <div className="flex-1 space-y-5 w-full">
              <div>
                <h3 className="font-display font-extrabold text-xl text-white">Expense Distribution</h3>
                <p className="text-xs text-gray-400 mt-1">Breakdown of outbound transactions by category</p>
              </div>

              {totalSpending === 0 ? (
                <p className="text-sm text-gray-400 font-semibold mt-4">No spending recorded for this account yet.</p>
              ) : (
                <div className="space-y-3.5 max-h-80 overflow-y-auto pr-2">
                  {chartData
                    .filter(d => d.amount > 0)
                    .map((data, idx) => (
                      <div
                        key={data.category}
                        className={`p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer ${hoveredIndex === idx ? 'border-violet-500/30 bg-violet-500/5' : ''}`}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color.stroke }} />
                            <span className="text-xs font-bold text-white uppercase tracking-wider">{data.color.label}</span>
                          </div>
                          <span className="text-sm font-bold text-white font-mono">{formatCurrency(data.amount, balance?.currency || 'USD')}</span>
                        </div>
                        
                        {/* Visual Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${data.percent}%`,
                              backgroundColor: data.color.stroke,
                              boxShadow: `0 0 8px ${data.color.stroke}80`
                            }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[10px] text-gray-400 font-semibold">Percent of total spend</span>
                          <span className="text-[10px] text-gray-200 font-bold font-mono">{data.percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* SVG Interactive Donut Chart */}
            <div className="flex justify-center items-center shrink-0 w-full lg:w-auto mt-6 lg:mt-0">
              <div className="relative p-6 rounded-3xl bg-black/40 border border-white/5 flex flex-col items-center justify-center min-w-[280px]">
                {totalSpending === 0 ? (
                  <div className="text-center py-8">
                    <TrendingDown className="h-10 w-10 text-gray-500 mx-auto animate-pulse mb-2" />
                    <span className="text-xs text-gray-400 font-semibold">No data to analyze</span>
                  </div>
                ) : (
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                      {/* Base Track Circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255, 255, 255, 0.03)"
                        strokeWidth="10"
                      />
                      
                      {(() => {
                        let accumulatedOffset = 0;
                        return chartData.map((data, idx) => {
                          if (data.amount === 0) return null;
                          const strokeDasharray = `${(data.percent / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = `${-(accumulatedOffset / 100) * circumference}`;
                          accumulatedOffset += data.percent;
                          const isHovered = hoveredIndex === idx;

                          return (
                            <circle
                              key={data.category}
                              cx="60"
                              cy="60"
                              r={radius}
                              fill="transparent"
                              stroke={data.color.stroke}
                              strokeWidth={isHovered ? 12 : 9}
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-300 cursor-pointer"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              style={{
                                filter: isHovered 
                                  ? `drop-shadow(0 0 8px ${data.color.stroke}80)` 
                                  : `drop-shadow(0 0 2px ${data.color.stroke}20)`
                              }}
                            />
                          );
                        });
                      })()}
                    </svg>
                    
                    {/* Inner Text Overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                        {hoveredIndex !== null ? chartData[hoveredIndex].color.label : 'Total Spent'}
                      </span>
                      <p className="text-lg font-black text-white font-mono mt-0.5">
                        {formatCurrency(
                          hoveredIndex !== null ? chartData[hoveredIndex].amount : totalSpending,
                          balance?.currency || 'USD'
                        )}
                      </p>
                      <span className="text-[10px] font-bold text-violet-400 font-mono mt-0.5">
                        {hoveredIndex !== null ? `${chartData[hoveredIndex].percent.toFixed(1)}%` : '100%'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
          </div>

          {/* Two-Column Weekly Line Chart & Budget Planner Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Weekly Expense Peak Line Chart */}
            <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-[#0c0c12] to-[#07070b] relative overflow-hidden flex flex-col justify-between shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-600/5 rounded-full blur-3xl animate-pulse" />
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Weekly Spend Spline</span>
                </div>
                <h3 className="font-display font-extrabold text-lg text-white pt-2">Fluctuation Peaks</h3>
                <p className="text-xs text-gray-400">Hover graph vertices to view localized daily transaction spikes</p>
              </div>

              {(() => {
                const weeklySpentData = (() => {
                  const dayNamesOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  const dailyMap: Record<string, number> = {
                    Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
                  };

                  let hasRealData = false;
                  const nowTime = new Date();
                  const sevenDaysAgo = new Date(nowTime.getTime() - 7 * 24 * 60 * 60 * 1000);

                  ledgerEntries.forEach((entry: any) => {
                    if (entry.entryType === 'DEBIT') {
                      const entryDate = new Date(entry.createdAt);
                      if (entryDate >= sevenDaysAgo) {
                        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        const dayName = dayNames[entryDate.getDay()];
                        dailyMap[dayName] = (dailyMap[dayName] || 0) + entry.amount;
                        hasRealData = true;
                      }
                    }
                  });

                  if (hasRealData) {
                    return dayNamesOrder.map(day => ({
                      day,
                      amount: dailyMap[day]
                    }));
                  }

                  // Fallback to percentage-based distribution of totalSpending if no real transaction data is available
                  return [
                    { day: 'Mon', amount: totalSpending > 0 ? totalSpending * 0.12 : 120 },
                    { day: 'Tue', amount: totalSpending > 0 ? totalSpending * 0.18 : 250 },
                    { day: 'Wed', amount: totalSpending > 0 ? totalSpending * 0.08 : 95 },
                    { day: 'Thu', amount: totalSpending > 0 ? totalSpending * 0.22 : 310 },
                    { day: 'Fri', amount: totalSpending > 0 ? totalSpending * 0.15 : 180 },
                    { day: 'Sat', amount: totalSpending > 0 ? totalSpending * 0.20 : 420 },
                    { day: 'Sun', amount: totalSpending > 0 ? totalSpending * 0.05 : 60 }
                  ];
                })();
                
                const maxAmt = Math.max(...weeklySpentData.map(d => d.amount), 1);
                const points = weeklySpentData.map((d, i) => {
                  const x = 25 + i * 42;
                  const y = 80 - (d.amount / maxAmt) * 55;
                  return { x, y, ...d };
                });

                // Generate smooth SVG quadratic curve points
                let pathD = `M ${points[0].x} ${points[0].y}`;
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = points[i];
                  const p1 = points[i + 1];
                  const cpX = (p0.x + p1.x) / 2;
                  pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
                }
                
                const areaD = `${pathD} L ${points[points.length - 1].x} 90 L ${points[0].x} 90 Z`;

                return (
                  <div className="relative mt-8 select-none">
                    <svg viewBox="0 0 300 100" className="w-full overflow-visible">
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* horizontal gridlines */}
                      <line x1="20" y1="25" x2="280" y2="25" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                      <line x1="20" y1="52.5" x2="280" y2="52.5" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                      <line x1="20" y1="80" x2="280" y2="80" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />

                      {/* Area Under Curve */}
                      <path d={areaD} fill="url(#areaGradient)" />

                      {/* Spline Path */}
                      <path
                        d={pathD}
                        fill="transparent"
                        stroke="#8b5cf6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 2px 6px rgba(139, 92, 246, 0.4))' }}
                      />

                      {/* Vertices & Hover Areas */}
                      {points.map((p, idx) => {
                        const isActive = activeWeeklyPoint === idx;
                        return (
                          <g key={p.day}>
                            {/* Interactive Vertices */}
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={isActive ? 5 : 3.5}
                              fill="#0c0c12"
                              stroke={isActive ? "#f43f5e" : "#8b5cf6"}
                              strokeWidth={isActive ? 2.5 : 2}
                              className="transition-all duration-200 cursor-pointer"
                              onMouseEnter={() => setActiveWeeklyPoint(idx)}
                              onMouseLeave={() => setActiveWeeklyPoint(null)}
                            />

                            {/* Label */}
                            <text
                              x={p.x}
                              y="96"
                              fill="#6b7280"
                              fontSize="6.5"
                              fontWeight="bold"
                              textAnchor="middle"
                              className="font-mono font-bold uppercase tracking-wider"
                            >
                              {p.day}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Tooltip Overlay */}
                    {activeWeeklyPoint !== null && (
                      <div 
                        className="absolute bg-[#0f0f18] border border-white/10 rounded-xl px-2.5 py-1.5 shadow-2xl text-center pointer-events-none z-10 animate-fade-in text-[10px] font-bold font-mono"
                        style={{
                          left: `${(points[activeWeeklyPoint].x / 300) * 100}%`,
                          top: `${(points[activeWeeklyPoint].y / 100) * 100 - 35}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <p className="text-gray-400 font-sans text-[8px] uppercase tracking-wider">{points[activeWeeklyPoint].day} Spike</p>
                        <p className="text-white mt-0.5">{formatCurrency(points[activeWeeklyPoint].amount, balance?.currency || 'USD')}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Monthly Budget Tracker & Planner */}
            <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-gradient-to-br from-[#0a1112] to-[#04080a] relative overflow-hidden flex flex-col justify-between shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl animate-pulse" />

              <div className="space-y-6">
                
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Target className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Monthly Budget Planner</span>
                  </div>
                  <h3 className="font-display font-extrabold text-lg text-white pt-2">Budget Target Insights</h3>
                  <p className="text-xs text-gray-400">Drag standard control to simulate target limits & verify risk status</p>
                </div>

                {(() => {
                  const remaining = Math.max(0, budgetLimit - totalSpending);
                  const percentUsed = Math.min(100, (totalSpending / budgetLimit) * 100);
                  
                  const currentDay = new Date().getDate();
                  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                  const dailyAvg = totalSpending / Math.max(1, currentDay);
                  const projectedSpend = dailyAvg * daysInMonth;
                  const isExceeding = projectedSpend > budgetLimit;
                  
                  const budgetRingRadius = 40;
                  const budgetRingCirc = 2 * Math.PI * budgetRingRadius;
                  const strokeOffset = budgetRingCirc - (percentUsed / 100) * budgetRingCirc;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                      
                      {/* Controls & Metrics */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center text-xs font-semibold text-gray-400 mb-1.5">
                            <span>Adjust Monthly Target</span>
                            <span className="font-bold text-white font-mono">{formatCurrency(budgetLimit, balance?.currency || 'USD')}</span>
                          </div>
                          <input 
                            type="range"
                            min={Math.max(1000, Math.ceil(totalSpending / 1000) * 1000 - 2000)}
                            max="25000"
                            step="500"
                            value={budgetLimit}
                            onChange={(e) => setBudgetLimit(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-400 outline-none"
                          />
                        </div>

                        <div className="space-y-2 text-xs font-semibold">
                          <div className="flex justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                            <span className="text-gray-400">Left to Spend</span>
                            <span className="text-emerald-400 font-mono">{formatCurrency(remaining, balance?.currency || 'USD')}</span>
                          </div>
                          <div className="flex justify-between bg-black/20 p-2.5 rounded-xl border border-white/5">
                            <span className="text-gray-400">Projected Month-End</span>
                            <span className={`font-mono ${isExceeding ? 'text-rose-400' : 'text-gray-300'}`}>
                              {formatCurrency(projectedSpend, balance?.currency || 'USD')}
                            </span>
                          </div>
                        </div>

                        {/* Forecast Status Banner */}
                        <div className={`p-3 rounded-xl border text-[11px] font-semibold flex items-start gap-2.5 leading-normal ${
                          isExceeding 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {isExceeding ? (
                            <>
                              <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-rose-400 mt-0.5" />
                              <span>Projected to exceed budget by {formatCurrency(projectedSpend - budgetLimit, balance?.currency || 'USD')}. Tighten expenses!</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" />
                              <span>Your spending pace is healthy. You're projected to finish under target!</span>
                            </>
                          )}
                        </div>

                      </div>

                      {/* Budget Circular Ring */}
                      <div className="flex justify-center">
                        <div className="relative w-40 h-40 flex items-center justify-center">
                          <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                            <circle
                              cx="80"
                              cy="80"
                              r={budgetRingRadius}
                              fill="transparent"
                              stroke="rgba(255, 255, 255, 0.02)"
                              strokeWidth="8"
                            />
                            <circle
                              cx="80"
                              cy="80"
                              r={budgetRingRadius}
                              fill="transparent"
                              stroke={percentUsed >= 85 ? "#f43f5e" : "#10b981"}
                              strokeWidth="8"
                              strokeDasharray={budgetRingCirc}
                              strokeDashoffset={strokeOffset}
                              strokeLinecap="round"
                              className="transition-all duration-500"
                              style={{
                                filter: percentUsed >= 85 
                                  ? 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.4))'
                                  : 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))'
                              }}
                            />
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Utilized</span>
                            <span className="text-lg font-black text-white font-mono mt-0.5">{percentUsed.toFixed(0)}%</span>
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5">
                              {formatCurrency(totalSpending, balance?.currency || 'USD')}
                            </span>
                          </div>

                        </div>
                      </div>

                    </div>
                  );
                })()}

              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};
