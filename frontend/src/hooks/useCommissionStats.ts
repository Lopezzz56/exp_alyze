import { useState, useCallback, useMemo } from 'react';
import { DashboardStats, MonthlyPayout, RevenueSplit, RecentPayout, AIInsight } from '../types';
import { supabase } from '../lib/supabaseClient';
import { DateFilter, isTxInDateRange } from '../lib/dateFilters';
import { API_BASE_URL } from '../lib/constants';

export function useCommissionStats() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filter, setFilter] = useState<DateFilter>({ type: 'ALL' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Structured Report States
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [marketNews, setMarketNews] = useState<any[]>([]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Fetch metrics error:', err);
      setError(err.message || 'Failed to compute dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/insights`);
      if (!res.ok) throw new Error('Failed to retrieve structured AI executive reports.');
      const data = await res.json();
      setAiReport(data.report);
      setMarketNews(data.news || []);
    } catch (err: any) {
      console.error('Fetch AI insights error:', err);
    } finally {
      setAiLoading(false);
    }
  }, []);

  // 1. Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => isTxInDateRange(t.transaction_date, filter));
  }, [transactions, filter]);

  // 2. Computed Dashboard Statistics
  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Financial Year Start Year: April 1 is the boundary
    const currentFyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    const currentFyStart = new Date(`${currentFyStartYear}-04-01T00:00:00`);

    let totalPeriod = 0;
    let totalMtd = 0;
    let totalFytd = 0;
    let totalInflows = 0;
    let totalOutflows = 0;
    let pendingPt = 0;
    const uniqueAmcs = new Set<string>();

    let targetMonth = currentMonth;
    let targetYear = currentYear;
    const creditTransactions = filteredTransactions.filter(t => t.deposit_cr > 0);
    
    if (creditTransactions.length > 0) {
      const latestTxDate = new Date(creditTransactions[0].transaction_date);
      const hasCurrentMonthData = creditTransactions.some(t => {
        const d = new Date(t.transaction_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      if (!hasCurrentMonthData) {
        targetMonth = latestTxDate.getMonth();
        targetYear = latestTxDate.getFullYear();
      }
    }

    // 1. Calculate stats within active filter period
    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.transaction_date);
      const cr = tx.deposit_cr || 0;
      const dr = tx.withdrawal_dr || 0;

      totalInflows += cr;
      totalOutflows += dr;

      if (cr > 0) {
        totalPeriod += cr;
        if (tx.clean_entity && tx.clean_entity !== 'Unresolved Entity') {
          uniqueAmcs.add(tx.clean_entity);
        }
        if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
          totalMtd += cr;
        }
      }

      if (tx.is_pass_through && !tx.is_settled && dr > 0) {
        pendingPt += dr;
      }
    });

    // 2. Calculate dynamic Financial Year to Date (FYTD) from ALL transactions
    transactions.forEach((tx) => {
      const cr = tx.deposit_cr || 0;
      if (cr > 0 && tx.transaction_date) {
        const txDate = new Date(tx.transaction_date);
        if (txDate >= currentFyStart) {
          totalFytd += cr;
        }
      }
    });

    return {
      total_commission_period: totalPeriod,
      total_commission_mtd: totalMtd,
      total_commission_ytd: totalFytd, // Bounded to the dynamically calculated FYTD
      active_amcs: uniqueAmcs.size,
      net_inflows: totalInflows - totalOutflows,
      pending_pass_through: pendingPt,
    };
  }, [filteredTransactions, transactions]);

  // 3. Month-over-Month Commission Payouts (by Institution)
  const monthlyPayouts = useMemo<MonthlyPayout[]>(() => {
    const creditTransactions = filteredTransactions.filter(t => t.deposit_cr > 0);
    const monthlyGroups: { [monthKey: string]: { [entity: string]: number } } = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    creditTransactions.forEach((tx) => {
      const d = new Date(tx.transaction_date);
      const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = {};
      }
      
      const entity = tx.clean_entity || 'Unresolved Entity';
      monthlyGroups[monthKey][entity] = (monthlyGroups[monthKey][entity] || 0) + tx.deposit_cr;
    });

    return Object.keys(monthlyGroups).map((monthKey) => {
      const payout: MonthlyPayout = { month: monthKey };
      Object.keys(monthlyGroups[monthKey]).forEach((entity) => {
        payout[entity] = monthlyGroups[monthKey][entity];
      });
      return payout;
    }).reverse();
  }, [filteredTransactions]);

  // 4. Revenue Stream Distribution
  const revenueSplit = useMemo<RevenueSplit[]>(() => {
    const creditTransactions = filteredTransactions.filter(t => t.deposit_cr > 0);
    const streamGroups: { [stream: string]: number } = {};
    
    creditTransactions.forEach((tx) => {
      const stream = tx.revenue_stream || 'General Inflow';
      streamGroups[stream] = (streamGroups[stream] || 0) + tx.deposit_cr;
    });

    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];
    return Object.keys(streamGroups).map((stream, idx) => ({
      name: stream,
      value: streamGroups[stream],
      color: colors[idx % colors.length],
    }));
  }, [filteredTransactions]);

  // 5. Recent Payouts Table
  const recentPayouts = useMemo<RecentPayout[]>(() => {
    const creditTransactions = filteredTransactions.filter(t => t.deposit_cr > 0);
    return creditTransactions.slice(0, 10).map((tx) => ({
      id: tx.id,
      date: tx.transaction_date,
      entity: tx.clean_entity || 'Unresolved Entity',
      stream: tx.revenue_stream || 'General Inflow',
      amount: tx.deposit_cr,
      reference_no: tx.reference_no || 'N/A',
    }));
  }, [filteredTransactions]);

  const toggleSettlement = useCallback(async (transactionId: string, isSettled: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_settled: isSettled })
        .eq('id', transactionId);

      if (updateError) throw updateError;
      
      // Update local transactions state
      setTransactions(prev =>
        prev.map(tx => (tx.id === transactionId ? { ...tx, is_settled: isSettled } : tx))
      );
    } catch (err: any) {
      console.error('Toggle settlement error:', err);
    }
  }, []);

  return {
    transactions,
    filter,
    setFilter,
    stats,
    monthlyPayouts,
    revenueSplit,
    recentPayouts,
    aiReport,
    aiLoading,
    marketNews,
    loading,
    error,
    fetchMetrics,
    fetchInsights,
    toggleSettlement,
  };
}
