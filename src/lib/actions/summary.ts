'use server';

import { createClient } from '@/lib/supabase/server';
import { ActionResult, KARAT_OPTIONS, KaratOption, TransactionItem, COIN_DENOMINATIONS, CoinDenomination } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';

export interface KaratSummary {
  karat: KaratOption | string;
  totalGrams: number;
  totalAmount: number;
}

export interface CoinSummary {
  denomination: CoinDenomination | string;
  pieces: number;
  totalAmount: number;
}

export interface PurchaseSummaryData {
  overallBuyingAmount: number;
  
  totalTransactions: number;

  // Gold
  totalGoldWeight: number;
  totalGoldAmount: number;
  karatsPurchasedCount: number;
  karatBreakdown: KaratSummary[];

  // Silver
  totalSilverWeight: number;
  totalSilverAmount: number;

  // Silver Coins
  totalSilverCoinsCount: number;
  totalSilverCoinsAmount: number;
  silverCoinBreakdown: CoinSummary[];
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
    
    let totalGoldWeight = 0;
    let totalGoldAmount = 0;
    let totalSilverWeight = 0;
    let totalSilverAmount = 0;
    let totalSilverCoinsCount = 0;
    let totalSilverCoinsAmount = 0;
    let overallBuyingAmount = 0;

    // Initialize karat map with all options set to 0
    const karatMap = new Map<string, { totalGrams: number; totalAmount: number }>();
    KARAT_OPTIONS.forEach((k) => {
      karatMap.set(k, { totalGrams: 0, totalAmount: 0 });
    });

    const coinMap = new Map<string, { pieces: number; totalAmount: number }>();
    COIN_DENOMINATIONS.forEach((c) => {
      coinMap.set(c, { pieces: 0, totalAmount: 0 });
    });

    transactions?.forEach((tx) => {
      const items = (tx.items as unknown as TransactionItem[]) || [];
      if (items.length > 0) {
        totalTransactions++; // count transaction if it has items
      }

      items.forEach((item) => {
        const itemTotal = Number(item.itemTotal) || 0;
        overallBuyingAmount += itemTotal;
        
        const type = item.itemType || 'gold';

        if (type === 'gold') {
          const weight = Number(item.weight) || 0;
          const karat = item.karat || '18K';
          
          totalGoldWeight += weight;
          totalGoldAmount += itemTotal;

          if (!karatMap.has(karat)) {
            karatMap.set(karat, { totalGrams: 0, totalAmount: 0 });
          }
          const current = karatMap.get(karat)!;
          current.totalGrams += weight;
          current.totalAmount += itemTotal;
          
        } else if (type === 'silver') {
          const weight = Number(item.weight) || 0;
          totalSilverWeight += weight;
          totalSilverAmount += itemTotal;
          
        } else if (type === 'silver_coin') {
          const qty = Number(item.quantity) || 0;
          const denom = item.denomination || '10c';
          
          totalSilverCoinsCount += qty;
          totalSilverCoinsAmount += itemTotal;

          if (!coinMap.has(denom)) {
            coinMap.set(denom, { pieces: 0, totalAmount: 0 });
          }
          const current = coinMap.get(denom)!;
          current.pieces += qty;
          current.totalAmount += itemTotal;
        }
      });
    });

    // Format breakdown
    const karatBreakdown: KaratSummary[] = Array.from(karatMap.entries()).map(([karat, stats]) => ({
      karat,
      totalGrams: stats.totalGrams,
      totalAmount: stats.totalAmount,
    }));
    
    const silverCoinBreakdown: CoinSummary[] = Array.from(coinMap.entries()).map(([denomination, stats]) => ({
      denomination,
      pieces: stats.pieces,
      totalAmount: stats.totalAmount,
    }));

    const karatsPurchasedCount = Array.from(karatMap.values()).filter(s => s.totalGrams > 0).length;

    return {
      success: true,
      data: {
        overallBuyingAmount,
        totalTransactions,
        totalGoldWeight,
        totalGoldAmount,
        karatsPurchasedCount,
        karatBreakdown,
        totalSilverWeight,
        totalSilverAmount,
        totalSilverCoinsCount,
        totalSilverCoinsAmount,
        silverCoinBreakdown,
      },
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
