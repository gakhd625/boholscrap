import Link from 'next/link';
import { getRecentTransactions } from '@/lib/actions/transactions';
import {
  formatCurrency,
  formatDateTime,
  getTransactionTypeLabel,
} from '@/lib/utils';
import {
  Plus,
  ArrowRight,
  User,
  Receipt,
  Clock,
} from 'lucide-react';

export default async function TransactionsPage() {
  const result = await getRecentTransactions(50);
  const transactions = result.data || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">Transactions</h1>
          <p className="text-surface-600 text-sm mt-1">
            All recorded transactions.
          </p>
        </div>
        <Link
          href="/transactions/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gold-gradient text-white text-sm font-medium hover:brightness-110 transition-all shadow-md shadow-gold-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Transaction</span>
        </Link>
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Clock className="w-10 h-10 text-surface-500 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No transactions yet</p>
          <p className="text-sm text-surface-500 mt-1">
            Create your first transaction to get started.
          </p>
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl gold-gradient text-white text-sm font-medium hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx, index) => (
            <Link
              key={tx.id}
              href={`/transactions/${tx.id}`}
              className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-surface-200/30 transition-all group animate-slide-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-surface-300/40 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-surface-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-900 truncate">
                  {(tx.customer as any)?.full_name || 'Unknown Customer'}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {getTransactionTypeLabel(tx.transaction_type)} ·{' '}
                  {formatDateTime(tx.created_at)}
                  {(tx.staff as any)?.full_name
                    ? ` · ${(tx.staff as any).full_name}`
                    : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-surface-900">
                  {formatCurrency(tx.amount)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500/40 group-hover:text-surface-700 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
