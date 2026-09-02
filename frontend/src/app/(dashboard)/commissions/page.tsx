'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { DateFilterBar } from '@/components/DateFilterBar';
import { DateFilter, isTxInDateRange } from '@/lib/dateFilters';
import { supabase } from '@/lib/supabaseClient';
import { 
  Landmark, 
  TrendingUp, 
  Calendar, 
  BadgePercent, 
  AlertCircle, 
  Loader2, 
  Building2, 
  Coins, 
  Layers, 
  FileSpreadsheet,
  X,
  Edit2,
  GitMerge,
  ArrowRight
} from 'lucide-react';

interface CompanyStats {
  type: 'MAJOR' | 'DIVIDEND' | 'OTHER' | 'INDIVIDUAL' | string;
  name: string;
  dbEntityName: string;
  totalCommission: number;
  txCount: number;
  avgTicket: number;
  lastPayoutDate: string;
  color: string;
  bgGradient: string;
  subtext?: string;
}

type GroupType = 'MAJOR' | 'DIVIDEND' | 'OTHER';

export default function CommissionsPage() {
  const { transactions, loading, error, fetchTransactions } = useTransactions();
  
  const [filter, setFilter] = useState<DateFilter>({ type: 'ALL' });
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'consolidated' | 'individual'>('consolidated');
  
  // Track active sub-group drill-down view
  const [activeGroupCard, setActiveGroupCard] = useState<string | null>(null);

  // Custom client-side group mapping
  const [customGroups, setCustomGroups] = useState<{ [key: string]: GroupType }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expalyze_custom_groups');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  // Edit / Merge dialog state
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'rename' | 'merge' | 'group'>('rename');
  const [selectedSourceEntity, setSelectedSourceEntity] = useState('');
  const [selectedTargetEntity, setSelectedTargetEntity] = useState('');
  const [newEntityName, setNewEntityName] = useState('');
  const [isModalSaving, setIsModalSaving] = useState(false);

  // Persist custom groups locally
  useEffect(() => {
    localStorage.setItem('expalyze_custom_groups', JSON.stringify(customGroups));
  }, [customGroups]);

  // Reset drill-down view whenever layout mode changes
  useEffect(() => {
    setActiveGroupCard(null);
  }, [viewMode]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reactive date range filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => isTxInDateRange(tx.transaction_date, filter));
  }, [transactions, filter]);

  // Unique list of active entities for selection dropdowns
  const activeEntitiesList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.clean_entity) set.add(t.clean_entity);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // helper to check default Majors
  const isMajorDefault = (ent: string) => {
    const coreMajors = ['Life Insurance Corporation', 'Star Health', 'New India Assurance', 'Prudent', 'NJ India', 'Nippon', 'Aditya Birla', 'SBI'];
    return coreMajors.some(m => ent.toLowerCase().includes(m.toLowerCase()));
  };

  // 1. Dynamic Aggregation: Group ALL credit transactions individually
  const companySummary = useMemo(() => {
    const entitiesMap: { [key: string]: any[] } = {};
    
    filteredTransactions.forEach((tx) => {
      if (tx.deposit_cr > 0) {
        const entName = tx.clean_entity || 'Unresolved Entity';
        if (!entitiesMap[entName]) {
          entitiesMap[entName] = [];
        }
        entitiesMap[entName].push(tx);
      }
    });

    const colors = [
      { text: 'text-blue-600', grad: 'from-blue-50/40 via-white to-blue-50/10' },
      { text: 'text-violet-600', grad: 'from-violet-50/40 via-white to-violet-50/10' },
      { text: 'text-teal-600', grad: 'from-teal-50/40 via-white to-teal-50/10' },
      { text: 'text-emerald-600', grad: 'from-emerald-50/40 via-white to-emerald-50/10' },
      { text: 'text-amber-600', grad: 'from-amber-50/40 via-white to-amber-50/10' },
      { text: 'text-rose-600', grad: 'from-rose-50/40 via-white to-rose-50/10' },
      { text: 'text-cyan-600', grad: 'from-cyan-50/40 via-white to-cyan-50/10' },
    ];

    return Object.keys(entitiesMap).map((entityName, index) => {
      const companyTx = entitiesMap[entityName];
      const total = companyTx.reduce((sum, tx) => sum + tx.deposit_cr, 0);
      const count = companyTx.length;
      const avg = count > 0 ? total / count : 0;
      
      let lastDate = 'N/A';
      if (count > 0) {
        const dates = companyTx.map(tx => new Date(tx.transaction_date).getTime());
        const maxTime = Math.max(...dates);
        lastDate = new Date(maxTime).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      }

      const style = colors[index % colors.length];

      return {
        type: 'INDIVIDUAL',
        name: entityName,
        dbEntityName: entityName,
        totalCommission: total,
        txCount: count,
        avgTicket: avg,
        lastPayoutDate: lastDate,
        color: style.text,
        bgGradient: style.grad,
      } as CompanyStats;
    }).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [filteredTransactions]);

  // 2. Consolidated Aggregation: Group AMCs dynamically respecting custom overrides
  const consolidatedSummary = useMemo(() => {
    const majorsList: CompanyStats[] = [];
    const dividends = {
      canonical: 'Equity & Stock Dividends',
      dbEntityName: 'Equity & Stock Dividends',
      totalCommission: 0,
      txCount: 0,
      txs: [] as any[],
      stocks: new Set<string>()
    };
    const others = {
      canonical: 'Other AMCs & Micro Inflows',
      dbEntityName: 'Other AMCs & Micro Inflows',
      totalCommission: 0,
      txCount: 0,
      txs: [] as any[]
    };

    companySummary.forEach((company) => {
      const entName = company.dbEntityName;
      
      // Classify AMC
      const groupType = customGroups[entName] || (
        isMajorDefault(entName) ? 'MAJOR' : (
          filteredTransactions.some(tx => {
            if (tx.deposit_cr <= 0 || tx.clean_entity !== entName) return false;
            return tx.revenue_stream === 'Equity / Stock Dividend' || entName.toLowerCase().includes('dividend') || tx.raw_narration.toLowerCase().includes('div');
          }) ? 'DIVIDEND' : 'OTHER'
        )
      );

      const companyTxs = filteredTransactions.filter(tx => tx.clean_entity === entName && tx.deposit_cr > 0);

      if (groupType === 'MAJOR') {
        majorsList.push({
          type: 'MAJOR',
          name: company.name,
          dbEntityName: entName,
          totalCommission: company.totalCommission,
          txCount: company.txCount,
          avgTicket: company.avgTicket,
          lastPayoutDate: company.lastPayoutDate,
          color: company.color,
          bgGradient: company.bgGradient
        });
      } else if (groupType === 'DIVIDEND') {
        dividends.totalCommission += company.totalCommission;
        dividends.txCount += company.txCount;
        dividends.stocks.add(entName);
        dividends.txs.push(...companyTxs);
      } else {
        others.totalCommission += company.totalCommission;
        others.txCount += company.txCount;
        others.txs.push(...companyTxs);
      }
    });

    const resultList: CompanyStats[] = [...majorsList];

    // Add dividends unified card
    if (dividends.txCount > 0) {
      const avg = dividends.totalCommission / dividends.txCount;
      let lastDate = 'N/A';
      if (dividends.txs.length > 0) {
        const dates = dividends.txs.map(tx => new Date(tx.transaction_date).getTime());
        lastDate = new Date(Math.max(...dates)).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      }
      resultList.push({
        type: 'DIVIDEND',
        name: dividends.canonical,
        dbEntityName: dividends.canonical,
        totalCommission: dividends.totalCommission,
        txCount: dividends.txCount,
        avgTicket: avg,
        lastPayoutDate: lastDate,
        color: 'text-amber-600',
        bgGradient: 'from-amber-50/40 via-white to-amber-50/10',
        subtext: `${dividends.stocks.size} Stocks • ${dividends.txCount} Payouts`
      });
    }

    // Add others unified card
    if (others.txCount > 0) {
      const avg = others.totalCommission / others.txCount;
      let lastDate = 'N/A';
      if (others.txs.length > 0) {
        const dates = others.txs.map(tx => new Date(tx.transaction_date).getTime());
        lastDate = new Date(Math.max(...dates)).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      }
      resultList.push({
        type: 'OTHER',
        name: others.canonical,
        dbEntityName: others.canonical,
        totalCommission: others.totalCommission,
        txCount: others.txCount,
        avgTicket: avg,
        lastPayoutDate: lastDate,
        color: 'text-slate-600',
        bgGradient: 'from-slate-50/40 via-white to-slate-50/10'
      });
    }

    return resultList.sort((a, b) => b.totalCommission - a.totalCommission);
  }, [companySummary, customGroups, filteredTransactions]);

  // 3. Dynamic Card Selector mapping
  const displayedCards = useMemo(() => {
    if (viewMode === 'individual') {
      return companySummary;
    }
    
    if (activeGroupCard === null) {
      return consolidatedSummary;
    }

    // Filter companySummary to show constituent individual cards of drilled group
    return companySummary.filter(c => {
      const entName = c.dbEntityName;
      const groupType = customGroups[entName] || (
        isMajorDefault(entName) ? 'MAJOR' : (
          filteredTransactions.some(tx => {
            if (tx.deposit_cr <= 0 || tx.clean_entity !== entName) return false;
            return tx.revenue_stream === 'Equity / Stock Dividend' || entName.toLowerCase().includes('dividend') || tx.raw_narration.toLowerCase().includes('div');
          }) ? 'DIVIDEND' : 'OTHER'
        )
      );
      return groupType === (activeGroupCard === 'Equity & Stock Dividends' ? 'DIVIDEND' : 'OTHER');
    });
  }, [viewMode, activeGroupCard, companySummary, consolidatedSummary, customGroups, filteredTransactions]);

  // Dynamic Metrics summaries
  const lifetimeStats = useMemo(() => {
    const creditTxs = filteredTransactions.filter(tx => tx.deposit_cr > 0);
    const total = creditTxs.reduce((sum, tx) => sum + tx.deposit_cr, 0);
    const totalCount = creditTxs.length;
    const avg = totalCount > 0 ? total / totalCount : 0;
    
    return {
      totalRevenue: total,
      partnerCount: companySummary.length,
      averagePayout: avg,
      payoutCount: totalCount
    };
  }, [filteredTransactions, companySummary]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleCardClick = (company: CompanyStats) => {
    // If in Consolidated mode and clicked a grouped parent card, trigger sub-group drill down
    if (viewMode === 'consolidated' && activeGroupCard === null) {
      if (['Equity & Stock Dividends', 'Other AMCs & Micro Inflows'].includes(company.dbEntityName)) {
        setActiveGroupCard(company.dbEntityName);
        return;
      }
    }
    
    // Otherwise open standard transactions drawer
    setSelectedEntity(company.dbEntityName);
    setDrawerOpen(true);
  };

  const openSingleRename = (entityName: string) => {
    setSelectedSourceEntity(entityName);
    setNewEntityName(entityName);
    setModalTab('rename');
    setMergeModalOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!selectedSourceEntity || !newEntityName.trim()) return;
    setIsModalSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in.');

      const { error: renameError } = await supabase
        .from('transactions')
        .update({ clean_entity: newEntityName.trim() })
        .eq('clean_entity', selectedSourceEntity);

      if (renameError) throw renameError;

      await supabase
        .from('user_entity_rules')
        .insert({
          user_id: user.id,
          pattern: selectedSourceEntity.toUpperCase(),
          clean_entity: newEntityName.trim(),
          flow_type: 'BUSINESS_INCOME',
          revenue_stream: 'MF Brokerage'
        });

      setMergeModalOpen(false);
      fetchTransactions();
    } catch (err: any) {
      console.error(err);
      alert('Rename failed: ' + err.message);
    } finally {
      setIsModalSaving(false);
    }
  };

  const handleMergeSubmit = async () => {
    if (!selectedSourceEntity || !selectedTargetEntity) return;
    if (selectedSourceEntity === selectedTargetEntity) {
      alert('Source and Target entities must be different.');
      return;
    }
    setIsModalSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not logged in.');

      const { error: mergeError } = await supabase
        .from('transactions')
        .update({ clean_entity: selectedTargetEntity })
        .eq('clean_entity', selectedSourceEntity);

      if (mergeError) throw mergeError;

      await supabase
        .from('user_entity_rules')
        .insert({
          user_id: user.id,
          pattern: selectedSourceEntity.toUpperCase(),
          clean_entity: selectedTargetEntity,
          flow_type: 'BUSINESS_INCOME',
          revenue_stream: 'MF Brokerage'
        });

      setMergeModalOpen(false);
      fetchTransactions();
    } catch (err: any) {
      console.error(err);
      alert('Merge failed: ' + err.message);
    } finally {
      setIsModalSaving(false);
    }
  };

  // Filter transactions for drawer (credits only)
  const drawerTransactions = useMemo(() => {
    if (!selectedEntity) return [];

    // Unified Stock Dividends Drawer List
    if (selectedEntity === 'Equity & Stock Dividends') {
      return filteredTransactions.filter(tx => {
        if (tx.deposit_cr <= 0) return false;
        const entName = tx.clean_entity || 'Unresolved Entity';
        return tx.revenue_stream === 'Equity / Stock Dividend' || entName.toLowerCase().includes('dividend') || tx.raw_narration.toLowerCase().includes('div');
      });
    }

    // Unified Other AMCs Drawer List
    if (selectedEntity === 'Other AMCs & Micro Inflows') {
      const majors = ['Life Insurance Corporation', 'Star Health', 'New India Assurance', 'Prudent', 'NJ India', 'Nippon', 'Aditya Birla', 'SBI'];
      return filteredTransactions.filter(tx => {
        if (tx.deposit_cr <= 0) return false;
        const entName = tx.clean_entity || 'Unresolved Entity';
        
        // Exclude major entities
        const isMajor = majors.some(m => entName.toLowerCase().includes(m.toLowerCase()));
        if (isMajor) return false;

        // Exclude dividends
        const isDiv = filteredTransactions.some(tx => {
          if (tx.deposit_cr <= 0 || tx.clean_entity !== entName) return false;
          return tx.revenue_stream === 'Equity / Stock Dividend' || entName.toLowerCase().includes('dividend') || tx.raw_narration.toLowerCase().includes('div');
        });
        if (isDiv) return false;

        return true;
      });
    }

    // Dynamic Major / Individual matches
    const majors = [
      { key: 'LIC', match: 'Life Insurance Corporation' },
      { key: 'STAR_HEALTH', match: 'Star Health' },
      { key: 'NEW_INDIA', match: 'New India Assurance' },
      { key: 'PRUDENT', match: 'Prudent' },
      { key: 'NJ_INDIA', match: 'NJ India' },
      { key: 'NIPPON', match: 'Nippon' },
      { key: 'ADITYA_BIRLA', match: 'Aditya Birla' },
      { key: 'SBI', match: 'SBI' }
    ];

    const matchedMajor = majors.find(m => selectedEntity.toLowerCase().includes(m.match.toLowerCase()));
    if (matchedMajor) {
      return filteredTransactions.filter(tx => {
        if (tx.deposit_cr <= 0) return false;
        const entName = tx.clean_entity || 'Unresolved Entity';
        return entName.toLowerCase().includes(matchedMajor.match.toLowerCase());
      });
    }

    return filteredTransactions.filter(tx => tx.clean_entity === selectedEntity && tx.deposit_cr > 0);
  }, [filteredTransactions, selectedEntity]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Commissions Hub</h1>
          <p className="text-sm text-slate-500 font-medium">Drill down into dynamic institutional payouts and lifetime portfolio volume</p>
        </div>
        <button
          onClick={() => {
            setSelectedSourceEntity('');
            setSelectedTargetEntity('');
            setNewEntityName('');
            setModalTab('rename');
            setMergeModalOpen(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Building2 className="w-4 h-4" />
          Edit / Re-Group Entities
        </button>
      </div>

      {/* Reactive Date Filters */}
      <DateFilterBar value={filter} onChange={setFilter} />

      {/* View Mode Switcher */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex-wrap gap-3">
        <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Commissions Layout Mode:</div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('consolidated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'consolidated'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Consolidated Groups
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'individual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            All Individual Cards
          </button>
        </div>
      </div>

      {/* Drill-down Breadcrumb / Back button */}
      {viewMode === 'consolidated' && activeGroupCard && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveGroupCard(null)}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition-all hover:bg-slate-50 cursor-pointer"
          >
            ← Back to Consolidated Groups
          </button>
          <span className="text-xs text-slate-355 font-medium">/</span>
          <span className="text-xs text-slate-700 font-extrabold uppercase tracking-wide">{activeGroupCard}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-sm">Portfolios Sync Failure</h5>
            <p className="text-xs text-rose-700 mt-0.5">
              Could not retrieve transaction sums: {error}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          <span className="text-xs font-semibold">Aggregating portfolio indices...</span>
        </div>
      ) : (
        <>
          {/* Portfolio Metric Pills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                <Coins className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Commission</span>
                <h4 className="text-base md:text-lg font-bold text-slate-800 mt-0.5 truncate">{formatCurrency(lifetimeStats.totalRevenue)}</h4>
              </div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-violet-50 rounded-xl text-violet-600 shrink-0">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Entities</span>
                <h4 className="text-base md:text-lg font-bold text-slate-800 mt-0.5 truncate">{lifetimeStats.partnerCount} AMCs</h4>
              </div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600 shrink-0">
                <BadgePercent className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Ticket</span>
                <h4 className="text-base md:text-lg font-bold text-slate-800 mt-0.5 truncate">{formatCurrency(lifetimeStats.averagePayout)}</h4>
              </div>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Payments</span>
                <h4 className="text-base md:text-lg font-bold text-slate-800 mt-0.5 truncate">{lifetimeStats.payoutCount} Credits</h4>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {displayedCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white border border-slate-100 rounded-2xl shadow-sm w-full">
              <Layers className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No commission payouts match this range.</p>
              <p className="text-xs mt-0.5">Try altering the date filters or ingesting new statements.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCards.map((company, index) => (
                <div
                  key={index}
                  onClick={() => handleCardClick(company)}
                  className={`rounded-2xl border border-slate-100 bg-gradient-to-tr ${company.bgGradient} p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] cursor-pointer transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] hover:-translate-y-1 group flex flex-col justify-between`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform duration-200 shrink-0">
                          <Landmark className={`w-5 h-5 ${company.color}`} />
                        </div>
                        {!['DIVIDEND', 'OTHER'].includes(company.type) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openSingleRename(company.dbEntityName);
                            }}
                            className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 bg-white shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Edit / Re-Group Entity"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-2.5 py-0.5 rounded-full shrink-0 tracking-wider">
                        {company.txCount} Payouts
                      </span>
                    </div>

                    {/* Title & Payout Sum */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{company.name}</h4>
                      {company.subtext && (
                        <span className="text-[10px] text-blue-500 font-extrabold block mt-0.5 tracking-tight uppercase">
                          {company.subtext}
                        </span>
                      )}
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 group-hover:text-blue-600 transition-colors">
                        {formatCurrency(company.totalCommission)}
                      </h3>
                    </div>
                  </div>

                  {/* Details block */}
                  <div className="mt-6 space-y-2.5 border-t border-slate-100/55 pt-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <BadgePercent className="w-3.5 h-3.5" />
                        Avg Ticket Size
                      </span>
                      <span className="text-slate-700 font-bold">{formatCurrency(company.avgTicket)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Last Payout
                      </span>
                      <span className="text-slate-700 font-bold">{company.lastPayoutDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit / Merge Wizard Modal */}
      {mergeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Institutional Entity Manager</h3>
              <button 
                onClick={() => setMergeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 mb-4">
              <button
                onClick={() => setModalTab('rename')}
                className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'rename'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Rename
              </button>
              <button
                onClick={() => setModalTab('merge')}
                className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'merge'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Merge
              </button>
              <button
                onClick={() => setModalTab('group')}
                className={`flex-1 pb-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  modalTab === 'group'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                Change Group
              </button>
            </div>

            {modalTab === 'rename' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Entity to Rename</label>
                  <select
                    value={selectedSourceEntity}
                    onChange={(e) => {
                      setSelectedSourceEntity(e.target.value);
                      setNewEntityName(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="">-- Choose Active Entity --</option>
                    {activeEntitiesList.map(ent => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                </div>

                {selectedSourceEntity && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">New Canonical Name</label>
                    <input
                      type="text"
                      value={newEntityName}
                      onChange={(e) => setNewEntityName(e.target.value)}
                      placeholder="e.g. Aditya Birla Sun Life AMC"
                      className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}

                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 text-[10px] text-slate-500 leading-relaxed">
                  💡 <b>Rename Scope:</b> Renaming will update all transaction references carrying the selected name and persist a rule for future parsed uploads.
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setMergeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenameSubmit}
                    disabled={isModalSaving || !selectedSourceEntity || !newEntityName.trim()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {isModalSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save Rename
                  </button>
                </div>
              </div>
            ) : modalTab === 'merge' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Source Entity (Duplicate / Incorrect)</label>
                  <select
                    value={selectedSourceEntity}
                    onChange={(e) => setSelectedSourceEntity(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="">-- Choose Duplicate Entity --</option>
                    {activeEntitiesList.map(ent => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center text-slate-400">
                  <ArrowRight className="w-5 h-5 rotate-90 sm:rotate-0" />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Entity (Canonical / Target)</label>
                  <select
                    value={selectedTargetEntity}
                    onChange={(e) => setSelectedTargetEntity(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="">-- Choose Canonical Entity --</option>
                    {activeEntitiesList.map(ent => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50 text-[10px] text-amber-700 leading-relaxed">
                  ⚠️ <b>Merge Scope:</b> This action merges all historical transaction lines belonging to the source entity into the target entity, and persists a mapping rule so future statement parses automatically match the target.
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setMergeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMergeSubmit}
                    disabled={isModalSaving || !selectedSourceEntity || !selectedTargetEntity || selectedSourceEntity === selectedTargetEntity}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {isModalSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    Confirm Merge
                  </button>
                </div>
              </div>
            ) : (
              // Re-group Tab
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Entity to Re-Group</label>
                  <select
                    value={selectedSourceEntity}
                    onChange={(e) => {
                      const entName = e.target.value;
                      setSelectedSourceEntity(entName);
                      if (entName) {
                        const current = customGroups[entName] || (
                          isMajorDefault(entName) ? 'MAJOR' : (
                            filteredTransactions.some(tx => {
                              if (tx.deposit_cr <= 0 || tx.clean_entity !== entName) return false;
                              return tx.revenue_stream === 'Equity / Stock Dividend' || entName.toLowerCase().includes('dividend') || tx.raw_narration.toLowerCase().includes('div');
                            }) ? 'DIVIDEND' : 'OTHER'
                          )
                        );
                        setSelectedTargetEntity(current);
                      } else {
                        setSelectedTargetEntity('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  >
                    <option value="">-- Choose Entity --</option>
                    {activeEntitiesList.map(ent => (
                      <option key={ent} value={ent}>{ent}</option>
                    ))}
                  </select>
                </div>

                {selectedSourceEntity && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Target Group</label>
                    <select
                      value={selectedTargetEntity}
                      onChange={(e) => setSelectedTargetEntity(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="MAJOR">Major Institutional Distributors (Individual Card)</option>
                      <option value="DIVIDEND">Equity & Stock Dividends (Unified Card)</option>
                      <option value="OTHER">Other AMCs & Micro Inflows (Unified Card)</option>
                    </select>
                  </div>
                )}

                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 text-[10px] text-slate-500 leading-relaxed">
                  💡 <b>Group Assignment Scope:</b> Moving an entity immediately redirects its commission aggregates to your chosen layout container in Consolidated mode.
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setMergeModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!selectedSourceEntity || !selectedTargetEntity) return;
                      setCustomGroups(prev => ({
                        ...prev,
                        [selectedSourceEntity]: selectedTargetEntity as GroupType
                      }));
                      setMergeModalOpen(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm cursor-pointer transition-all flex items-center gap-1"
                  >
                    Save Grouping
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Details Sheet Drawer */}
      <TransactionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        entityName={selectedEntity || ''}
        transactions={drawerTransactions}
      />
    </div>
  );
}
