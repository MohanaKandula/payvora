import React, { useEffect, useState } from 'react';
import { FloatingHelpWidget } from './FloatingHelpWidget';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { axiosInstance } from '../api/axiosInstance';
import { LayoutDashboard, Receipt, UserCheck, LogOut, Wallet, ShieldAlert, BarChart3, CreditCard, Calendar, ShieldCheck, User, PiggyBank, Bell, Lock, RefreshCw, Gift, HelpCircle, Bot } from 'lucide-react';
 
interface LayoutProps {
  children: React.ReactNode;
}

interface UserProfile {
  username: string;
  userId: string;
  isAdmin: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [kycStatus, setKycStatus] = useState<string>('NOT_STARTED');
  const [pinSet, setPinSet] = useState<boolean>(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [loadingSecurity, setLoadingSecurity] = useState<boolean>(true);

  const fetchNotifications = async (accountId: string) => {
    try {
      const response = await axiosInstance.get(`/api/transactions/notifications?accountId=${accountId}`);
      setNotifications(response.data || []);
      const unread = (response.data || []).filter((n: any) => !(n.isRead || n.read)).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const markAllRead = async (accountId: string) => {
    try {
      await axiosInstance.post(`/api/transactions/notifications/read-all?accountId=${accountId}`);
      fetchNotifications(accountId);
    } catch (e) {
      console.error('Failed to mark notifications read', e);
    }
  };

  const markRead = async (id: string, accountId: string) => {
    try {
      await axiosInstance.post(`/api/transactions/notifications/${id}/read`);
      fetchNotifications(accountId);
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  };

  const fetchSecurityStatus = async () => {
    try {
      const res = await axiosInstance.get('/api/accounts/me');
      setKycStatus(res.data.kycStatus || 'NOT_STARTED');
      setPinSet(res.data.pinSet || false);
      setMfaEnabled(res.data.mfaEnabled || false);
    } catch (e) {
      console.error('Failed to fetch security status', e);
    } finally {
      setLoadingSecurity(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson);
        
        // Extract roles (both singular "role" and plural "roles" array)
        const tokenRole = payload.role;
        const tokenRoles: string[] = Array.isArray(payload.roles) ? payload.roles : [];
        const isAdmin = tokenRole === 'ROLE_ADMIN' || tokenRole === 'ADMIN' || 
                        tokenRoles.includes('ROLE_ADMIN') || tokenRoles.includes('ADMIN');
                        
        const storedAccountId = localStorage.getItem('accountId') || '';
        setUser({
          username: payload.sub || 'User',
          userId: storedAccountId,
          isAdmin: isAdmin,
        });

        if (isAdmin) {
          setLoadingSecurity(false);
          if (window.location.pathname === '/dashboard' || window.location.pathname === '/' || window.location.pathname === '/cards' || window.location.pathname === '/rewards') {
            navigate('/admin');
          }
        } else {
          fetchSecurityStatus();
        }

        if (storedAccountId) {
          fetchNotifications(storedAccountId);
          const interval = setInterval(() => {
            fetchNotifications(storedAccountId);
          }, 7000);
          return () => clearInterval(interval);
        }
      } catch (e) {
        console.error('Failed to parse token', e);
        setLoadingSecurity(false);
      }
    } else {
      setLoadingSecurity(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      const storedAccountId = localStorage.getItem('accountId');
      if (storedAccountId) {
        await axiosInstance.post('/api/transactions/investments/accrue-logout', {
          accountId: storedAccountId
        });
      }
    } catch (e) {
      console.error('Failed to accrue yield on logout', e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/login');
    }
  };

  const menuItems = [];

  if (user?.isAdmin) {
    // Admins get Admin Dashboard, Support Desk, Personal Statement, Security, and Profile
    menuItems.push(
      { name: 'Admin Dashboard', path: '/admin', icon: UserCheck },
      { name: 'Support Desk 🎧', path: '/admin?tab=support', icon: HelpCircle },
      { name: 'Personal Statement', path: '/statement', icon: Receipt },
      { name: 'Security', path: '/security', icon: ShieldCheck },
      { name: 'Profile', path: '/profile', icon: User }
    );
  } else {
    // Normal users get everything except Admin Panel
    menuItems.push(
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Yield Vault', path: '/investments', icon: PiggyBank },
      { name: 'Statement', path: '/statement', icon: Receipt },
      { name: 'Analytics', path: '/analytics', icon: BarChart3 },
      { name: 'Virtual Cards', path: '/cards', icon: CreditCard },
      { name: 'Scheduler', path: '/recurring', icon: Calendar },
      { name: 'Rewards', path: '/rewards', icon: Gift },
      { name: 'Help & Support', path: '/help', icon: HelpCircle },
      { name: 'Security', path: '/security', icon: ShieldCheck },
      { name: 'Profile', path: '/profile', icon: User }
    );
  }

  if (loadingSecurity && !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 text-violet-500 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-400">Verifying security configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0f]">
      {/* Top Header */}
      <header className="glass-panel border-b border-white/5 px-6 py-4 sticky top-0 z-50 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-2.5 rounded-xl glow-purple">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              PayVora
            </span>
            <span className="text-[10px] block font-mono text-violet-400/80 tracking-widest font-bold uppercase -mt-0.5">
              Automated KYC Ledger
            </span>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1 justify-end">
                {user.isAdmin && (
                  <span className="bg-violet-950 text-violet-400 border border-violet-800/40 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                    Admin
                  </span>
                )}
                ID: {user.userId.substring(0, 8)}...
              </p>
            </div>
            
            {/* Notification Bell Icon */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-xl border border-white/5 hover:border-violet-500/20 hover:bg-violet-500/5 text-gray-400 hover:text-violet-400 transition-all duration-200 relative"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-600 text-[10px] font-black text-white shadow-md animate-pulse border border-[#0b0b0f]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Tray */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 glass-panel border border-white/10 rounded-2xl shadow-2xl p-4 z-50 bg-[#0d0d15]/95 backdrop-blur-xl animate-fade-in space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Alert Center</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead(user.userId)}
                        className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold underline bg-transparent border-none outline-none cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 divide-y divide-white/5">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => !(n.isRead || n.read) && markRead(n.id, user.userId)}
                          className={`pt-2.5 first:pt-0 text-left transition-all duration-200 cursor-pointer group ${!(n.isRead || n.read) ? 'opacity-100' : 'opacity-60'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors flex items-center gap-1.5">
                              {!(n.isRead || n.read) && <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 shrink-0" />}
                              {n.title}
                            </h4>
                            <span className="text-[8px] text-gray-500 font-mono">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                            {n.message}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-xs text-gray-500 font-semibold italic">
                        No notifications found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/5 text-gray-400 hover:text-rose-400 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="md:w-64 glass-panel border-r border-white/5 p-4 flex md:flex-col gap-2 md:sticky md:top-[73px] md:h-[calc(100vh-73px)] no-print">
          <div className="flex-1 flex md:flex-col gap-1 w-full overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {(() => {
              const isLocked = !user?.isAdmin && (kycStatus !== 'APPROVED' || !pinSet || !mfaEnabled);
              return menuItems.map((item) => {
                const Icon = item.icon;
                const fullPath = location.pathname + location.search;
                const isActive = item.path.includes('?')
                  ? fullPath === item.path
                  : (location.pathname === item.path && !location.search.includes('tab=support'));
                const isItemLocked = isLocked && !['/profile', '/security', '/help'].includes(item.path);

                if (isItemLocked) {
                  return (
                    <div
                      key={item.path}
                      className="flex items-center justify-between px-4 py-3 rounded-xl border border-transparent text-gray-600 cursor-not-allowed select-none bg-white/[0.01] opacity-40 whitespace-nowrap"
                      title="Security configuration required to unlock this feature"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 border border-violet-500/30 text-white font-medium shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                        : 'border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-violet-400' : ''}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              });
            })()}
          </div>

          <div className="hidden md:block p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-gray-500 font-mono">
            <div className="flex items-center gap-1.5 text-violet-400 font-semibold mb-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              Event Sourced Ledger
            </div>
            Ensuring double-entry audit consistency.
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col">
          {(() => {
            const isLocked = !user?.isAdmin && (kycStatus !== 'APPROVED' || !pinSet || !mfaEnabled);
            const isLockedPath = !['/profile', '/security', '/help'].includes(location.pathname);
            
            if (isLocked && isLockedPath) {
              return (
                <div className="flex-1 flex items-center justify-center p-6 bg-[#0c0c12]/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                  <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
                  <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/5 rounded-full blur-3xl" />

                  <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative space-y-6 text-center glow-purple">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[3px] shadow-[0_0_30px_rgba(124,58,237,0.3)] flex items-center justify-center">
                      <div className="w-full h-full rounded-xl bg-[#0b0b0f] flex items-center justify-center text-violet-400">
                        <ShieldAlert className="h-7 w-7 animate-pulse" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="font-display font-black text-xl text-white tracking-tight">
                        Security Setup Required
                      </h2>
                      <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-normal">
                        To unlock your PayVora account features, please configure your verification checklist parameters below.
                      </p>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2.5 bg-black/40 p-4 rounded-xl border border-white/5 text-left">
                      
                      {/* KYC Check */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.01] border border-white/5">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-white">Identity Verification (KYC)</p>
                          <p className="text-[9px] text-gray-400">Required legal verification status</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          kycStatus === 'APPROVED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {kycStatus === 'APPROVED' ? 'Approved' : 'Pending'}
                        </span>
                      </div>

                      {/* Transaction PIN Check */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.01] border border-white/5">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-white">Transaction PIN</p>
                          <p className="text-[9px] text-gray-400">Secures transfers and recharges</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          pinSet 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {pinSet ? 'Configured' : 'Missing'}
                        </span>
                      </div>

                      {/* MFA Check */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.01] border border-white/5">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-white">Multi-Factor Auth (MFA)</p>
                          <p className="text-[9px] text-gray-400">Two-factor login protection</p>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          mfaEnabled 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      {kycStatus !== 'APPROVED' && (
                        <Link
                          to="/profile"
                          className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-violet-600/10 text-center"
                        >
                          Complete KYC
                        </Link>
                      )}
                      {(!pinSet || !mfaEnabled) && (
                        <Link
                          to="/security"
                          className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black transition-all border border-white/5 text-center"
                        >
                          Configure PIN / MFA
                        </Link>
                      )}
                    </div>

                  </div>
                </div>
              );
            }

            return children;
          })()}
        </main>
      </div>

      {/* Floating Help & Guidance Drawer */}
      <FloatingHelpWidget />
    </div>
  );
};
