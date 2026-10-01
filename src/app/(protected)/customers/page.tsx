'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { searchCustomers } from '@/lib/actions/transactions';
import type { Customer } from '@/lib/types';
import { maskIdNumber, formatDate } from '@/lib/utils';
import {
  Search,
  User,
  ArrowRight,
  Loader2,
  Users,
  Plus,
} from 'lucide-react';

export default function CustomersPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    const result = await searchCustomers(searchQuery);
    if (result.success && result.data) {
      setResults(result.data);
    }
    setLoading(false);
    setSearched(true);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-950">Customers</h1>
          <p className="text-surface-600 text-sm mt-1">
            Search by name or ID number.
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or ID number..."
          className="w-full h-14 pl-12 pr-4 rounded-2xl glass text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-base"
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500 animate-spin" />
        )}
      </div>

      {/* Results */}
      {searched && results.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center animate-fade-in">
          <Users className="w-10 h-10 text-surface-500 mx-auto mb-3" />
          <p className="text-surface-600 font-medium">No customers found</p>
          <p className="text-sm text-surface-500 mt-1">
            Try a different search term or create a new transaction.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((customer, index) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-surface-200/30 transition-all group animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-surface-300/40 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-surface-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-surface-900 truncate">
                  {customer.full_name}
                </p>
                <p className="text-xs text-surface-500 mt-0.5">
                  {customer.id_type} · {maskIdNumber(customer.id_number)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-surface-500/40 group-hover:text-surface-700 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!searched && !loading && (
        <div className="glass rounded-2xl p-8 text-center">
          <Search className="w-10 h-10 text-surface-500 mx-auto mb-3 opacity-50" />
          <p className="text-surface-600">
            Start typing to search for customers
          </p>
        </div>
      )}
    </div>
  );
}
