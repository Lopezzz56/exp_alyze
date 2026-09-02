'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { API_BASE_URL } from '@/lib/constants';
import { 
  Newspaper, 
  Loader2, 
  AlertCircle, 
  Building2, 
  ExternalLink, 
  ShieldAlert,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';

interface IndexItem {
  name: string;
  symbol: string;
  price: number;
  change: number;
  pct_change: number;
}

interface CompanyItem {
  name: string;
  ticker: string;
}

interface EventItem {
  entity: string;
  ticker: string;
  event_type: string;
  date: string;
  description: string;
}

interface NewsItem {
  entity: string;
  ticker: string;
  title: string;
  link: string;
  publisher: string;
  provider_publish_time?: string;
}

export default function MarketNewsPage() {
  const [data, setData] = useState<{
    indices: IndexItem[];
    companies: CompanyItem[];
    events: EventItem[];
    news: NewsItem[];
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<string>('ALL');

  useEffect(() => {
    async function loadMarketData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/api/v1/market/overview`);
        if (!res.ok) throw new Error('Failed to retrieve live market intelligence.');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error('Market API error:', err);
        setError(err.message || 'Could not connect to external finance stream.');
      } finally {
        setLoading(false);
      }
    }
    loadMarketData();
  }, []);

  // Filter news and corporate events based on selected holding name
  const filteredData = useMemo(() => {
    if (!data) return { news: [], events: [] };
    if (selectedHolding === 'ALL') {
      return { news: data.news, events: data.events };
    }
    return {
      news: data.news.filter(n => n.entity === selectedHolding),
      events: data.events.filter(e => e.entity === selectedHolding)
    };
  }, [data, selectedHolding]);

  const formatPublishTime = (timeStr?: string) => {
    if (!timeStr) return 'Recent';
    try {
      const timestamp = Number(timeStr);
      if (isNaN(timestamp)) return timeStr;
      return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeStr;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-slate-350" />
        <span className="text-xs font-semibold">Broadcasting market indices and resolving dynamic tickers...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-5 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-sm">Market Stream Failure</h5>
          <p className="text-xs text-rose-700 mt-1">{error || 'Could not retrieve financial data.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Top Ticker Tape Bar */}
      <div className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-md px-4 py-3 relative border border-slate-800">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth">
          <span className="flex items-center gap-1 text-[10px] font-extrabold text-blue-400 uppercase tracking-widest border-r border-slate-800 pr-4 shrink-0">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            Live Benchmarks:
          </span>
          {data.indices.map((idx) => {
            const isUp = idx.pct_change >= 0;
            return (
              <div key={idx.name} className="flex items-center gap-3 shrink-0 text-xs font-semibold">
                <span className="text-slate-400">{idx.name}</span>
                <span className="font-mono font-bold">{formatCurrency(idx.price)}</span>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold font-mono ${
                  isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-450'
                }`}>
                  {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                  {isUp ? '+' : ''}{idx.pct_change.toFixed(2)}%
                </span>
                <span className="text-slate-700">|</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Market Intelligence Hub</h1>
        <p className="text-sm text-slate-500 font-medium">Real-time stock news and corporate events resolved dynamically from your account ledger</p>
      </div>

      {/* 2. Dynamic Holdings Selector */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filter by holding stock:</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedHolding('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedHolding === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:text-slate-850 hover:bg-slate-100 border border-slate-200/50'
            }`}
          >
            All Holdings ({data.companies.length})
          </button>
          {data.companies.map((co) => (
            <button
              key={co.name}
              onClick={() => setSelectedHolding(co.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedHolding === co.name
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-850 hover:bg-slate-100 border border-slate-200/50'
              }`}
            >
              {co.name.replace("Limited", "").replace("Ltd", "").trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 3. Corporate Actions Calendar */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] h-fit">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <Calendar className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Corporate Announcements</h3>
          </div>
          
          {filteredData.events.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center font-medium">No announcements logged for this holding.</p>
          ) : (
            <div className="space-y-4">
              {filteredData.events.map((evt, idx) => {
                const isDiv = evt.event_type.toLowerCase().includes("dividend");
                return (
                  <div key={idx} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-800 font-extrabold">{evt.entity}</span>
                      <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider text-[8px] font-extrabold ${
                        isDiv ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {evt.event_type}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700 leading-normal">{evt.description}</p>
                    <div className="text-[10px] text-slate-400 font-bold font-mono pt-1">
                      📅 Date: {evt.date}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Responsive Market News Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
            <Newspaper className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Portfolio News Feed</h3>
          </div>

          {filteredData.news.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-450 bg-white border border-slate-100 rounded-2xl shadow-xs">
              <Newspaper className="w-8 h-8 text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-400">No news articles resolved for this holding.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredData.news.map((article, idx) => (
                <a
                  key={idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-[0_6px_25px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span>{article.entity}</span>
                      <span className="font-mono text-blue-600">{article.ticker}</span>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </h4>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-350 group-hover:text-blue-500 shrink-0 mt-0.5 transition-colors" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Source: {article.publisher}</span>
                    <span>{formatPublishTime(article.provider_publish_time)}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. SEBI Compliance Statutory Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-3 text-slate-550 shadow-xs mt-8">
        <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Statutory SEBI Regulatory Compliance</h5>
          <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
            Insights and automated analytics are generated for record-keeping and business workflow assistance. They do not constitute certified SEBI investment advice.
          </p>
        </div>
      </div>
    </div>
  );
}
