'use client';

import React, { useState, useMemo } from 'react';
import { Transaction } from '@/types';
import { X, Search, Calendar, Landmark, Receipt, ArrowDown, ArrowUp } from 'lucide-react';

interface TransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  transactions: Transaction[];
}

export function TransactionDrawer({ isOpen, onClose, entityName, transactions }: TransactionDrawerProps) {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  // Filter transactions for this entity
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = 
        tx.raw_narration.toLowerCase().includes(search.toLowerCase()) ||
        (tx.reference_no && tx.reference_no.toLowerCase().includes(search.toLowerCase()));

      const txDate = new Date(tx.transaction_date);
      const matchesStart = startDate ? txDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? txDate <= new Date(endDate) : true;

      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [transactions, search, startDate, endDate]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-over Drawer surface */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col h-full animate-in slide-in-from-right duration-300
                      lg:inset-y-0 lg:right-0 lg:w-full lg:max-w-xl lg:h-full lg:rounded-none lg:slide-in-from-right
                      max-lg:fixed max-lg:bottom-0 max-lg:inset-x-0 max-lg:top-[15vh] max-lg:h-[85vh] max-lg:w-full max-lg:max-w-none max-lg:rounded-t-3xl max-lg:slide-in-from-bottom"
      >
        {/* Grab Handle (Mobile Only) */}
        <div className="lg:hidden flex items-center justify-center pt-3.5 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/50 text-blue-600 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">{entityName}</h3>
              <p className="text-xs text-slate-400 font-semibold">{filteredTransactions.length} records found</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-100 space-y-4">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search narration or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-xs"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          </div>

          {/* Date Picker Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
                <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs"
                />
                <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Ledger List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/10">
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center border border-dashed border-slate-100 rounded-xl bg-white">
              <Receipt className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No records match the filter criteria.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isCredit = tx.deposit_cr > 0;
              return (
                <div 
                  key={tx.id} 
                  className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex justify-between items-center gap-4 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">{tx.transaction_date}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                      }`}>
                        {isCredit ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {isCredit ? 'Credit' : 'Debit'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-1 leading-normal break-words truncate max-w-[320px]" title={tx.raw_narration}>
                      {tx.raw_narration}
                    </p>
                    {tx.reference_no && (
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">Ref: {tx.reference_no}</p>
                    )}
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                    {isCredit ? '+' : '-'}{formatCurrency(isCredit ? tx.deposit_cr : tx.withdrawal_dr)}
                  </span>
                </div>
              );
            })
          )}
        </div>

      </div>
    </>
  );
}
