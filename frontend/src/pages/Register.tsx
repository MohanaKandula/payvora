import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosInstance } from '../api/axiosInstance';
import { Wallet, KeyRound, User, AlertCircle, Mail, ArrowRight, Phone, Gift } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axiosInstance.post('/api/auth/register', {
        username,
        email,
        password,
        fullName,
        phoneNumber,
        referralCode: referralCode.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const data = err.response?.data;
      let errMsg = 'Registration failed. Please check details.';
      if (data) {
        if (typeof data === 'string') errMsg = data;
        else if (data.message) errMsg = data.message;
        else if (typeof data === 'object') errMsg = Object.values(data).join(', ');
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b0b0f] relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl animate-fade-in relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-3.5 rounded-2xl glow-purple mb-4">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display font-bold text-2xl text-white">Create Account</h2>
          <p className="text-sm text-gray-400 mt-1">Get started with a premium audit ledger account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            Registration successful! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600 text-sm"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600 text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between">
              <span>Full Name</span>
              <span className="text-[10px] text-violet-400/70 lowercase tracking-normal">Match ID card exactly</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600 text-sm"
                placeholder="Enter full name"
              />
            </div>
            <p className="text-[10px] text-violet-400/80 mt-1 leading-normal font-semibold">
              ⚠️ This name must match your KYC identification document exactly and must be unique.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600 text-sm"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex justify-between">
              <span>Referral Code</span>
              <span className="text-gray-550 font-normal normal-case">Optional</span>
            </label>
            <div className="relative">
              <Gift className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600 text-sm font-mono tracking-wider"
                placeholder="REF-XXXXXXXX"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(139,92,246,0.3)] mt-2"
          >
            {loading ? 'Creating...' : 'Register'}
            {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
