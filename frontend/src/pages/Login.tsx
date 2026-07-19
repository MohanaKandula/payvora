import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosInstance } from '../api/axiosInstance';
import { Wallet, KeyRound, User, AlertCircle, ArrowRight, Phone, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'sms'>('totp');
  const [smsCode, setSmsCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isRequestingSms, setIsRequestingSms] = useState(false);

  // Forgot Password States
  const [forgotPasswordMode, setForgotPasswordMode] = useState<'none' | 'username_input' | 'otp_sent'>('none');
  const [forgotUsername, setForgotUsername] = useState('');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotAadhaarId, setForgotAadhaarId] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isRequestingPasswordOtp, setIsRequestingPasswordOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/login', {
        username,
        password,
      });

      if (response.data.mfaStatus === 'MFA_REQUIRED') {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      const { accessToken, refreshToken, accountId } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('accountId', accountId);
      
      navigate('/dashboard');
    } catch (err: any) {
      const data = err.response?.data;
      let errMsg = 'Invalid credentials. Please try again.';
      if (data) {
        if (typeof data === 'string') errMsg = data;
        else if (data.error) errMsg = data.error;
        else if (data.message) errMsg = data.message;
        else if (typeof data === 'object') errMsg = Object.values(data).join(', ');
      }
      if (errMsg.toLowerCase().includes('bad credentials')) {
        errMsg = 'Invalid username or password. Please try again or create a new account.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/mfa/verify', {
        username,
        code: mfaCode,
      });

      const { accessToken, refreshToken, accountId } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('accountId', accountId);
      
      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid 2FA code. Please check your authenticator application.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMfaOtp = async () => {
    setIsRequestingSms(true);
    setError('');
    try {
      const response = await axiosInstance.post('/api/auth/mfa/send-otp', { username });
      if (response.data.status === 'SUCCESS') {
        setMaskedPhone(response.data.maskedPhone || '');
        setMfaMethod('sms');
      } else {
        setError(response.data.message || 'Failed to send SMS OTP.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to send SMS OTP. Verify your account has a phone number registered.';
      setError(typeof msg === 'string' ? msg : 'Failed to send SMS OTP.');
    } finally {
      setIsRequestingSms(false);
    }
  };

  const handleSmsMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axiosInstance.post('/api/auth/mfa/verify-otp', {
        username,
        code: smsCode,
      });

      const { accessToken, refreshToken, accountId } = response.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('accountId', accountId);
      
      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid SMS OTP code. Please check your messages.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setError('Username is required.');
      return;
    }
    if (!forgotAadhaarId.trim()) {
      setError('Aadhaar ID number is required.');
      return;
    }
    setIsRequestingPasswordOtp(true);
    setError('');
    setForgotSuccess('');
    try {
      const response = await axiosInstance.post('/api/accounts/password/forgot-request', {
        username: forgotUsername.trim(),
        aadhaarId: forgotAadhaarId.trim()
      });
      if (response.data.status === 'SUCCESS') {
        setMaskedPhone(response.data.maskedPhone || '');
        setForgotPasswordMode('otp_sent');
      } else {
        setError(response.data.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Make sure your username and Aadhaar ID match our records.');
    } finally {
      setIsRequestingPasswordOtp(false);
    }
  };

  const handleForgotPassResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (passwordOtp.length !== 6 || !/^\d+$/.test(passwordOtp)) {
      setError('OTP must be exactly 6 digits.');
      return;
    }
    setIsResettingPassword(true);
    setError('');
    try {
      const response = await axiosInstance.post('/api/accounts/password/forgot-reset', {
        username: forgotUsername.trim(),
        otp: passwordOtp,
        newPassword: newPassword
      });
      if (response.data.status === 'SUCCESS') {
        setForgotSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          setForgotPasswordMode('none');
          setForgotSuccess('');
          setForgotUsername('');
          setPasswordOtp('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2500);
      } else {
        setError(response.data.message || 'Reset failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Invalid or expired OTP.');
    } finally {
      setIsResettingPassword(false);
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
          <h2 className="font-display font-bold text-2xl text-white">
            {forgotPasswordMode !== 'none' ? 'Reset Password' : mfaRequired ? '2FA Verification' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {forgotPasswordMode === 'username_input' 
              ? 'Enter username to request reset OTP' 
              : forgotPasswordMode === 'otp_sent'
                ? 'Enter reset code and your new password'
                : mfaRequired 
                  ? 'Enter your 6-digit Google Authenticator code' 
                  : 'Sign in to your event-sourced wallet'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {forgotSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 animate-pulse" />
            <span>{forgotSuccess}</span>
          </div>
        )}

        {forgotPasswordMode === 'username_input' ? (
          <form onSubmit={handleForgotPassClick} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Aadhaar ID Number (Must match KYC)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={forgotAadhaarId}
                  onChange={(e) => setForgotAadhaarId(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600"
                  placeholder="Enter your 12-digit Aadhaar number"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isRequestingPasswordOtp}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isRequestingPasswordOtp ? 'Sending OTP...' : 'Send OTP'}
              {!isRequestingPasswordOtp && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>

            <div className="text-center pt-3 border-t border-white/5 mt-2">
              <button
                type="button"
                onClick={() => { setForgotPasswordMode('none'); setError(''); }}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : forgotPasswordMode === 'otp_sent' ? (
          <form onSubmit={handleForgotPassResetSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-left">
                SMS OTP Code (Sent to ******{maskedPhone})
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={passwordOtp}
                  onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white text-center font-mono font-bold tracking-widest text-sm placeholder:text-gray-600"
                  placeholder="6-digit OTP"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600"
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isResettingPassword}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isResettingPassword ? 'Resetting Password...' : 'Reset Password'}
              {!isResettingPassword && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>

            <div className="text-center pt-3 border-t border-white/5 mt-2">
              <button
                type="button"
                onClick={() => { setForgotPasswordMode('username_input'); setError(''); }}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
              >
                Change Username / Resend OTP
              </button>
            </div>
          </form>
        ) : !mfaRequired ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                />
              </div>
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={() => { setForgotPasswordMode('username_input'); setError(''); setForgotSuccess(''); }}
                  className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(139,92,246,0.3)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.4)]"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </form>
        ) : mfaMethod === 'totp' ? (
          <form onSubmit={handleMfaSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                MFA / 2FA Token Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  required
                  maxLength={9}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white text-center font-mono font-bold tracking-widest text-sm placeholder:text-gray-600"
                  placeholder="6-digit TOTP or XXXX-XXXX"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(139,92,246,0.3)]"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>

            <div className="text-center pt-3 border-t border-white/5 mt-2">
              <button
                type="button"
                disabled={isRequestingSms}
                onClick={handleSendMfaOtp}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer disabled:opacity-50"
              >
                {isRequestingSms ? 'Sending OTP...' : 'Send OTP to registered phone instead'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSmsMfaSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 text-left">
                SMS OTP Code (Sent to ******{maskedPhone})
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:bg-white/[0.05] focus:outline-none text-white text-center font-mono font-bold tracking-widest text-sm placeholder:text-gray-600"
                  placeholder="6-digit OTP"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(139,92,246,0.3)]"
            >
              {loading ? 'Verifying...' : 'Verify OTP & Login'}
              {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />}
            </button>

            <div className="text-center pt-3 border-t border-white/5 mt-2">
              <button
                type="button"
                onClick={() => setMfaMethod('totp')}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
              >
                Back to Google Authenticator
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          {forgotPasswordMode !== 'none' ? (
            <button
              onClick={() => { setForgotPasswordMode('none'); setError(''); }}
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
            >
              Back to Sign In
            </button>
          ) : !mfaRequired ? (
            <>
              Don't have an account?{' '}
              <Link to="/register" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                Register now
              </Link>
            </>
          ) : (
            <button
              onClick={() => setMfaRequired(false)}
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors bg-transparent border-none outline-none cursor-pointer"
            >
              Back to Sign In
            </button>
          )}
        </p>
      </div>
    </div>
  );
};
