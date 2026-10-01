import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTransactionById } from '@/lib/actions/transactions';
import {
  maskIdNumber,
  formatDate,
  formatDateTime,
  formatCurrency,
  getTransactionTypeLabel,
} from '@/lib/utils';
import { IdImageViewer } from '@/components/id-image-viewer';
import {
  ArrowLeft,
  Receipt,
  User,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  UserCircle,
  StickyNote,
} from 'lucide-react';

interface TransactionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({
  params,
}: TransactionDetailPageProps) {
  const { id } = await params;
  const result = await getTransactionById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const tx = result.data;
  const customer = tx.customer as any;
  const idDoc = tx.id_document as any;
  const staff = tx.staff as any;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-surface-600 hover:text-surface-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-950">
              Transaction Details
            </h1>
            <p className="text-surface-600 text-sm mt-1">
              {formatDateTime(tx.created_at)}
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-gold-500/10 text-gold-400 text-sm font-medium">
            {getTransactionTypeLabel(tx.transaction_type)}
          </div>
        </div>
      </div>

      {/* Transaction Info Card */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <h2 className="text-base font-semibold text-surface-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gold-500" />
          Transaction Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Type</p>
            <p className="text-sm font-medium text-surface-900 flex items-center gap-2">
              {getTransactionTypeLabel(tx.transaction_type)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Amount</p>
            <p className="text-lg font-bold text-surface-950 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gold-500" />
              {formatCurrency(tx.amount)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Date</p>
            <p className="text-sm font-medium text-surface-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-surface-600" />
              {formatDateTime(tx.transaction_date)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Staff</p>
            <p className="text-sm font-medium text-surface-900 flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-surface-600" />
              {staff?.full_name || 'Unknown'}
            </p>
          </div>
        </div>

        {tx.notes && (
          <div className="space-y-1 pt-2 border-t border-surface-300/20">
            <p className="text-xs text-surface-500 uppercase tracking-wider flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" />
              Notes
            </p>
            <p className="text-sm text-surface-800 whitespace-pre-wrap">{tx.notes}</p>
          </div>
        )}
      </div>

      {/* Customer Card */}
      {customer && (
        <Link
          href={`/customers/${customer.id}`}
          className="glass rounded-2xl p-6 space-y-4 block hover:bg-surface-200/20 transition-all group"
        >
          <h2 className="text-base font-semibold text-surface-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gold-500" />
            Customer
          </h2>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-surface-300/40 flex items-center justify-center">
              <User className="w-6 h-6 text-surface-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-surface-900">{customer.full_name}</p>
              <p className="text-xs text-surface-500 mt-0.5">
                {customer.id_type} · {maskIdNumber(customer.id_number)}
              </p>
            </div>
            <span className="text-xs text-gold-500 font-medium group-hover:underline">
              View Profile →
            </span>
          </div>
        </Link>
      )}

      {/* ID Document Used */}
      {idDoc && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-surface-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold-500" />
            ID Document Used
          </h2>

          <div className="bg-surface-200/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-surface-900">{idDoc.id_type}</p>
                <p className="text-xs text-surface-500">
                  Uploaded {formatDateTime(idDoc.uploaded_at)}
                </p>
              </div>
            </div>
            <IdImageViewer storagePath={idDoc.storage_path} />
          </div>
        </div>
      )}
    </div>
  );
}
