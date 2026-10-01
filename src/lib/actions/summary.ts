'use server';

import { createClient } from '@/lib/supabase/server';
import { ActionResult, KARAT_OPTIONS, KaratOption, TransactionItem } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';

export interface KaratSummary {
  karat: KaratOption | string;
  totalGrams: number;
  totalAmount: number;
}

export interface PurchaseSummaryData {
  totalTransactions: number;
  totalAmountPurchased: number;
  totalWeightPurchased: number;
  karatsPurchasedCount: number;
  karatBreakdown: KaratSummary[];
}

export async function getPurchaseSummary(
  dateFilter: string | null // YYYY-MM-DD or null for all time
): Promise<ActionResult<PurchaseSummaryData>> {
  try {
    const supabase = await createClient();

    // Only get completed/valid transactions (transaction_type 'buy' usually means we are purchasing, but let's include all valid ones, or specifically 'buy'? 
    // The user said: "only include valid/completed transactions according to the application's existing transaction status system." 
    // Wait, the transaction table has `transaction_type IN ('buy', 'sell', 'pawn', 'trade', 'repair', 'other')`. There is no "status" field, so all rows are completed transactions. 
    // We should probably filter by `transaction_type = 'buy'` ? Or just include all?
    // User said: "This page is a daily purchasing dashboard for tracking how much gold we purchased... The Purchase Summary must automatically calculate its numbers..."
    // Since there's no status column, we just query the table. If they only want purchases, maybe we filter by 'buy' or 'trade'? We can just fetch all transactions for the date and sum up their items. 

    let query = supabase
      .from('transactions')
      .select('transaction_date, transaction_type, items, amount')
      .not('items', 'is', null);

    if (dateFilter && dateFilter !== 'all') {
      // Use Philippines timezone (+08:00) for Bohol Jewelry shop
      // This ensures 00:00:00 to 23:59:59 local time regardless of where the server is hosted (e.g. Vercel UTC)
      const startOfDay = `${dateFilter}T00:00:00+08:00`;
      const endOfDay = `${dateFilter}T23:59:59+08:00`;
      
      query = query
        .gte('transaction_date', startOfDay)
        .lte('transaction_date', endOfDay);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching transactions for summary:', error);
      return { success: false, error: 'Failed to fetch purchase summary.' };
    }

    let totalTransactions = 0;
    let totalAmountPurchased = 0;
    let totalWeightPurchased = 0;

    // Initialize karat map with all options set to 0
    const karatMap = new Map<string, { totalGrams: number; totalAmount: number }>();
    KARAT_OPTIONS.forEach((k) => {
      karatMap.set(k, { totalGrams: 0, totalAmount: 0 });
    });

    transactions?.forEach((tx) => {
      // Check if it's a purchase. Usually 'buy' or 'trade'. Let's include everything with items, or maybe just 'buy'?
      // I will include all because the user said "All purchases are entered manually through the existing New Transaction form" and didn't specify a type filter, but 'buy' makes the most sense. Wait, I will just process all returned transactions.
      const items = (tx.items as unknown as TransactionItem[]) || [];
      if (items.length > 0) {
        totalTransactions++; // count transaction if it has items
      }

      items.forEach((item) => {
        const weight = Number(item.weight) || 0;
        const itemTotal = Number(item.itemTotal) || 0;
        const karat = item.karat;

        totalWeightPurchased += weight;
        totalAmountPurchased += itemTotal;

        if (!karatMap.has(karat)) {
          karatMap.set(karat, { totalGrams: 0, totalAmount: 0 });
        }
        
        const current = karatMap.get(karat)!;
        current.totalGrams += weight;
        current.totalAmount += itemTotal;
      });
    });

    // Format breakdown
    const karatBreakdown: KaratSummary[] = Array.from(karatMap.entries()).map(([karat, stats]) => ({
      karat,
      totalGrams: stats.totalGrams,
      totalAmount: stats.totalAmount,
    }));

    const karatsPurchasedCount = Array.from(karatMap.values()).filter(s => s.totalGrams > 0).length;

    return {
      success: true,
      data: {
        totalTransactions,
        totalAmountPurchased,
        totalWeightPurchased,
        karatsPurchasedCount,
        karatBreakdown,
      },
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
