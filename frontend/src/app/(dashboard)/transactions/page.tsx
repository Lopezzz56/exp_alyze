'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { DateFilterBar } from '@/components/DateFilterBar'; // We will place DateFilterBar in components/DateFilterBar or components/dashboard
import { DateFilter, isTxInDateRange } from '@/lib/dateFilters';
import { AlertCircle, HelpCircle, ChevronDown, ChevronUp, RefreshCw, Bookmark } from 'lucide-react';

export default function MasterLedgerPage() {
  const { transactions, loading, error, fetchTransactions, toggleSettlement } = useTransactions();
  const [filter, setFilter] = useState<DateFilter>({ type: 'ALL' });
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reactive date range filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => isTxInDateRange(tx.transaction_date, filter));
  }, [transactions, filter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Master Ledger</h1>
        <p className="text-sm text-slate-500 font-medium">Verify audits, filter categories, and reconcile client pass-through transit items</p>
      </div>

      {/* Segmented Date Filter Bar */}
      <DateFilterBar value={filter} onChange={setFilter} />

      {/* Collapsible Help/Jargon Legend Card */}
      <div className="bg-gradient-to-tr from-blue-50/40 via-white to-blue-50/20 border border-blue-100 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden transition-all">
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-4 font-semibold text-xs text-blue-800 hover:bg-blue-50/20 transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            Understanding the Ledger & Client Transit Flows
          </span>
          {showHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showHelp && (
          <div className="px-6 pb-6 pt-2 text-xs text-slate-600 leading-relaxed border-t border-blue-50/50 space-y-3 animate-in fade-in duration-200">
            <p>
              💡 <b>How Client Transit Works:</b> When you pay a client&apos;s insurance premium online from your bank account (e.g. LIC or Star Health), tag it as <b>Client Transit (Pass-Through)</b>. This immediately flags the transaction as an outflow awaiting cash settlement.
            </p>
            <p>
              💰 When the client hands you the cash or pays you back, click the <b>Mark Settled</b> action. This toggles the transaction status to <b>Cash Received</b>, balancing out the expense ledger to net zero and keeping your business profit/loss clean.
            </p>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-sm">Ledger Synchrony Mismatch</h5>
            <p className="text-xs text-rose-700 mt-0.5">
              Could not update ledger from database: {error}
            </p>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <TransactionTable
        transactions={filteredTransactions}
        onToggleSettlement={toggleSettlement}
        loading={loading}
        onRefresh={fetchTransactions}
      />
    </div>
  );
}
