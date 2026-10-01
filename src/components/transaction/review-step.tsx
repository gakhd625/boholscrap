'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  findCustomerByIdNumber,
  completeTransaction,
} from '@/lib/actions/transactions';
import type {
  ExtractionResult,
  ConfirmedCustomerData,
  TransactionFormData,
  Customer,
  Transaction,
  CustomerMatch,
  TransactionItem,
  KaratOption,
  ItemType,
} from '@/lib/types';
import { PHILIPPINE_ID_TYPES, KARAT_OPTIONS, COIN_DENOMINATIONS } from '@/lib/types';
import {
  maskIdNumber,
  formatDate,
  formatCurrency,
  getConfidenceLabel,
  getTransactionTypeLabel,
} from '@/lib/utils';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserCheck,
  UserPlus,
  Eye,
  Shield,
  Info,
  PlusCircle,
  Trash2,
} from 'lucide-react';

interface ReviewStepProps {
  storagePath?: string | null;
  imagePreviewUrl: string | null;
  extractionResult: ExtractionResult | null;
  onTransactionCompleted: (transaction: Transaction, customer: Customer) => void;
  onGoBack: () => void;
  preselectedCustomer?: Customer;
}

export function ReviewStep({
  storagePath,
imagePreviewUrl,
  extractionResult,
  onTransactionCompleted,
  onGoBack,
  preselectedCustomer,
}: ReviewStepProps) {
  // Customer form fields (editable)
  const [fullName, setFullName] = useState(extractionResult?.data.fullName || '');
  const [idType, setIdType] = useState(extractionResult?.data.idType || '');
  const [idNumber, setIdNumber] = useState(extractionResult?.data.idNumber || '');
  const [address, setAddress] = useState(extractionResult?.data.address || '');
  const [dateOfBirth, setDateOfBirth] = useState(extractionResult?.data.dateOfBirth || '');

  // Transaction fields
  const [transactionType, setTransactionType] = useState<string>('other');
  const [items, setItems] = useState<TransactionItem[]>([
    { id: crypto.randomUUID(), itemType: 'gold', description: '', weight: 0, karat: '18K', pricePerGram: 0, itemTotal: 0 }
  ]);
  const [notes, setNotes] = useState('');

  // Customer matching
  const [customerMatches, setCustomerMatches] = useState<CustomerMatch[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer || null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchChecked, setMatchChecked] = useState(false);

  // Initialize form fields with preselected customer if available
  useEffect(() => {
    if (preselectedCustomer) {
      setFullName(preselectedCustomer.full_name);
      setIdType(preselectedCustomer.id_type);
      setIdNumber(preselectedCustomer.id_number);
      setAddress(preselectedCustomer.address || '');
      setDateOfBirth(preselectedCustomer.date_of_birth || '');
    }
  }, [preselectedCustomer]);

  // Existing customer's previous ID image
  const [showPreviousId, setShowPreviousId] = useState(false);
  const [previousIdUrl, setPreviousIdUrl] = useState<string | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confidence = extractionResult?.data.confidence;
  const confidenceInfo = getConfidenceLabel(confidence ?? null);

  // Auto-search for existing customer when ID number changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (idNumber && idNumber.length >= 3) {
        setMatchLoading(true);
        const result = await findCustomerByIdNumber(idNumber);
        if (result.success && result.data) {
          setCustomerMatches(result.data);
        }
        setMatchLoading(false);
        setMatchChecked(true);
      } else {
        setCustomerMatches([]);
        setMatchChecked(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [idNumber]);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    // Auto-fill from existing customer (staff can still override)
    setFullName(customer.full_name);
    setIdType(customer.id_type);
    setIdNumber(customer.id_number);
    setAddress(customer.address || '');
    setDateOfBirth(customer.date_of_birth || '');
  }, []);

  const handleUseNewCustomer = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  const handleViewPreviousId = useCallback(async (customerIdDoc?: string) => {
    if (!customerIdDoc) return;
    // Load via API route
    setPreviousIdUrl(`/api/id-image?path=${encodeURIComponent(customerIdDoc)}`);
    setShowPreviousId(true);
  }, []);

  // Form validation
  const isFormValid = fullName.trim() && idType && idNumber.trim() && items.length > 0 && items.every(i => i.description.trim() !== '');

  // Calculate overall total
  const overallTotal = items.reduce((sum, item) => sum + item.itemTotal, 0);

  // Item handlers
  const handleAddItem = useCallback(() => {
    setItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), itemType: 'gold', description: '', weight: 0, karat: '18K', pricePerGram: 0, itemTotal: 0 }
    ]);
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const handleItemChange = useCallback((id: string, field: keyof TransactionItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      
      // Setup defaults when itemType changes
      if (field === 'itemType') {
        if (value === 'gold') {
          updated.karat = '18K';
        } else if (value === 'silver_coin') {
          updated.denomination = '10c';
        }
      }

      // Auto-calculate item total if weight, price, or quantity changes
      const t = updated.itemType || 'gold';
      if (t === 'silver_coin') {
        if (field === 'quantity' || field === 'pricePerPiece') {
          const qty = field === 'quantity' ? Number(value) : (item.quantity || 0);
          const price = field === 'pricePerPiece' ? Number(value) : (item.pricePerPiece || 0);
          updated.itemTotal = qty * price;
        }
      } else {
        if (field === 'weight' || field === 'pricePerGram') {
          const weight = field === 'weight' ? Number(value) : (item.weight || 0);
          const price = field === 'pricePerGram' ? Number(value) : (item.pricePerGram || 0);
          updated.itemTotal = weight * price;
        }
      }
      
      // If user manually edits itemTotal, we just accept it
      
      return updated;
    }));
  }, []);

  // Submit handler — EXPLICIT CONFIRMATION
  const handleConfirmAndSave = useCallback(async () => {
    if (!isFormValid) {
      setError('Please fill in all required fields: Name, ID Type, and ID Number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const customerData: ConfirmedCustomerData = {
        fullName: fullName.trim(),
        idType,
        idNumber: idNumber.trim(),
        address: address.trim(),
        dateOfBirth: dateOfBirth || '',
      };

      const transactionData: TransactionFormData = {
        transactionType: transactionType as any,
        items: items,
        amount: overallTotal.toString(),
        notes: notes.trim(),
      };

      const result = await completeTransaction({
        customerData,
        existingCustomerId: selectedCustomer?.id,
        storagePath,
        transactionData,
        ocrRawData: extractionResult?.data
          ? (extractionResult.data as unknown as Record<string, unknown>)
          : undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to save transaction.');
        setSubmitting(false);
        return;
      }

      onTransactionCompleted(result.data!.transaction, result.data!.customer);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  }, [
    isFormValid,
    fullName,
    idType,
    idNumber,
    address,
    dateOfBirth,
    transactionType,
    items,
    overallTotal,
    notes,
    selectedCustomer,
    storagePath,
    extractionResult,
    onTransactionCompleted,
  ]);

  return (
    <div className="space-y-6">
      {/* OCR Confidence Banner */}
      {extractionResult && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-surface-800">
                  OCR Suggestion — Please Review
                </p>
                <p className="text-xs text-surface-500 mt-0.5">
                  The information below was extracted by AI. Verify and correct before confirming.
                </p>
              </div>
            </div>
            {confidence !== null && confidence !== undefined && (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full bg-surface-300/30 ${confidenceInfo.color}`}>
                {confidenceInfo.label} confidence
              </span>
            )}
          </div>
        </div>
      )}

      {/* Customer Match Alert */}
      {matchChecked && customerMatches.length > 0 && !selectedCustomer && (
        <div className="glass rounded-2xl p-4 border-2 border-emerald-500/30 animate-fade-in">
          <div className="flex items-start gap-3 mb-4">
            <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Existing customer found
              </p>
              <p className="text-xs text-surface-500 mt-0.5">
                A customer with this ID number already exists. Use the existing record to avoid duplicates.
              </p>
            </div>
          </div>

          {customerMatches.map((match) => (
            <div
              key={match.customer.id}
              className="bg-surface-200/30 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-surface-900">
                    {match.customer.full_name}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {match.customer.id_type} · {maskIdNumber(match.customer.id_number)}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                  Exact Match
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectCustomer(match.customer)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all"
                >
                  <UserCheck className="w-4 h-4" />
                  Use This Customer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Existing Customer */}
      {selectedCustomer && (
        <div className="glass rounded-2xl p-4 border-2 border-emerald-500/30 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">
                Using Existing Customer
              </p>
            </div>
            <button
              onClick={handleUseNewCustomer}
              className="text-xs text-surface-500 hover:text-surface-700 transition-colors"
            >
              Use New Instead
            </button>
          </div>
          <div className="bg-surface-200/30 rounded-xl p-3">
            <p className="font-medium text-surface-900">{selectedCustomer.full_name}</p>
            <p className="text-xs text-surface-500 mt-0.5">
              {selectedCustomer.id_type} · {maskIdNumber(selectedCustomer.id_number)}
            </p>
          </div>
        </div>
      )}

      {/* ID Image & Customer Form */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-semibold text-surface-900">
          {selectedCustomer ? 'Transaction Details' : 'Customer & Transaction Details'}
        </h2>

        {/* ID Image Preview */}
        {imagePreviewUrl && (
          <div className="rounded-xl overflow-hidden bg-surface-100 border border-surface-300/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="Uploaded ID"
              className="w-full max-h-52 object-contain"
            />
          </div>
        )}

        {/* Previous ID comparison */}
        {showPreviousId && previousIdUrl && (
          <div className="rounded-xl overflow-hidden bg-surface-100 border border-surface-300/30 p-3 space-y-2 animate-fade-in">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
              Previously Stored ID — Staff Verification
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previousIdUrl}
              alt="Previous ID"
              className="w-full max-h-52 object-contain rounded-lg"
            />
            <button
              onClick={() => setShowPreviousId(false)}
              className="text-xs text-surface-500 hover:text-surface-700"
            >
              Hide
            </button>
          </div>
        )}

        {/* Editable Form Fields */}
        {!selectedCustomer && (
          <div className="space-y-4">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
              Customer Information {extractionResult ? '(Editable — from OCR)' : '(Manual Entry)'}
            </p>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-surface-700 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface-200/50 border border-surface-300/50 text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all"
                placeholder="e.g., Juan A. Dela Cruz"
              />
            </div>

            {/* ID Type */}
            <div>
              <label htmlFor="idType" className="block text-sm font-medium text-surface-700 mb-1.5">
                ID Type <span className="text-rose-400">*</span>
              </label>
              <select
                id="idType"
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface-200/50 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all"
              >
                <option value="">Select ID type</option>
                {PHILIPPINE_ID_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* ID Number */}
            <div>
              <label htmlFor="idNumber" className="block text-sm font-medium text-surface-700 mb-1.5">
                ID Number <span className="text-rose-400">*</span>
              </label>
              <input
                id="idNumber"
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface-200/50 border border-surface-300/50 text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all"
                placeholder="e.g., D01-23-456789"
              />
              {matchLoading && (
                <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking for existing customer...
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-surface-700 mb-1.5">
                Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface-200/50 border border-surface-300/50 text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all"
                placeholder="Address on ID"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-surface-700 mb-1.5">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-surface-200/50 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all"
              />
            </div>
          </div>
        )}

        {/* Transaction Fields */}
        <div className="space-y-4 pt-4 border-t border-surface-300/20">
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
            Transaction Details
          </p>

          {/* Transaction Type */}
          <div>
            <label htmlFor="transactionType" className="block text-sm font-medium text-surface-700 mb-1.5">
              Transaction Type
            </label>
            <select
              id="transactionType"
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-surface-200/50 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all"
            >
              <option value="buy">Purchase (Customer buys)</option>
              <option value="sell">Sale (Customer sells)</option>
              <option value="pawn">Pawn</option>
              <option value="trade">Trade-In</option>
              <option value="repair">Repair</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-surface-700">
                Transaction Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 text-sm text-gold-500 hover:text-gold-600 font-medium transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Add Item
              </button>
            </div>
            
            {items.map((item, index) => (
              <div key={item.id} className="bg-surface-200/40 p-4 rounded-xl border border-surface-300/40 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-rose-400 hover:text-rose-500 transition-colors"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-medium text-surface-600 mb-1">Item Type</label>
                    <select
                      value={item.itemType || 'gold'}
                      onChange={(e) => handleItemChange(item.id, 'itemType', e.target.value as ItemType)}
                      className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                    >
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="silver_coin">Silver Coin</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-medium text-surface-600 mb-1">Description / Item Name</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                      placeholder={item.itemType === 'silver_coin' ? "e.g. Vintage coins" : "e.g. Necklace, Diamond Ring"}
                    />
                  </div>

                  {item.itemType === 'gold' && (
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">Karat</label>
                      <select
                        value={item.karat}
                        onChange={(e) => handleItemChange(item.id, 'karat', e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                      >
                        {KARAT_OPTIONS.map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {item.itemType === 'silver_coin' && (
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1">Denomination</label>
                      <select
                        value={item.denomination || '10c'}
                        onChange={(e) => handleItemChange(item.id, 'denomination', e.target.value)}
                        className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                      >
                        {COIN_DENOMINATIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(item.itemType === 'gold' || item.itemType === 'silver') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Weight (g)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={item.weight || ''}
                          onChange={(e) => handleItemChange(item.id, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Price per gram (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.pricePerGram || ''}
                          onChange={(e) => handleItemChange(item.id, 'pricePerGram', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </>
                  )}

                  {item.itemType === 'silver_coin' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Quantity (pieces)</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-surface-600 mb-1">Price per piece (₱)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.pricePerPiece || ''}
                          onChange={(e) => handleItemChange(item.id, 'pricePerPiece', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 px-3 rounded-lg bg-surface-100 border border-surface-300/50 text-surface-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </>
                  )}

                  <div className={item.itemType === 'gold' ? '' : 'md:col-span-2 lg:col-span-1'}>
                    <label className="block text-xs font-medium text-surface-600 mb-1">Item Total (₱)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.itemTotal || ''}
                      onChange={(e) => handleItemChange(item.id, 'itemTotal', parseFloat(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-lg bg-gold-500/10 border border-gold-500/30 text-surface-900 font-semibold focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Overall Total Display */}
          <div className="flex items-center justify-between p-4 bg-surface-200/50 rounded-xl border border-surface-300/50">
            <span className="text-sm font-medium text-surface-700">Overall Transaction Total</span>
            <span className="text-xl font-bold text-surface-950">{formatCurrency(overallTotal)}</span>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-surface-700 mb-1.5">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-surface-200/50 border border-surface-300/50 text-surface-900 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all resize-none"
              placeholder="Optional notes about this transaction"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-400 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Confirmation Section */}
      <div className="glass rounded-2xl p-6 border-2 border-gold-500/30 space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gold-400">
              Review the information before confirming
            </p>
            <p className="text-xs text-surface-500 mt-0.5">
              By confirming, the customer record and transaction will be saved.
              This action records your staff identity.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-surface-200/30 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-600">Customer</span>
            <span className="text-surface-900 font-medium">{fullName || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">ID</span>
            <span className="text-surface-900 font-medium">
              {idType ? `${idType}` : '—'} {idNumber ? `· ${maskIdNumber(idNumber)}` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Type</span>
            <span className="text-surface-900 font-medium">
              {getTransactionTypeLabel(transactionType)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-surface-600">Total Amount</span>
            <span className="text-surface-900 font-medium text-lg">
              {formatCurrency(overallTotal)}
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1 border-t border-surface-300/20 pt-2">
            <span className="text-surface-500">Items</span>
            <span className="text-surface-600 font-medium">{items.length} item(s)</span>
          </div>
          {selectedCustomer && (
            <div className="flex justify-between">
              <span className="text-surface-600">Status</span>
              <span className="text-emerald-400 font-medium">Returning Customer</span>
            </div>
          )}
        </div>

        <button
          onClick={handleConfirmAndSave}
          disabled={submitting || !isFormValid}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl gold-gradient text-white font-bold text-base hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-gold-500/25"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving Transaction...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Confirm & Save Transaction
            </>
          )}
        </button>
      </div>

      {/* Back Button */}
      <div className="pt-2">
        <button
          onClick={onGoBack}
          disabled={submitting}
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-800 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Extraction
        </button>
      </div>
    </div>
  );
}
