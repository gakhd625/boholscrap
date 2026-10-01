import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCustomerById } from '@/lib/actions/transactions';
import {
  maskIdNumber,
  formatDate,
  formatDateTime,
  formatCurrency,
  getTransactionTypeLabel,
} from '@/lib/utils';
import { IdImageViewer } from '@/components/id-image-viewer';
import {
  User,
  CreditCard,
  MapPin,
  Calendar,
  Plus,
  ArrowLeft,
  ArrowRight,
  Receipt,
  Clock,
  FileText,
} from 'lucide-react';

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const result = await getCustomerById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const customer = result.data;
  const transactions = customer.transactions || [];
  const idDocuments = customer.id_documents || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1 text-sm text-surface-600 hover:text-surface-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-950">
              {customer.full_name}
            </h1>
            <p className="text-surface-600 text-sm mt-1">
              {customer.id_type} · {maskIdNumber(customer.id_number)}
            </p>
          </div>
          <Link
            href={`/transactions/new?customerId=${customer.id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl gold-gradient text-white text-sm font-medium hover:brightness-110 transition-all shadow-md shadow-gold-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Transaction</span>
          </Link>
        </div>
      </div>

      {/* Customer Information Card */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-surface-900 flex items-center gap-2">
          <User className="w-5 h-5 text-gold-500" />
          Customer Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Full Name</p>
            <p className="text-sm font-medium text-surface-900">{customer.full_name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">ID Type</p>
            <p className="text-sm font-medium text-surface-900">{customer.id_type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">ID Number</p>
            <p className="text-sm font-medium text-surface-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-surface-600" />
              {maskIdNumber(customer.id_number)}
            </p>
          </div>
          {customer.address && (
            <div className="space-y-1">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Address</p>
              <p className="text-sm font-medium text-surface-900 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-surface-600 shrink-0 mt-0.5" />
                {customer.address}
              </p>
            </div>
          )}
          {customer.date_of_birth && (
            <div className="space-y-1">
              <p className="text-xs text-surface-500 uppercase tracking-wider">Date of Birth</p>
              <p className="text-sm font-medium text-surface-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-surface-600" />
                {formatDate(customer.date_of_birth)}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs text-surface-500 uppercase tracking-wider">Customer Since</p>
            <p className="text-sm font-medium text-surface-900">
              {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* ID Documents */}
      {idDocuments.length > 0 && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-surface-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gold-500" />
            ID Documents ({idDocuments.length})
          </h2>

          <div className="space-y-3">
            {idDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-surface-200/30 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-surface-900">{doc.id_type}</p>
                    <p className="text-xs text-surface-500">
                      Uploaded {formatDateTime(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
                <IdImageViewer storagePath={doc.storage_path} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-surface-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gold-500" />
          Transaction History ({transactions.length})
        </h2>

        {transactions.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-surface-500 mx-auto mb-2" />
            <p className="text-sm text-surface-600">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx: any) => (
              <Link
                key={tx.id}
                href={`/transactions/${tx.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-200/30 hover:bg-surface-200/50 transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-surface-900">
                    {getTransactionTypeLabel(tx.transaction_type)}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {formatDateTime(tx.created_at)}
                    {tx.staff?.full_name ? ` · ${tx.staff.full_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-surface-900">
                    {formatCurrency(tx.amount)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-surface-500/40 group-hover:text-surface-700 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
