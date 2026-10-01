'use client';

import { useState, useEffect } from 'react';
import { getPurchaseSummary, PurchaseSummaryData } from '@/lib/actions/summary';
import { formatCurrency } from '@/lib/utils';
import { Calendar, Layers, Scale, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { KARAT_OPTIONS } from '@/lib/types';

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

  // Order breakdown by our fixed array to maintain correct UI order
  const orderedBreakdown = KARAT_OPTIONS.map((karat) => {
    const existing = summary?.karatBreakdown.find((k) => k.karat === karat);
    return existing || { karat, totalGrams: 0, totalAmount: 0 };
  });

  // Add any unlisted/custom karats that were manually entered (if any)
  summary?.karatBreakdown.forEach((k) => {
    if (!KARAT_OPTIONS.includes(k.karat as any)) {
      orderedBreakdown.push(k);
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">Purchase Summary</h1>
          <p className="text-surface-600 text-sm mt-1">Daily dashboard for gold purchases</p>
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
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass rounded-2xl p-5 border-t-4 border-t-gold-400">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-surface-200/50 flex items-center justify-center text-surface-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider">Transactions</h3>
              </div>
              <p className="text-2xl font-bold text-surface-950">{summary.totalTransactions}</p>
            </div>

            <div className="glass rounded-2xl p-5 border-t-4 border-t-emerald-400">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <DollarSign className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider">Amount Purchased</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-500">{formatCurrency(summary.totalAmountPurchased)}</p>
            </div>

            <div className="glass rounded-2xl p-5 border-t-4 border-t-blue-400">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider">Total Weight</h3>
              </div>
              <p className="text-2xl font-bold text-surface-950">{summary.totalWeightPurchased.toFixed(2)} g</p>
            </div>

            <div className="glass rounded-2xl p-5 border-t-4 border-t-amber-400">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-surface-700 uppercase tracking-wider">Karats Purchased</h3>
              </div>
              <p className="text-2xl font-bold text-surface-950">{summary.karatsPurchasedCount}</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-surface-950 mb-4">Purchase Breakdown by Karat</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-300/30">
                    <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Karat</th>
                    <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-right">Total Grams</th>
                    <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-300/10">
                  {orderedBreakdown.map((row) => (
                    <tr key={row.karat} className="hover:bg-surface-200/20 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-surface-900">{row.karat}</td>
                      <td className="py-3 px-4 text-sm text-surface-700 text-right">
                        {row.totalGrams.toFixed(2)} g
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-surface-900 text-right">
                        {formatCurrency(row.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-300/40 bg-surface-200/20">
                    <td className="py-4 px-4 text-sm font-bold text-surface-950">TOTAL</td>
                    <td className="py-4 px-4 text-sm font-bold text-surface-950 text-right">
                      {summary.totalWeightPurchased.toFixed(2)} g
                    </td>
                    <td className="py-4 px-4 text-base font-bold text-emerald-500 text-right">
                      {formatCurrency(summary.totalAmountPurchased)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Simple Visualization */}
          <div className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-surface-950 mb-4">Weight Distribution</h2>
            <div className="space-y-4">
              {orderedBreakdown
                .filter(r => r.totalGrams > 0)
                .sort((a, b) => b.totalGrams - a.totalGrams)
                .map((row) => {
                  const percentage = summary.totalWeightPurchased > 0 
                    ? (row.totalGrams / summary.totalWeightPurchased) * 100 
                    : 0;
                  
                  return (
                    <div key={row.karat} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-surface-800">{row.karat}</span>
                        <span className="text-surface-600">{percentage.toFixed(1)}% ({row.totalGrams.toFixed(2)}g)</span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-200/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gold-400 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
              })}
              {summary.totalWeightPurchased === 0 && (
                <p className="text-sm text-surface-500 text-center py-4">No purchases for this period.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
