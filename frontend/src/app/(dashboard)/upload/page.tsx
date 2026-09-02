'use client';

import React, { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { StatementDropzone } from '@/components/upload/StatementDropzone';
import { supabase } from '@/lib/supabaseClient';
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  Database,
  Building,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StatementUploadPage() {
  const router = useRouter();
  const { parseStatement, saveTransactions, loading, error: transactionError } = useTransactions();
  
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<{ id: string, name: string } | null>(null);

  // Retrieve user's bank account or create a default one based on statement meta
  const getOrCreateBankAccount = async (bankName?: string, accountNumber?: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthenticated user context.');

      const targetBankName = bankName || 'Kotak Mahindra Bank';
      const targetAccNum = accountNumber || '9190100910001';

      // Check if user has this specific account in their registry
      const { data: accounts, error: accountError } = await supabase
        .from('bank_accounts')
        .select('id, bank_name')
        .eq('user_id', user.id)
        .eq('account_number', targetAccNum)
        .limit(1);

      if (accountError) throw accountError;

      if (accounts && accounts.length > 0) {
        setActiveAccount({ id: accounts[0].id, name: accounts[0].bank_name });
        return accounts[0].id;
      }

      // If no account matching this bank/number exists, create a new one dynamically
      const { data: newAccount, error: createError } = await supabase
        .from('bank_accounts')
        .insert({
          account_number: targetAccNum,
          bank_name: targetBankName,
          balance: parsedData?.audit?.closing_balance || 0.00,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) throw createError;

      setActiveAccount({ id: newAccount.id, name: newAccount.bank_name });
      return newAccount.id;
    } catch (err: any) {
      console.error('Bank account resolution failure:', err);
      return null;
    }
  };

  const handleUpload = async (file: File, password?: string) => {
    setSuccessMessage(null);
    const data = await parseStatement(file, password);
    setParsedData(data);
  };

  const handleSaveToDatabase = async () => {
    if (!parsedData || !parsedData.transactions) return;
    setSaveLoading(true);
    try {
      const accountId = await getOrCreateBankAccount(parsedData.bank_name, parsedData.account_number);
      if (!accountId) {
        alert('Could not resolve database user account. Please check database connectivity.');
        return;
      }

      await saveTransactions(accountId, parsedData.transactions);
      
      // Update account balance
      if (parsedData.audit?.closing_balance !== undefined) {
        await supabase
          .from('bank_accounts')
          .update({ balance: parsedData.audit.closing_balance })
          .eq('id', accountId);
      }

      setSuccessMessage('🎉 Ingestion complete! Statements verified and committed to Supabase.');
      setParsedData(null);
      
      // Redirect to ledger page after short delay
      setTimeout(() => {
        router.push('/transactions');
      }, 1500);
    } catch (err) {
      console.error('Persistence failed:', err);
      alert('Persistence failed. Verify RLS tables allow inserts.');
    } finally {
      setSaveLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Statement Ingestion</h1>
        <p className="text-sm text-slate-500 font-medium">Reconcile raw statement tables and check balances before persisting</p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Main grid */}
      {!parsedData ? (
        <div className="max-w-xl mx-auto py-12">
          <StatementDropzone onUpload={handleUpload} loading={loading} />
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Arithmetic Audit Summary Banner */}
          <div className={`p-6 rounded-2xl border ${
            parsedData.audit.is_valid
              ? 'bg-emerald-50/50 border-emerald-100/50 text-emerald-800'
              : 'bg-rose-50/50 border-rose-100/50 text-rose-800'
          } shadow-sm`}>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {parsedData.audit.is_valid ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold tracking-tight">
                  {parsedData.audit.is_valid 
                    ? 'Balance Continuity: 100% Mathematically Verified' 
                    : `Arithmetic discrepancies detected (${parsedData.audit.mismatch_count} mismatches)`}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {parsedData.audit.is_valid
                    ? 'All transactions reconcile perfectly. Expected ending balance matches the statement.'
                    : 'The running balance doesn\'t balance out across page intervals. Verify if password was correct.'}
                </p>
              </div>
              <button
                onClick={handleSaveToDatabase}
                disabled={saveLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-all active:scale-[0.98] disabled:bg-slate-300 cursor-pointer shadow-sm"
              >
                {saveLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    Commit to Supabase
                    <Database className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bank & Account Info */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs font-semibold text-slate-500 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="flex items-center gap-2">
              <Building className="w-4.5 h-4.5 text-blue-600" />
              <span className="text-slate-400">Detected Bank:</span>
              <span className="text-slate-900 font-bold">{parsedData.bank_name}</span>
            </span>
            <span className="hidden sm:inline h-4 w-[1px] bg-slate-200" />
            <span className="flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-emerald-600" />
              <span className="text-slate-400">Account Number:</span>
              <span className="text-slate-900 font-mono font-bold">{parsedData.account_number}</span>
            </span>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Balance</span>
              <h4 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(parsedData.audit.opening_balance)}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Inflows (Credit)
              </span>
              <h4 className="text-lg font-bold text-emerald-600 mt-1">+{formatCurrency(parsedData.audit.total_inflows)}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-rose-600 flex items-center gap-0.5">
                <TrendingDown className="w-3 h-3" /> Outflows (Debit)
              </span>
              <h4 className="text-lg font-bold text-slate-800 mt-1">-{formatCurrency(parsedData.audit.total_outflows)}</h4>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closing Balance</span>
              <h4 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(parsedData.audit.closing_balance)}</h4>
            </div>
          </div>

          {/* Discrepancies details */}
          {!parsedData.audit.is_valid && parsedData.audit.mismatches.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm">
              <h4 className="text-sm font-bold text-rose-800 uppercase tracking-wider mb-3">Mismatch Breakdown</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {parsedData.audit.mismatches.map((m: any, i: number) => (
                  <div key={i} className="text-xs flex justify-between items-center border-b border-rose-50 pb-2">
                    <span className="text-slate-600 font-medium">{m.date} - {m.description}</span>
                    <span className="text-rose-700 font-semibold">Expected: {formatCurrency(m.expected)} | Actual: {formatCurrency(m.actual)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Parsed Statements Preview ({parsedData.parsed_count} rows)</h4>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 sticky top-0 z-10">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Narration</th>
                    <th className="py-3 px-6">Payment Rail</th>
                    <th className="py-3 px-6">Resolved Entity</th>
                    <th className="py-3 px-6 text-right">Debit (Dr)</th>
                    <th className="py-3 px-6 text-right">Credit (Cr)</th>
                    <th className="py-3 px-6 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {parsedData.transactions.map((tx: any, idx: number) => {
                    const isCredit = tx.deposit_cr > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-6 text-slate-500 whitespace-nowrap">{tx.transaction_date || 'N/A'}</td>
                        <td className="py-3 px-6 max-w-xs truncate text-slate-800 font-semibold" title={tx.raw_narration}>
                          {tx.raw_narration}
                        </td>
                        <td className="py-3 px-6 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border border-slate-200">
                            {tx.payment_rail}
                          </span>
                        </td>
                        <td className="py-3 px-6">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                            <Building className="w-3 h-3 text-slate-400" />
                            {tx.clean_entity}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-right text-slate-800 font-medium">
                          {tx.withdrawal_dr > 0 ? formatCurrency(tx.withdrawal_dr) : '—'}
                        </td>
                        <td className="py-3 px-6 text-right text-emerald-600 font-bold">
                          {tx.deposit_cr > 0 ? formatCurrency(tx.deposit_cr) : '—'}
                        </td>
                        <td className="py-3 px-6 text-right text-slate-800 font-semibold">
                          {tx.balance ? formatCurrency(tx.balance) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
