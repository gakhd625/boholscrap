'use client';

import { useState, useEffect } from 'react';
import { getPurchaseSummary, PurchaseSummaryData } from '@/lib/actions/summary';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Layers, Scale, DollarSign, Loader2, AlertCircle, Coins } from 'lucide-react';
import { KARAT_OPTIONS, COIN_DENOMINATIONS } from '@/lib/types';

export default function PurchaseSummaryPage() {
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PurchaseSummaryData | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      const res = await getPurchaseSummary(date);
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        setError(res.error || 'Failed to load summary');
      }
      setLoading(false);
    }
    loadData();
  }, [date]);

  // Order Gold breakdown
  const orderedGoldBreakdown = KARAT_OPTIONS.map((karat) => {
    const existing = summary?.karatBreakdown.find((k) => k.karat === karat);
    return existing || { karat, totalGrams: 0, totalAmount: 0 };
  });

  summary?.karatBreakdown.forEach((k) => {
    if (!KARAT_OPTIONS.includes(k.karat as any)) {
      orderedGoldBreakdown.push(k);
    }
  });

  // Order Silver Coin breakdown
  const orderedCoinBreakdown = COIN_DENOMINATIONS.map((denomination) => {
    const existing = summary?.silverCoinBreakdown.find((c) => c.denomination === denomination);
    return existing || { denomination, pieces: 0, totalAmount: 0 };
  });

  summary?.silverCoinBreakdown.forEach((c) => {
    if (!COIN_DENOMINATIONS.includes(c.denomination as any)) {
      orderedCoinBreakdown.push(c);
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">Purchase Summary</h1>
          <p className="text-surface-600 text-sm mt-1">Daily dashboard for gold, silver, and coin purchases</p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="dateFilter" className="text-sm font-medium text-surface-700">Date:</label>
          <input
            id="dateFilter"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
          />
          <button 
            onClick={() => setDate('all')}
            className={`h-10 px-3 rounded-lg border transition-all text-sm font-medium ${date === 'all' ? 'bg-gold-500/10 text-gold-600 border-gold-500/30' : 'bg-surface-100 border-surface-300/50 text-surface-700 hover:bg-surface-200'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-surface-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-gold-500" />
          <p>Calculating summary...</p>
        </div>
      ) : summary ? (
        <>
          {/* Top Level Overall Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-5 border-t-4 border-t-surface-400">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-surface-200/50 flex items-center justify-center text-surface-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider">Transactions</h3>
              </div>
              <p className="text-2xl font-bold text-surface-950">{summary.totalTransactions}</p>
            </div>

            <div className="glass rounded-2xl p-5 border-t-4 border-t-emerald-400 lg:col-span-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider">Overall Buying Amount</h3>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-emerald-500">{formatCurrency(summary.overallBuyingAmount)}</p>
                <p className="text-sm text-surface-500 mb-1">Gold + Silver + Coins</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* GOLD SECTION */}
            <div className="space-y-4">
              <div className="glass rounded-2xl p-6 border-t-4 border-t-gold-400 h-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center">
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                    Gold
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-200/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Total Gold Weight</p>
                    <p className="text-xl font-bold text-surface-950 flex items-baseline gap-1">
                      {summary.totalGoldWeight.toFixed(2)} <span className="text-sm font-normal text-surface-500">g</span>
                    </p>
                  </div>
                  <div className="bg-surface-200/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Total Gold Amount</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalGoldAmount)}</p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-surface-950 mb-3 border-b border-surface-300/30 pb-2">Karat Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="py-2 text-surface-500 font-medium">Karat</th>
                        <th className="py-2 text-surface-500 font-medium text-right">Grams</th>
                        <th className="py-2 text-surface-500 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-300/10">
                      {orderedGoldBreakdown.map((row) => (
                        <tr key={row.karat} className="hover:bg-surface-200/20">
                          <td className="py-2 font-medium text-surface-900">{row.karat}</td>
                          <td className="py-2 text-surface-700 text-right">{row.totalGrams.toFixed(2)} g</td>
                          <td className="py-2 font-medium text-surface-900 text-right">{formatCurrency(row.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SILVER & COINS SECTION */}
            <div className="space-y-6">
              
              {/* Silver Section */}
              <div className="glass rounded-2xl p-6 border-t-4 border-t-slate-400">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center">
                      <Scale className="w-4 h-4 text-white" />
                    </div>
                    Silver
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-200/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Total Silver Weight</p>
                    <p className="text-xl font-bold text-surface-950 flex items-baseline gap-1">
                      {summary.totalSilverWeight.toFixed(2)} <span className="text-sm font-normal text-surface-500">g</span>
                    </p>
                  </div>
                  <div className="bg-surface-200/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Total Silver Amount</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalSilverAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Silver Coins Section */}
              <div className="glass rounded-2xl p-6 border-t-4 border-t-slate-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 flex items-center justify-center">
                      <Coins className="w-4 h-4 text-slate-700" />
                    </div>
                    Silver Coins
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-surface-200/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Total Pieces</p>
                    <p className="text-xl font-bold text-surface-950 flex items-baseline gap-1">
                      {summary.totalSilverCoinsCount} <span className="text-sm font-normal text-surface-500">pcs</span>
                    </p>
                  </div>
                  <div className="bg-surface-200/30 rounded-xl p-4">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Total Coin Amount</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalSilverCoinsAmount)}</p>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-surface-950 mb-3 border-b border-surface-300/30 pb-2">Coin Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th className="py-2 text-surface-500 font-medium">Denomination</th>
                        <th className="py-2 text-surface-500 font-medium text-right">Quantity</th>
                        <th className="py-2 text-surface-500 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-300/10">
                      {orderedCoinBreakdown.map((row) => (
                        <tr key={row.denomination} className="hover:bg-surface-200/20">
                          <td className="py-2 font-medium text-surface-900">{row.denomination}</td>
                          <td className="py-2 text-surface-700 text-right">{row.pieces} pcs</td>
                          <td className="py-2 font-medium text-surface-900 text-right">{formatCurrency(row.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
