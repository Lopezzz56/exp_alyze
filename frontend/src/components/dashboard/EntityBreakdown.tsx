'use client';

import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { RevenueSplit } from '@/types';
import { Loader2 } from 'lucide-react';

interface EntityBreakdownProps {
  data: RevenueSplit[];
  loading: boolean;
}

export function EntityBreakdown({ data, loading }: EntityBreakdownProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatAbbreviatedCurrency = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return formatCurrency(val);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      const pct = totalRevenue > 0 ? ((entry.value / totalRevenue) * 100).toFixed(1) : '0';
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-100 shadow-lg text-xs">
          <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.payload.color }} />
            {entry.name}
          </span>
          <p className="mt-1 text-slate-900 font-bold">
            {formatCurrency(entry.value)} <span className="text-slate-400 font-medium text-[10px]">({pct}%)</span>
          </p>
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
          <span className="text-xs font-semibold">Allocating revenue shares...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[350px] bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl flex items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-slate-400">No stream allocation data available for this range.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] w-full transition-all duration-300 hover:shadow-[0_6px_25px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      <div>
        <h4 className="text-base font-bold text-slate-900 tracking-tight">Revenue Stream Distribution</h4>
        <p className="text-xs text-slate-400 font-medium">Product-wise distribution of inflows</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-4 my-4">
        {/* Donut Chart */}
        <div className="h-[180px] w-[180px] relative mx-auto shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Central Total Indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            <span className="text-[11px] font-bold text-slate-800 tracking-tight mt-0.5 leading-tight truncate w-full">
              {formatAbbreviatedCurrency(totalRevenue)}
            </span>
          </div>
        </div>

        {/* Legend / Metrics List Column */}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto text-xs pr-1 scrollbar-thin">
          {data.map((item, idx) => {
            const pct = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
            return (
              <div key={idx} className="flex justify-between items-center text-[11px] pb-1 border-b border-slate-50">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-semibold truncate" title={item.name}>{item.name}</span>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-slate-800 font-bold">{formatCurrency(item.value)}</p>
                  <p className="text-[9px] text-slate-400 font-bold">{pct.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
