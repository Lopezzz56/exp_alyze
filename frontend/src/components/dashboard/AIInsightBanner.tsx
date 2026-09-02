'use client';

import React from 'react';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckSquare, Loader2 } from 'lucide-react';

interface SmartInsightCard {
  title: string;
  insight_type: 'GROWTH' | 'WARNING' | 'DIVERSIFICATION' | 'ACTION_ITEM' | string;
  description: string;
  recommended_action?: string | null;
}

interface AIExecutiveReport {
  summary: string;
  insights: SmartInsightCard[];
}

interface AIInsightBannerProps {
  report: AIExecutiveReport | null;
  loading: boolean;
}

export function AIInsightBanner({ report, loading }: AIInsightBannerProps) {
  if (loading) {
    return (
      <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-xs animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-slate-350 animate-spin" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-slate-100 rounded w-1/4" />
            <div className="h-2.5 bg-slate-100 rounded w-2/3" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-50 border border-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const getCardTheme = (type: string) => {
    switch (type) {
      case 'GROWTH':
        return {
          icon: <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />,
          bg: 'bg-emerald-50/40 border-emerald-100/50',
          titleColor: 'text-emerald-900',
          descColor: 'text-emerald-700/90',
          badge: 'bg-emerald-100 text-emerald-800'
        };
      case 'WARNING':
      case 'CONCENTRATION':
        return {
          icon: <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />,
          bg: 'bg-rose-50/40 border-rose-100/50',
          titleColor: 'text-rose-900',
          descColor: 'text-rose-700/90',
          badge: 'bg-rose-100 text-rose-800'
        };
      case 'DIVERSIFICATION':
        return {
          icon: <Lightbulb className="w-4.5 h-4.5 text-amber-655 text-amber-600" />,
          bg: 'bg-amber-50/40 border-amber-100/50',
          titleColor: 'text-amber-900',
          descColor: 'text-amber-700/90',
          badge: 'bg-amber-100 text-amber-800'
        };
      case 'ACTION_ITEM':
      default:
        return {
          icon: <CheckSquare className="w-4.5 h-4.5 text-blue-600" />,
          bg: 'bg-blue-50/40 border-blue-100/50',
          titleColor: 'text-blue-900',
          descColor: 'text-blue-700/90',
          badge: 'bg-blue-100 text-blue-800'
        };
    }
  };

  return (
    <div className="space-y-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all duration-300">
      {/* Header & Macro Summary */}
      <div className="bg-gradient-to-tr from-blue-50/40 via-white to-blue-50/20 border border-blue-100/50 p-5 rounded-xl">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white border border-blue-100 rounded-xl shadow-xs text-blue-600 shrink-0">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI Intelligence Center</h3>
            <p className="text-xs text-slate-600 font-semibold mt-1.5 leading-relaxed">{report.summary}</p>
          </div>
        </div>
      </div>

      {/* Structured Insights Grid */}
      {report.insights && report.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.insights.map((insight, index) => {
            const theme = getCardTheme(insight.insight_type);
            return (
              <div 
                key={index}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs ${theme.bg}`}
              >
                <div>
                  <div className="flex justify-between items-center gap-2 mb-2">
                    <span className="flex items-center gap-1.5 font-bold text-xs">
                      {theme.icon}
                      <span className={theme.titleColor}>{insight.title}</span>
                    </span>
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme.badge}`}>
                      {insight.insight_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className={`text-[11px] font-semibold leading-relaxed ${theme.descColor}`}>
                    {insight.description}
                  </p>
                </div>
                
                {insight.recommended_action && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100/40 text-[10px] font-bold text-slate-500">
                    <span className="text-slate-400 uppercase tracking-wider block mb-0.5">Recommended Action:</span>
                    <span className="text-slate-700 leading-normal block font-semibold">{insight.recommended_action}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
