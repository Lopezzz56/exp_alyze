'use client';

import React, { useState, useMemo } from 'react';
import { Transaction } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { JARGON_MAP } from '@/lib/jargon';
import { 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Clock, 
  X,
  CreditCard,
  Building,
  RefreshCw,
  Tag,
  FileText,
  Loader2,
  Info
} from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onToggleSettlement: (id: string, isSettled: boolean) => Promise<void>;
  loading: boolean;
  onRefresh?: () => void;
}

// Interactive jargon tooltip helper component
function JargonTooltip({ type }: { type: string }) {
  const info = JARGON_MAP[type];
  if (!info) return null;

  return (
    <span className="group/tooltip relative inline-flex items-center ml-1 text-slate-400 hover:text-slate-600 cursor-pointer align-middle shrink-0">
      <Info className="w-3 h-3" />
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-[10px] p-3 rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 z-50 leading-relaxed font-normal normal-case">
        <span className="font-bold text-blue-400 block mb-1">{info.label}</span>
        <span className="block mb-1">{info.meaning}</span>
        <span className="block border-t border-slate-700/50 pt-1 text-slate-400 italic">
          <b>Use Case:</b> {info.useCase}
        </span>
        <span className="absolute top-full right-2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
  );
}

export function TransactionTable({ transactions, onToggleSettlement, loading, onRefresh }: TransactionTableProps) {
  const [search, setSearch] = useState('');
  const [railFilter, setRailFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [passThroughFilter, setPassThroughFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [settledToggleLoading, setSettledToggleLoading] = useState<string | null>(null);

  // Category Reclassification states
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [flowType, setFlowType] = useState<string>('');
  const [customTag, setCustomTag] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saveAsRule, setSaveAsRule] = useState<boolean>(false);
  const [rulePattern, setRulePattern] = useState<string>('');
  const [reclassifying, setReclassifying] = useState<boolean>(false);

  // Entity Rename states
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  // Get unique entities and rails for filter dropdowns
  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      if (tx.clean_entity) set.add(tx.clean_entity);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const uniqueRails = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(tx => {
      if (tx.payment_rail) set.add(tx.payment_rail);
    });
    return Array.from(set).sort();
  }, [transactions]);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    setSettledToggleLoading(id);
    try {
      await onToggleSettlement(id, !currentStatus);
    } catch (err) {
      console.error(err);
    } finally {
      setSettledToggleLoading(null);
    }
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setFlowType(tx.flow_type);
    setCustomTag(tx.custom_tag || '');
    setNotes(tx.notes || '');
    setSaveAsRule(false);
    setRulePattern(tx.clean_entity || tx.raw_narration || '');
  };

  const handleReclassifySave = async () => {
    if (!editingTx) return;
    setReclassifying(true);
    try {
      const isPassThrough = flowType === 'PASS_THROUGH_TRANSIT';
      
      // Update transaction in Supabase
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          flow_type: flowType,
          custom_tag: customTag.trim() || null,
          notes: notes.trim() || null,
          is_pass_through: isPassThrough,
          is_settled: isPassThrough ? editingTx.is_settled : false
        })
        .eq('id', editingTx.id);

      if (updateError) throw updateError;

      // Optional rule mapping
      if (saveAsRule && rulePattern.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_entity_rules')
            .insert({
              user_id: user.id,
              pattern: rulePattern.trim().toUpperCase(),
              clean_entity: editingTx.clean_entity || 'Unresolved Entity',
              revenue_stream: flowType === 'BUSINESS_INCOME' ? 'MF Brokerage' : 'General Outflow',
              flow_type: flowType
            });
        }
      }

      setEditingTx(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Reclassification failure:', err);
      alert('Failed to update: ' + err.message);
    } finally {
      setReclassifying(false);
    }
  };

  const openRenameModal = (entityName: string) => {
    setRenameTarget(entityName);
    setRenameValue(entityName);
  };

  const handleRenameSave = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated user.');

      // Update all transactions carrying this canonical name
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ clean_entity: renameValue.trim() })
        .eq('clean_entity', renameTarget);

      if (updateError) throw updateError;

      // Save classification rule so future statement parses automatically rename it
      await supabase
        .from('user_entity_rules')
        .insert({
          user_id: user.id,
          pattern: renameTarget.toUpperCase(),
          clean_entity: renameValue.trim(),
          flow_type: 'BUSINESS_INCOME',
          revenue_stream: 'MF Brokerage'
        });

      setRenameTarget(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Entity rename error:', err);
      alert('Failed to rename: ' + err.message);
    } finally {
      setRenaming(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.raw_narration.toLowerCase().includes(search.toLowerCase()) ||
        (tx.reference_no && tx.reference_no.toLowerCase().includes(search.toLowerCase())) ||
        tx.clean_entity.toLowerCase().includes(search.toLowerCase()) ||
        (tx.custom_tag && tx.custom_tag.toLowerCase().includes(search.toLowerCase())) ||
        (tx.notes && tx.notes.toLowerCase().includes(search.toLowerCase()));

      const matchesRail = railFilter === 'ALL' ? true : tx.payment_rail === railFilter;
      const matchesType = typeFilter === 'ALL' ? true : tx.flow_type === typeFilter;
      const matchesEntity = entityFilter === 'ALL' ? true : tx.clean_entity === entityFilter;

      const matchesPassThrough = 
        passThroughFilter === 'ALL' ? true :
        passThroughFilter === 'PASS_THROUGH' ? tx.is_pass_through :
        passThroughFilter === 'SETTLED' ? (tx.is_pass_through && tx.is_settled) :
        passThroughFilter === 'UNSETTLED' ? (tx.is_pass_through && !tx.is_settled) : true;

      return matchesSearch && matchesRail && matchesType && matchesEntity && matchesPassThrough;
    });
  }, [transactions, search, railFilter, typeFilter, entityFilter, passThroughFilter]);

  const getRailBadgeStyle = (rail: string) => {
    switch (rail) {
      case 'UPI':
        return 'bg-blue-50 text-blue-700 border-blue-100/50';
      case 'NEFT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100/50';
      case 'IMPS':
        return 'bg-violet-50 text-violet-700 border-violet-100/50';
      case 'ACH / NACH':
      case 'NACH':
        return 'bg-amber-50 text-amber-700 border-amber-100/50';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getFlowTypeBadgeStyle = (flow: string) => {
    switch (flow) {
      case 'BUSINESS_INCOME':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100/50';
      case 'PASS_THROUGH_TRANSIT':
        return 'bg-amber-50 text-amber-700 border-amber-100/50';
      case 'INTERNAL_TRANSFER':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100/50';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-100/50';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-300 hover:shadow-[0_6px_25px_rgba(0,0,0,0.06)]">
      {/* Search & Filter Header */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/20 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search particulars, tags, references, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-xs font-medium"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            {/* Reset Filters */}
            {(search || railFilter !== 'ALL' || typeFilter !== 'ALL' || entityFilter !== 'ALL' || passThroughFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setRailFilter('ALL');
                  setTypeFilter('ALL');
                  setEntityFilter('ALL');
                  setPassThroughFilter('ALL');
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filters Dropdown Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Financial Entity</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Entities</option>
              {uniqueEntities.map(ent => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Rail</label>
            <select
              value={railFilter}
              onChange={(e) => setRailFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Rails</option>
              {uniqueRails.map(rail => (
                <option key={rail} value={rail}>{rail}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Flow Category</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Categories</option>
              <option value="BUSINESS_INCOME">Business Income</option>
              <option value="PASS_THROUGH_TRANSIT">Pass-Through Transit</option>
              <option value="INTERNAL_TRANSFER">Internal Transfer</option>
              <option value="PERSONAL_EXPENSE">Personal Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pass-Through State</label>
            <select
              value={passThroughFilter}
              onChange={(e) => setPassThroughFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Transactions</option>
              <option value="PASS_THROUGH">All Pass-Through</option>
              <option value="UNSETTLED">Awaiting Settlement</option>
              <option value="SETTLED">Settled / Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-300" />
          <span className="text-xs font-semibold">Updating ledger balance...</span>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-center border-t border-slate-100">
          <CreditCard className="w-10 h-10 text-slate-300 mb-2" />
          <p className="text-sm font-semibold">No ledger entries match the filters.</p>
          <p className="text-xs mt-1">Try refining search parameters or clearing filters.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                  <th className="py-3.5 px-6 font-bold">Value Date</th>
                  <th className="py-3.5 px-6 font-bold">Particulars / Narration</th>
                  <th className="py-3.5 px-6 font-bold">Rail</th>
                  <th className="py-3.5 px-6 font-bold">Entity Mapping</th>
                  <th className="py-3.5 px-6 font-bold">Flow Category</th>
                  <th className="py-3.5 px-6 font-bold text-right">Amount</th>
                  <th className="py-3.5 px-6 font-bold text-center">Pass-Through Transit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransactions.map((tx) => {
                  const isCredit = tx.deposit_cr > 0;
                  const isPtTransit = tx.flow_type === 'PASS_THROUGH_TRANSIT';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-4 px-6 font-medium text-slate-500 whitespace-nowrap">{tx.transaction_date}</td>
                      <td className="py-4 px-6 max-w-xs md:max-w-md font-semibold text-slate-800 break-words leading-relaxed">
                        {tx.raw_narration}
                        {tx.reference_no && (
                          <p className="text-[10px] font-mono text-slate-400 font-normal mt-0.5">Ref: {tx.reference_no}</p>
                        )}
                        {tx.notes && (
                          <p className="text-[10px] text-slate-500 font-medium italic mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xs md:max-w-sm flex items-start gap-1 font-normal leading-normal">
                            <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span>{tx.notes}</span>
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${getRailBadgeStyle(tx.payment_rail)}`}>
                          {tx.payment_rail}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => openRenameModal(tx.clean_entity)}
                          className="inline-flex items-center gap-1.5 font-semibold text-slate-600 bg-slate-100/50 border border-slate-100 px-2 py-1 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100/50 transition-all cursor-pointer group/btn text-left"
                          title="Click to rename this institution"
                        >
                          <Building className="w-3 h-3 text-slate-400 shrink-0 group-hover/btn:text-blue-600" />
                          {tx.clean_entity}
                        </button>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center">
                            <button 
                              onClick={() => openEditModal(tx)}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border hover:scale-105 transition-transform duration-200 cursor-pointer shadow-xs ${getFlowTypeBadgeStyle(tx.flow_type)}`}
                              title="Click to reclassify category"
                            >
                              {tx.flow_type === 'BUSINESS_INCOME' ? 'Business Income' : 
                               tx.flow_type === 'PASS_THROUGH_TRANSIT' ? 'Client Transit' : 
                               tx.flow_type === 'INTERNAL_TRANSFER' ? 'Self Transfer' : 'Personal Outflow'}
                            </button>
                            <JargonTooltip type={tx.flow_type} />
                          </span>
                          
                          {tx.custom_tag && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              {tx.custom_tag}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <span className={`text-xs font-bold ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {isCredit ? '+' : '-'}{formatCurrency(isCredit ? tx.deposit_cr : tx.withdrawal_dr)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        {isPtTransit ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleToggle(tx.id, tx.is_settled)}
                              disabled={settledToggleLoading === tx.id}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-tight shadow-sm border transition-all cursor-pointer ${
                                tx.is_settled
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/60'
                                  : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/60 hover:shadow-xs'
                              }`}
                            >
                              {settledToggleLoading === tx.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : tx.is_settled ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                  Reconciled
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  Pending Cash
                                </>
                              )}
                            </button>
                            <JargonTooltip type={tx.is_settled ? 'SETTLED' : 'UNSETTLED'} />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-slate-100 border-t border-slate-100">
            {filteredTransactions.map((tx) => {
              const isCredit = tx.deposit_cr > 0;
              const isPtTransit = tx.flow_type === 'PASS_THROUGH_TRANSIT';
              
              return (
                <div key={tx.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/10 transition-colors">
                  {/* Top Row: Clean Entity & Amount */}
                  <div className="flex justify-between items-start gap-3">
                    <button
                      onClick={() => openRenameModal(tx.clean_entity)}
                      className="font-bold text-slate-800 flex items-center gap-1 text-xs text-left hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {tx.clean_entity}
                    </button>
                    <span className={`text-xs font-extrabold shrink-0 whitespace-nowrap ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isCredit ? '+' : '-'}{formatCurrency(isCredit ? tx.deposit_cr : tx.withdrawal_dr)}
                    </span>
                  </div>

                  {/* Middle Row: Date • Rail • Category */}
                  <div className="flex flex-wrap gap-2 items-center text-[10px] text-slate-400 font-semibold">
                    <span>{tx.transaction_date}</span>
                    <span>•</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getRailBadgeStyle(tx.payment_rail)}`}>
                      {tx.payment_rail}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center">
                      <button
                        onClick={() => openEditModal(tx)}
                        className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border cursor-pointer ${getFlowTypeBadgeStyle(tx.flow_type)}`}
                      >
                        {tx.flow_type === 'BUSINESS_INCOME' ? 'Business Income' : 
                         tx.flow_type === 'PASS_THROUGH_TRANSIT' ? 'Client Transit' : 
                         tx.flow_type === 'INTERNAL_TRANSFER' ? 'Self Transfer' : 'Personal Outflow'}
                      </button>
                      <JargonTooltip type={tx.flow_type} />
                    </span>
                  </div>

                  {/* Narrations / notes details */}
                  <div className="text-[11px] text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50 leading-relaxed break-words font-medium">
                    <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Particulars</span>
                    {tx.raw_narration}
                    {tx.notes && (
                      <p className="mt-1.5 text-slate-500 italic border-t border-slate-100/60 pt-1 flex items-start gap-1 font-normal">
                        <FileText className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                        <span>Note: {tx.notes}</span>
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Status Chip or Custom tag */}
                  <div className="flex justify-between items-center gap-2 pt-1">
                    {tx.custom_tag ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        {tx.custom_tag}
                      </span>
                    ) : (
                      <span />
                    )}

                    {isPtTransit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(tx.id, tx.is_settled)}
                          disabled={settledToggleLoading === tx.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold tracking-tight shadow-sm border transition-all cursor-pointer ${
                            tx.is_settled
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : 'bg-amber-50 border-amber-100 text-amber-700'
                          }`}
                        >
                          {settledToggleLoading === tx.id ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : tx.is_settled ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Reconciled
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Cash
                            </>
                          )}
                        </button>
                        <JargonTooltip type={tx.is_settled ? 'SETTLED' : 'UNSETTLED'} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Category Reclassification Edit Dialog Modal */}
      {editingTx && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Reclassify Transaction</h3>
              <button 
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Narration info */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 leading-normal">
                <p className="font-bold text-[9px] text-slate-400 uppercase tracking-wider mb-1">Particulars / Narration</p>
                <p className="font-semibold text-slate-800">{editingTx.raw_narration}</p>
                {editingTx.reference_no && <p className="font-mono text-[10px] text-slate-400 mt-1">Ref: {editingTx.reference_no}</p>}
              </div>

              {/* Flow Category Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Flow Category</label>
                <select
                  value={flowType}
                  onChange={(e) => setFlowType(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="BUSINESS_INCOME">Business Income (Commission / Dividend)</option>
                  <option value="PERSONAL_EXPENSE">Personal Outflow (Bills / Living)</option>
                  <option value="PASS_THROUGH_TRANSIT">Client Transit (Paid for Client)</option>
                  <option value="INTERNAL_TRANSFER">Self Transfer (Account to Account)</option>
                </select>
              </div>

              {/* Custom Tag Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Custom Tag / Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Marketing, Rent, Travel, Hardware"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Notes Area */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Transaction Notes (Optional)</label>
                <textarea
                  placeholder="Add custom notes, client name, or explanation..."
                  value={notes}
                  rows={2}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              {/* Save As Rule Toggle */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveAsRule}
                    onChange={(e) => setSaveAsRule(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-200 focus:ring-blue-500/20 text-blue-600"
                  />
                  <span>Save as automated pattern rule</span>
                </label>
                
                {saveAsRule && (
                  <div className="animate-in slide-in-from-top-1 duration-150 space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Match Pattern (UPPERCASE)</label>
                    <input
                      type="text"
                      placeholder="PATTERN TO MATCH"
                      value={rulePattern}
                      onChange={(e) => setRulePattern(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="text-[9px] text-slate-400 leading-normal">
                      Future narration records containing this substring will automatically inherit this classification.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => setEditingTx(null)}
                disabled={reclassifying}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleReclassifySave}
                disabled={reclassifying}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                {reclassifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Rename Dialog Modal */}
      {renameTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Rename Financial Entity</h3>
              <button 
                onClick={() => setRenameTarget(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Old Canonical Name</label>
                <p className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/50">{renameTarget}</p>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Canonical Name</label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="e.g. Life Insurance Corporation"
                  className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 text-[10px] text-slate-500 leading-normal">
                💡 <b>Bulk Update:</b> Saving will update <b>all transactions</b> matching the old name and register a parser rule for future statements automatically.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                onClick={() => setRenameTarget(null)}
                disabled={renaming}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSave}
                disabled={renaming}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                {renaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
