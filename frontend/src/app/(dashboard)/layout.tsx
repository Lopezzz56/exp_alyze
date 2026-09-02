'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { 
  Sparkles, 
  LayoutDashboard, 
  Percent, 
  Receipt, 
  UploadCloud, 
  Newspaper,
  LogOut, 
  User, 
  Menu, 
  X,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

function SidebarLink({ href, icon, label, active, onClick }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
        active 
          ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.15)] font-semibold' 
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useSupabaseAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dbConfigError, setDbConfigError] = useState(false);

  // Client-side route protection
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Check if env variables are configured
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setDbConfigError(true);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Checking credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Don't render dashboard while redirecting
  }

  const navItems = [
    { href: '/dashboard', label: 'Executive Overview', icon: <LayoutDashboard className="w-4.5 h-4.5" /> },
    { href: '/commissions', label: 'Commissions Hub', icon: <Percent className="w-4.5 h-4.5" /> },
    { href: '/transactions', label: 'Master Ledger', icon: <Receipt className="w-4.5 h-4.5" /> },
    { href: '/upload', label: 'Ingest Statements', icon: <UploadCloud className="w-4.5 h-4.5" /> },
    { href: '/market-news', label: 'Market News Feed', icon: <Newspaper className="w-4.5 h-4.5" /> },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-100 bg-white flex-col justify-between p-6 fixed inset-y-0 left-0 z-30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ExpAlyze</span>
          </Link>

          {/* Navigation */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname === item.href}
              />
            ))}
          </nav>
        </div>

        {/* Profile & Logout */}
        <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user?.email?.split('@')[0] || 'Advisor'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || 'advisor@expalyze.com'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50/50 hover:text-rose-700 transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 fixed top-0 inset-x-0 z-30 shadow-[0_2px_10px_rgba(0,0,0,0.01)]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">ExpAlyze</span>
        </Link>

        <button
          onClick={handleLogout}
          className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-colors focus:outline-none cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 pt-16 pb-16 lg:pt-0 lg:pb-0 flex flex-col min-h-screen">
        <main className="flex-1 p-4 md:p-8">
          {/* Missing Env Variables Warning Banner */}
          {dbConfigError && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 text-amber-800 shadow-sm animate-pulse">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-semibold text-sm">Supabase Credentials Missing</h5>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  ExpAlyze is running in interface mode. Please configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to enable statement uploads and ledger saving.
                </p>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1.5 flex-1 py-2 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer ${
                isActive ? 'text-blue-600 font-semibold' : ''
              }`}
            >
              {React.cloneElement(item.icon, { 
                className: `w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:scale-105' 
                }` 
              })}
              <span className={`text-[10px] tracking-tight transition-colors ${isActive ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                {item.label === 'Ingest Statements' ? 'Ingest' : item.label.split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
