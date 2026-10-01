import Link from 'next/link';
import { Suspense } from 'react';
import {
  getRecentTransactions,
  getTransactionCount,
} from '@/lib/actions/transactions';
import { getCurrentUser } from '@/lib/actions/auth';
import {
  formatCurrency,
  formatDateTime,
  getTransactionTypeLabel,
} from '@/lib/utils';
import {
  Plus,
  Search,
  Receipt,
  TrendingUp,
  ArrowRight,
  Clock,
  User,
  Loader2,
} from 'lucide-react';

// Data fetching components
async function DashboardStats() {
  const [countResult, transactionsResult] = await Promise.all([
    getTransactionCount(),
    getRecentTransactions(8),
  ]);

  const count = countResult || 0;
  const transactions = transactionsResult?.data || [];
  
  const recentTotal = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <div className="grid grid-cols-2 gap-4 animate-fade-in">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-gold-500" />
          </div>
        </div>
        <p className="text-2xl font-bold text-surface-950">{count}</p>
        <p className="text-sm text-surface-600">Total Transactions</p>
      </div>
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
        <p className="text-2xl font-bold text-surface-950">
          {transactions.length > 0 ? formatCurrency(recentTotal) : '₱0.00'}
        </p>
        <p className="text-sm text-surface-600">Recent Total</p>
      </div>
    </div>
  );
}

async function RecentTransactionsList() {
  const result = await getRecentTransactions(8);
  const transactions = result?.data || [];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-surface-900">
          Recent Transactions
        </h2>
        {transactions.length > 0 && (
          <Link
            href="/transactions"
            className="text-sm text-gold-500 hover:text-gold-400 transition-colors flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

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
              style={{ animationDelay: `${index * 50}ms` }}
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

// Skeletons
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div key={i} className="glass rounded-2xl p-5 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-surface-300/50 mb-2"></div>
          <div className="h-8 bg-surface-300/50 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-surface-300/50 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  );
}

function TransactionsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-surface-300/50 rounded w-40 mb-4"></div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-surface-300/50 shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-surface-300/50 rounded w-1/3"></div>
              <div className="h-3 bg-surface-300/50 rounded w-1/4"></div>
            </div>
            <div className="h-4 bg-surface-300/50 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { profile } = await getCurrentUser();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-950">
          Welcome back
          {profile?.full_name ? (
            <span className="gold-text">, {profile.full_name.split(' ')[0]}</span>
          ) : null}
        </h1>
        <p className="text-surface-600 mt-1">
          Manage customer transactions and ID verification.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/transactions/new"
          className="group relative overflow-hidden rounded-2xl gold-gradient p-6 text-white shadow-xl shadow-gold-500/20 hover:brightness-110 transition-all active:scale-[0.98]"
        >
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
              <Plus className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold mb-1">New Transaction</h2>
            <p className="text-sm text-white/80">
              Upload ID, verify customer & record transaction
            </p>
          </div>
          <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/customers"
          className="group relative overflow-hidden rounded-2xl glass p-6 hover:bg-surface-200/30 transition-all active:scale-[0.98]"
        >
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-surface-300/40 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-surface-700" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 mb-1">
              Search Customers
            </h2>
            <p className="text-sm text-surface-600">
              Find customers by name or ID number
            </p>
          </div>
          <ArrowRight className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-surface-500/40 group-hover:text-surface-700 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Suspended Dashboard Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* Suspended Recent Transactions */}
      <Suspense fallback={<TransactionsSkeleton />}>
        <RecentTransactionsList />
      </Suspense>
    </div>
  );
}
