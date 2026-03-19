import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Helper function to convert role string to enum
  const parseRole = (role: string | number): UserRole => {
    if (typeof role === 'number') return role as UserRole;
    if (role === 'Admin' || role === 'ADMIN' || role === '0') return UserRole.ADMIN;
    if (role === 'Customer' || role === 'CUSTOMER' || role === '1') return UserRole.CUSTOMER;
    return UserRole.CUSTOMER; // Default to customer
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!email || password.length < 6) {
        throw new Error('Please enter valid credentials (password min 6 chars).');
      }

      const res = await authService.login({
        email: email.toLowerCase(),
        password: password
      });

      const user = res.data.user || res.data.User;
      const token = res.data.token || res.data.Token;
      const roleEnum = parseRole(user.role);

      // Check subscription for customer role users
      if (roleEnum === UserRole.CUSTOMER) {
        // No subscription
        if (!user.isSubscriptionActive && user.subscriptionStatus === 'None') {
          throw new Error('❌ No Active Subscription\n\nYou do not have any active subscription. Please contact the administrator to assign a subscription plan.');
        }

        // Check if subscription is active
        if (!user.isSubscriptionActive || user.subscriptionStatus !== 'Active') {
          throw new Error('❌ Subscription Inactive\n\nYour subscription is not currently active. Please contact the administrator to renew or activate your subscription.');
        }

        // Check if subscription end date exists and validate date range
        if (user.subscriptionEndDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const endDate = new Date(user.subscriptionEndDate);
          endDate.setHours(23, 59, 59, 999);

          // Check if subscription has expired
          if (today > endDate) {
            throw new Error(`⏰ Subscription Expired\n\nYour subscription expired on ${endDate.toLocaleDateString()}. Please contact your administrator to renew your plan.`);
          }

          // Calculate days remaining
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysRemaining <= 7 && daysRemaining > 0) {
            console.warn(`⚠️ Subscription Expiring Soon\n\nYour subscription expires in ${daysRemaining} days.`);
          }
        }
      }

      // Convert role string to proper enum value
      const normalizedUser: User = {
        ...user,
        role: roleEnum,
        token
      };

      onLogin(normalizedUser);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Authentication failed. Check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center space-x-3 group mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 transform transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
              <i className="fas fa-bridge-water text-white text-4xl"></i>
            </div>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter">Setu</h1>
          <p className="text-emerald-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-2">Enterprise Suite</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8 sm:p-10">
            <h2 className="text-2xl font-black text-white mb-1.5">Welcome Back</h2>
            <p className="text-sm text-slate-400 mb-8">Sign in to access your business portal</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Work Email / Username</label>
                <div className="relative">
                  <input
                    id="login-email"
                    required
                    type="email"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pl-12 placeholder:text-slate-500"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                  />
                  <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"></i>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pl-12 pr-12 placeholder:text-slate-500"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"></i>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center">
                  <i className="fas fa-exclamation-circle mr-2 text-red-400"></i> {error}
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center group overflow-hidden relative disabled:opacity-50"
              >
                {isLoading ? (
                  <><i className="fas fa-circle-notch fa-spin text-lg mr-2"></i> Signing In...</>
                ) : (
                  <>
                    <span className="uppercase tracking-widest text-xs">Enter Dashboard</span>
                    <i className="fas fa-arrow-right ml-2 transition-transform group-hover:translate-x-1"></i>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[10px] text-slate-500 text-center font-medium">
                <i className="fas fa-info-circle mr-1.5 text-blue-400"></i>
                New user? Contact your <span className="text-blue-400 font-bold">Admin</span> to get your login credentials.
              </p>
            </div>
          </div>

          <div className="bg-white/[0.02] p-5 text-center border-t border-white/5">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center justify-center">
              Secured by Setu India <i className="fas fa-shield-check text-emerald-500 ml-2"></i>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
