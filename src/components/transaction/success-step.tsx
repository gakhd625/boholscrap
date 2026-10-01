'use client';

import type { Transaction, Customer } from '@/lib/types';
import {
  formatCurrency,
  formatDateTime,
  getTransactionTypeLabel,
} from '@/lib/utils';
import {
  CheckCircle,
  Plus,
  Eye,
  User,
  ArrowRight,
} from 'lucide-react';

interface SuccessStepProps {
  transaction: Transaction;
  customer: Customer;
  onNewTransaction: () => void;
  onViewTransaction: () => void;
  onViewCustomer: () => void;
}

export function SuccessStep({
  transaction,
  customer,
  onNewTransaction,
  onViewTransaction,
  onViewCustomer,
}: SuccessStepProps) {
  return (
    <div className="glass rounded-2xl p-6 sm:p-8 text-center space-y-6 animate-slide-up">
      {/* Success Icon */}
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-surface-950">
          Transaction Saved!
        </h2>
        <p className="text-surface-600 mt-2">
          The transaction has been recorded successfully.
        </p>
      </div>

      {/* Summary */}
      <div className="bg-surface-200/30 rounded-xl p-4 text-left space-y-3 max-w-sm mx-auto">
        <div className="flex justify-between text-sm">
          <span className="text-surface-600">Customer</span>
          <span className="text-surface-900 font-medium">{customer.full_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-surface-600">Type</span>
          <span className="text-surface-900 font-medium">
            {getTransactionTypeLabel(transaction.transaction_type)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-surface-600">Amount</span>
          <span className="text-surface-900 font-semibold">
            {formatCurrency(transaction.amount)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-surface-600">Date</span>
          <span className="text-surface-900 font-medium">
            {formatDateTime(transaction.created_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 max-w-sm mx-auto">
        <button
          onClick={onNewTransaction}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl gold-gradient text-white font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-gold-500/20"
        >
          <Plus className="w-4 h-4" />
          New Transaction
        </button>
        <div className="flex gap-3">
          <button
            onClick={onViewTransaction}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-300/40 text-surface-700 text-sm font-medium hover:bg-surface-300/60 transition-all"
          >
            <Eye className="w-4 h-4" />
            View Transaction
          </button>
          <button
            onClick={onViewCustomer}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-300/40 text-surface-700 text-sm font-medium hover:bg-surface-300/60 transition-all"
          >
            <User className="w-4 h-4" />
            View Customer
          </button>
        </div>
      </div>
    </div>
  );
}
