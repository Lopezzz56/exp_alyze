import { useState, useCallback } from 'react';
import { Transaction } from '../types';
import { supabase } from '../lib/supabaseClient';
import { API_BASE_URL } from '../lib/constants';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch directly from Supabase using user session context to pass RLS
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Fetch transactions error:', err);
      setError(err.message || 'Failed to fetch transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSettlement = useCallback(async (transactionId: string, isSettled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      // Update directly via authenticated supabase client
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_settled: isSettled })
        .eq('id', transactionId);

      if (updateError) throw updateError;
      
      // Update local state
      setTransactions(prev =>
        prev.map(tx => (tx.id === transactionId ? { ...tx, is_settled: isSettled } : tx))
      );
    } catch (err: any) {
      console.error('Toggle settlement error:', err);
      setError(err.message || 'Failed to update settlement status.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const parseStatement = useCallback(async (file: File, password?: string) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (password) {
        formData.append('password', password);
      }

      // We still parse using the Python backend microservice
      const res = await fetch(`${API_BASE_URL}/api/v1/upload/extract-statement`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Statement parsing failed.');
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Parse statement error:', err);
      setError(err.message || 'Failed to parse statement.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTransactions = useCallback(async (accountId: string, transactionsList: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const payload = transactionsList.map(tx => ({
        account_id: accountId,
        transaction_date: tx.transaction_date,
        raw_narration: tx.raw_narration,
        reference_no: tx.reference_no,
        withdrawal_dr: tx.withdrawal_dr || 0.0,
        deposit_cr: tx.deposit_cr || 0.0,
        balance: tx.balance,
        payment_rail: tx.payment_rail,
        clean_entity: tx.clean_entity,
        revenue_stream: tx.revenue_stream,
        flow_type: tx.flow_type,
        is_pass_through: tx.is_pass_through || false,
        is_settled: tx.is_settled || false
      }));

      // Insert directly into Supabase table to pass RLS using non-nullable conflict columns
      const { data, error: insertError } = await supabase
        .from('transactions')
        .upsert(payload, { onConflict: 'account_id, transaction_date, raw_narration, withdrawal_dr, deposit_cr' });

      if (insertError) throw insertError;
      return { status: 'SUCCESS', data };
    } catch (err: any) {
      console.error('Save transactions error:', err);
      setError(err.message || 'Failed to save transactions.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    toggleSettlement,
    parseStatement,
    saveTransactions,
  };
}
