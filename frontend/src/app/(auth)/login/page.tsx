'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Mail, Lock, Sparkles, TrendingUp, ShieldCheck, ArrowRight, Loader2, UserPlus, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithPassword, registerWithPassword, resetPassword, updatePassword, isRecovery } = useSupabaseAuth();
  
  type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isRecovery || searchParams?.get('mode') === 'reset') {
      setMode('reset');
    }
  }, [isRecovery, searchParams]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!email) {
          setErrorMessage('Please enter your email address.');
          setLoading(false);
          return;
        }
        await resetPassword(email);
        setSuccessMessage('Password reset link sent! Please check your email inbox.');
      } else if (mode === 'reset') {
        if (!password) {
          setErrorMessage('Please enter a new password.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Passwords do not match.');
          setLoading(false);
          return;
        }
        await updatePassword(password);
        setSuccessMessage('Your password has been reset successfully! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else if (mode === 'register') {
        if (!email || !password) {
          setErrorMessage('Please enter both email and password.');
          setLoading(false);
          return;
        }
        await registerWithPassword(email, password);
        setSuccessMessage('Account registered successfully! Redirecting you to the dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        if (!email || !password) {
          setErrorMessage('Please enter both email and password.');
          setLoading(false);
          return;
        }
        await loginWithPassword(email, password);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const getHeading = () => {
    switch (mode) {
      case 'register':
        return 'Register Account';
      case 'forgot':
        return 'Reset Password';
      case 'reset':
        return 'Set New Password';
      default:
        return 'Welcome back';
    }
  };

  const getSubheading = () => {
    switch (mode) {
      case 'register':
        return 'Create your credentials to get started.';
      case 'forgot':
        return 'Enter your email address and we will send you a reset link.';
      case 'reset':
        return 'Enter a new password for your account.';
      default:
        return 'Access your executive commission portal.';
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-slate-900">ExpAlyze</span>
      </div>

      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {getHeading()}
        </h2>
        <p className="mt-1 text-slate-500 text-sm">
          {getSubheading()}
        </p>
      </div>

      <form onSubmit={handleAuthAction} className="mt-8 space-y-5">
        {errorMessage && (
          <div className="p-4 rounded-xl text-sm border bg-rose-50/50 text-rose-800 border-rose-100 flex items-start gap-2">
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}
        
        {successMessage && (
          <div className="p-4 rounded-xl text-sm border bg-emerald-50/50 text-emerald-800 border-emerald-100 flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {mode !== 'reset' && (
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
              Email Address
            </label>
            <div className="relative mt-1">
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 focus:bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                required
              />
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}

        {mode !== 'forgot' && (
          <div>
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-500 font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 focus:bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                required
              />
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}

        {mode === 'reset' && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 focus:bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm"
                required
              />
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 cursor-pointer transition-all active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="w-4.5 h-4.5 animate-spin" />
          ) : (
            <>
              {mode === 'forgot' && 'Send Reset Link'}
              {mode === 'reset' && 'Update Password'}
              {mode === 'register' && 'Register Account'}
              {mode === 'login' && 'Sign In'}

              {mode === 'forgot' && <KeyRound className="w-4 h-4" />}
              {mode === 'reset' && <CheckCircle2 className="w-4 h-4" />}
              {mode === 'register' && <UserPlus className="w-4 h-4" />}
              {mode === 'login' && <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3">
        {mode === 'forgot' || mode === 'reset' ? (
          <button
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            type="button"
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
        ) : (
          <button
            onClick={() => {
              setMode(mode === 'register' ? 'login' : 'register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            type="button"
            className="text-xs text-blue-600 hover:text-blue-500 font-semibold transition-all hover:underline cursor-pointer"
          >
            {mode === 'register' ? 'Already have an account? Sign In' : 'Register new account'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50/30">
      {/* Left Panel: Hero & Preview */}
      <div className="hidden lg:flex lg:col-span-7 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-tr from-slate-100 via-white to-blue-50/50 border-r border-slate-100">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-50/60 blur-3xl -z-10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-50/30 blur-3xl -z-10" />

        {/* Header Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">ExpAlyze</span>
        </div>

        {/* Core Value Prop */}
        <div className="my-auto max-w-xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mb-6">
            Executive Ledger & <span className="text-blue-600">Commission Analytics</span> for Smart IFAs
          </h1>
          <p className="text-slate-600 text-lg mb-8 leading-relaxed">
            Ingest statements, verify balances with 100% mathematical precision, and track multi-channel brokerage streams under a unified executive overview.
          </p>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Stream Contribution</p>
                <h4 className="text-2xl font-bold text-slate-900 mt-1">₹4,28,450.00</h4>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                +12.4% MoM
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">SBI Mutual Fund</span>
                <span className="text-slate-800 font-semibold">₹1,25,000.00</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">Prudent Corporate</span>
                <span className="text-slate-800 font-semibold">₹3,10,000.00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Life Insurance Corp (Transit)</span>
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  Pending Cash
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secured with Supabase Auth & PostgreSQL RLS Policies</span>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex col-span-1 lg:col-span-5 flex-col justify-center px-6 py-12 md:px-12 lg:px-16 bg-white">
        <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>}>
          <LoginFormContent />
        </Suspense>
      </div>
    </main>
  );
}
