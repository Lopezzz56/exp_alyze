'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { MonthlyPayout } from '@/types';
import { Loader2 } from 'lucide-react';

interface RevenueChartProps {
  data: MonthlyPayout[];
  loading: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  // Aggregate minor entities into "Others" (Top 5 + Others)
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 1. Calculate lifetime volumes for each entity across the dataset
    const entityTotals: { [key: string]: number } = {};
    let grandTotal = 0;

    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'month' && key !== 'sort_month') {
          const val = Number(item[key]) || 0;
          entityTotals[key] = (entityTotals[key] || 0) + val;
          grandTotal += val;
        }
      });
    });

    // 2. Sort by size and extract Top 5
    const sorted = Object.keys(entityTotals)
      .map(key => ({ name: key, total: entityTotals[key] }))
      .sort((a, b) => b.total - a.total);

    const top5Names = sorted.slice(0, 5).map(e => e.name);

    // 3. Re-map records, folding smaller entities into "Others"
    return data.map(item => {
      const newItem: any = { month: item.month };
      let othersSum = 0;

      Object.keys(item).forEach(key => {
        if (key !== 'month' && key !== 'sort_month') {
          const val = Number(item[key]) || 0;
          if (top5Names.includes(key)) {
            newItem[key] = val;
          } else {
            othersSum += val;
          }
        }
      });

      if (othersSum > 0) {
        newItem['Others'] = othersSum;
      }

      return newItem;
    });
  }, [data]);

  // Extract unique keys from the aggregated dataset
  const keys = useMemo(() => {
    if (processedData.length === 0) return [];
    const keysSet = new Set<string>();
    processedData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'month') {
          keysSet.add(key);
        }
      });
    });
    // Ensure "Others" is at the end of the keys array for consistent stacking
    const list = Array.from(keysSet);
    const hasOthers = list.includes('Others');
    const filtered = list.filter(k => k !== 'Others');
    if (hasOthers) {
      filtered.push('Others');
    }
    return filtered;
  }, [processedData]);

  // Curated premium palette for the chart
  const colors = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#64748b', // Others (slate)
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-100 shadow-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center gap-6 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="text-slate-900 font-bold">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-extrabold text-slate-900">
            <span>Total Payout</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full h-[350px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          <span className="text-xs font-semibold">Generating commission matrices...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[350px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl flex items-center justify-center">
        <p className="text-sm font-medium text-slate-400">No payout data available for this range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] w-full transition-all duration-300 hover:shadow-[0_6px_25px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      <div>
        <h4 className="text-base font-bold text-slate-900 tracking-tight">Month-over-Month Commission Payouts</h4>
        <p className="text-xs text-slate-400 font-medium">Aggregated credit ledger stacked by channel partners</p>
      </div>

      <div className="h-[240px] w-full my-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="month" 
              stroke="#94a3b8" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            {keys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                stackId="a" 
                fill={colors[index % colors.length]} 
                radius={index === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scrollable Legend Row */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 max-h-20 overflow-y-auto text-[10px] font-semibold text-slate-500 border-t border-slate-100 pt-3 scrollbar-thin">
        {keys.map((key, index) => (
          <span key={key} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
