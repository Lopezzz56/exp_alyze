'use client';

import React, { useEffect, useMemo } from 'react';
import { useCommissionStats } from '@/hooks/useCommissionStats';
import { AIInsightBanner } from '@/components/dashboard/AIInsightBanner';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { EntityBreakdown } from '@/components/dashboard/EntityBreakdown';
import { 
  IndianRupee, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock, 
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Coins,
  Activity
} from 'lucide-react';
import Link from 'next/link';

import { DateFilterBar } from '@/components/DateFilterBar';

export default function DashboardOverviewPage() {
  const { 
    transactions,
    filter,
    setFilter,
    stats, 
    monthlyPayouts, 
    revenueSplit, 
    aiReport, 
    aiLoading, 
    loading, 
    error, 
    fetchMetrics,
    fetchInsights,
    toggleSettlement
  } = useCommissionStats();

  useEffect(() => {
    fetchMetrics();
    fetchInsights();
  }, [fetchMetrics, fetchInsights]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getCommissionCardTitle = () => {
    if (filter.type === 'ALL') return 'Total Commission (All Time)';
    if (filter.type === 'FY_25_26') return 'Total Commission (FY 2025-26)';
    if (filter.type === 'FY_24_25') return 'Total Commission (FY 2024-25)';
    if (filter.type.startsWith('Q')) return `Total Commission (${filter.type})`;
    if (filter.type === 'MONTH') {
      if (filter.monthValue) {
        const [year, month] = filter.monthValue.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return `Total Commission (${date.toLocaleString('default', { month: 'short', year: '2-digit' })})`;
      }
      return 'Total Commission (Monthly)';
    }
    return 'Total Commission';
  };

  // 1. Client Transit Receivables calculations
  const pendingTransitTxs = useMemo(() => {
    return transactions.filter(t => t.is_pass_through && !t.is_settled && t.withdrawal_dr > 0);
  }, [transactions]);

  const totalPendingTransitAmount = useMemo(() => {
    return pendingTransitTxs.reduce((sum, t) => sum + (t.withdrawal_dr || 0), 0);
  }, [pendingTransitTxs]);

  // 2. MoM Payout Delta & Trend Monitor calculations
  const momTrends = useMemo(() => {
    if (monthlyPayouts.length < 2) return [];
    
    // monthlyPayouts is sorted chronological reverse (newest first)
    const lastMonth = monthlyPayouts[0];
    const prevMonth = monthlyPayouts[1];
    const trends: { entity: string; change: number }[] = [];
    
    Object.keys(lastMonth).forEach(key => {
      if (key === 'month') return;
      const lastVal = Number(lastMonth[key]) || 0;
      const prevVal = Number(prevMonth[key]) || 0;
      
      if (prevVal > 0) {
        const pct = ((lastVal - prevVal) / prevVal) * 100;
        trends.push({ entity: key, change: pct });
      } else if (lastVal > 0) {
        trends.push({ entity: key, change: 100.0 });
      }
    });
    
    return trends.sort((a, b) => b.change - a.change);
  }, [monthlyPayouts]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Overview</h1>
          <p className="text-sm text-slate-500 font-medium">Real-time revenue distributions and financial compliance analytics</p>
        </div>
        <Link 
          href="/upload" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-[0_4px_12px_rgba(37,99,235,0.2)] active:scale-[0.98] cursor-pointer"
        >
          Ingest Statement
        </Link>
      </div>

      {/* Date Filter Selection Bar */}
      <DateFilterBar value={filter} onChange={setFilter} />

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-sm">Dashboard Loading Discrepancy</h5>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              We encountered an issue fetching analytical updates from the server: {error}
            </p>
          </div>
        </div>
      )}

      {/* AI Intelligence Center Banner */}
      <AIInsightBanner report={aiReport} loading={aiLoading} />

      {/* Key Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title={getCommissionCardTitle()}
          value={stats ? formatCurrency(stats.total_commission_period) : '₹0.00'}
          icon={<IndianRupee className="w-4.5 h-4.5 text-blue-600" />}
          subtext="Sum of period commissions"
          loading={loading}
        />
        <MetricCard
          title="Total Commission (FYTD)"
          value={stats ? formatCurrency(stats.total_commission_ytd) : '₹0.00'}
          icon={<IndianRupee className="w-4.5 h-4.5 text-emerald-600" />}
          subtext="Current Financial Year-to-Date"
          loading={loading}
        />
        <MetricCard
          title="Active AMCs & Insurers"
          value={stats ? stats.active_amcs : 0}
          icon={<Building2 className="w-4.5 h-4.5 text-violet-600" />}
          subtext="Channel partners with payouts"
          loading={loading}
        />
        <MetricCard
          title="Pending Pass-Through"
          value={stats ? formatCurrency(stats.pending_pass_through) : '₹0.00'}
          icon={<Clock className="w-4.5 h-4.5 text-amber-600" />}
          subtext="Awaiting cash settlement"
          trend={stats && stats.pending_pass_through > 0 ? { value: 'Attention', isPositive: false } : undefined}
          loading={loading}
        />
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 w-full">
        <div className="lg:col-span-8 flex min-w-0 w-full">
          <RevenueChart data={monthlyPayouts} loading={loading} />
        </div>
        <div className="lg:col-span-4 flex min-w-0 w-full">
          <EntityBreakdown data={revenueSplit} loading={loading} />
        </div>
      </div>

      {/* Dynamic Receivables and Trend Monitor Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Widget 1: Client Transit & Cash Receivables Radar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 transition-all duration-300 hover:shadow-[0_6px_25px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">Client Transit & Cash Receivables</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pending premium cash transited to insurance payouts</p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 border border-amber-100 text-amber-700 font-mono">
                {formatCurrency(totalPendingTransitAmount)} Pending
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-slate-350 animate-spin" />
              </div>
            ) : pendingTransitTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-100 rounded-xl bg-slate-50/20 text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <p className="text-xs font-bold text-slate-700">All Transit Accounts Settled</p>
                <p className="text-[10px] mt-0.5 text-center px-4">No outstanding cash receivables collected from clients.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-56 pr-1 space-y-3">
                {pendingTransitTxs.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl flex items-center justify-between gap-4 hover:border-slate-200 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800 truncate block">{tx.clean_entity || 'Unresolved Entity'}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-200/50 text-slate-500 rounded-md uppercase tracking-wider font-mono">Transit</span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-semibold mt-0.5 truncate">{tx.raw_narration}</p>
                      <span className="text-[9px] font-bold text-slate-400 block mt-1 font-mono">📅 {tx.transaction_date}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-xs text-slate-900 font-mono">{formatCurrency(tx.withdrawal_dr)}</span>
                      <button
                        onClick={async () => {
                          if (tx.id) {
                            await toggleSettlement(tx.id, true);
                          }
                        }}
                        className="p-1.5 rounded-lg border border-slate-250 hover:bg-emerald-50 hover:border-emerald-100 hover:text-emerald-600 text-slate-500 transition-colors cursor-pointer"
                        title="Mark Cash Collected"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {pendingTransitTxs.length > 5 && (
            <div className="mt-4 pt-3 border-t border-slate-50 text-center">
              <span className="text-[10px] font-semibold text-slate-400">And {pendingTransitTxs.length - 5} more pending items...</span>
            </div>
          )}
        </div>

        {/* Widget 2: MoM Payout Delta & Trend Monitor */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 transition-all duration-300 hover:shadow-[0_6px_25px_rgba(0,0,0,0.06)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900 tracking-tight">MoM Payout Delta & Trend Monitor</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Top monthly payout performance growth index</p>
              </div>
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Coins className="w-4 h-4" />
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 text-slate-350 animate-spin" />
              </div>
            ) : momTrends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-100 rounded-xl bg-slate-50/20 text-slate-400 text-center">
                <Activity className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">Trend Stream Preparing</p>
                <p className="text-[10px] mt-0.5 px-4">Need at least 2 active months of transaction records to compile delta changes.</p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-56 pr-1 divide-y divide-slate-100 text-xs">
                {momTrends.slice(0, 5).map((trend, idx) => {
                  const isUp = trend.change >= 0;
                  return (
                    <div key={idx} className="py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors px-1">
                      <span className="font-bold text-slate-750">{trend.entity}</span>
                      <span className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                        isUp ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isUp ? '+' : ''}{trend.change.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {momTrends.length > 5 && (
            <div className="mt-4 pt-3 border-t border-slate-50 text-center">
              <span className="text-[10px] font-semibold text-slate-400">Total monitored partners: {momTrends.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
