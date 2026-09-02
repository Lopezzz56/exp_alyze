'use client';

import React from 'react';
import { DateFilter, DateFilterType } from '@/lib/dateFilters';
import { Filter } from 'lucide-react';

interface DateFilterBarProps {
  value: DateFilter;
  onChange: (filter: DateFilter) => void;
}

export function DateFilterBar({ value, onChange }: DateFilterBarProps) {
  const handleTypeChange = (type: DateFilterType) => {
    if (type === 'MONTH') {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      onChange({ type, monthValue: monthStr });
    } else {
      onChange({ type });
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ type: 'MONTH', monthValue: e.target.value });
  };

  const presets: { type: DateFilterType; label: string }[] = [
    { type: 'ALL', label: 'All Time' },
    { type: 'FY_25_26', label: 'FY 2025-26' },
    { type: 'FY_24_25', label: 'FY 2024-25' },
    { type: 'Q1', label: 'Q1 (Apr-Jun)' },
    { type: 'Q2', label: 'Q2 (Jul-Sep)' },
    { type: 'Q3', label: 'Q3 (Oct-Dec)' },
    { type: 'Q4', label: 'Q4 (Jan-Mar)' },
    { type: 'MONTH', label: 'Monthly Picker' },
  ];

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filter Ledger Data Window:</span>
        </div>
        
        {value.type === 'MONTH' && value.monthValue && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Select Month:</span>
            <input
              type="month"
              value={value.monthValue}
              onChange={handleMonthChange}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 text-slate-700"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => {
          const isActive = value.type === preset.type;
          return (
            <button
              key={preset.type}
              onClick={() => handleTypeChange(preset.type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.15)]'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100/70 border border-slate-100/30'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
