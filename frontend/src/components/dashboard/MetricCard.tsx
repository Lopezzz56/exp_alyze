'use client';

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  loading?: boolean;
}

export function MetricCard({ title, value, icon, subtext, trend, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] animate-pulse flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="w-8 h-8 rounded-xl bg-slate-100" />
        </div>
        <div className="h-8 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
      <div className="flex justify-between items-start gap-4">
        <p className="text-sm font-medium text-slate-500 tracking-tight">{title}</p>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 shrink-0 shadow-inner">
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        
        {/* Trend Indicator and Subtext */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {trend && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-rose-50 text-rose-700'
            }`}>
              {trend.value}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-slate-400 font-medium">{subtext}</span>
          )}
        </div>
      </div>
    </div>
  );
}
