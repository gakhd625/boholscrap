'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCustomerById } from '@/lib/actions/transactions';
import { IdUploadStep } from '@/components/transaction/id-upload-step';
import { ExtractionStep } from '@/components/transaction/extraction-step';
import { ReviewStep } from '@/components/transaction/review-step';
import { SuccessStep } from '@/components/transaction/success-step';
import type {
  ExtractedIdData,
  ConfirmedCustomerData,
  TransactionFormData,
  Customer,
  Transaction,
  ExtractionResult,
} from '@/lib/types';
import { Check, Upload, ScanSearch, ClipboardCheck } from 'lucide-react';

type WorkflowStep = 'upload' | 'extract' | 'review' | 'success';

interface WorkflowState {
  step: WorkflowStep;
  storagePath: string | null;
  imagePreviewUrl: string | null;
  extractionResult: ExtractionResult | null;
  confirmedData: ConfirmedCustomerData | null;
  existingCustomer: Customer | null;
  transactionData: TransactionFormData | null;
  completedTransaction: Transaction | null;
  completedCustomer: Customer | null;
}

const steps: { key: WorkflowStep; label: string; icon: React.ElementType }[] = [
  { key: 'upload', label: 'Upload ID', icon: Upload },
  { key: 'extract', label: 'Extract Info', icon: ScanSearch },
  { key: 'review', label: 'Review & Confirm', icon: ClipboardCheck },
  { key: 'success', label: 'Done', icon: Check },
];

function NewTransactionContent() {
  const router = useRouter();

  const [state, setState] = useState<WorkflowState>({
    step: 'upload',
    storagePath: null,
    imagePreviewUrl: null,
    extractionResult: null,
    confirmedData: null,
    existingCustomer: null,
    transactionData: null,
    completedTransaction: null,
    completedCustomer: null,
  });

  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get('customerId');

  useEffect(() => {
    async function loadPreselectedCustomer() {
      if (customerIdParam && state.step === 'upload') {
        const result = await getCustomerById(customerIdParam);
        if (result.success && result.data) {
          setState((prev) => ({
            ...prev,
            existingCustomer: result.data as Customer,
            step: 'review',
          }));
        }
      }
    }
    loadPreselectedCustomer();
  }, [customerIdParam, state.step]);

  const currentStepIndex = steps.findIndex((s) => s.key === state.step);

  // Step 1 → Step 2: After image is uploaded
  const handleImageUploaded = useCallback(
    (storagePath: string, previewUrl: string) => {
      setState((prev) => ({
        ...prev,
        storagePath,
        imagePreviewUrl: previewUrl,
        step: 'extract',
      }));
    },
    []
  );

  // Step 2 → Step 3: After extraction completes (or manual entry chosen)
  const handleExtractionComplete = useCallback(
    (result: ExtractionResult) => {
      setState((prev) => ({
        ...prev,
        extractionResult: result,
        step: 'review',
      }));
    },
    []
  );

  // Skip extraction → go directly to review with empty data
  const handleSkipExtraction = useCallback(() => {
    setState((prev) => ({
      ...prev,
      extractionResult: {
        success: false,
        data: {
          fullName: null,
          idType: null,
          idNumber: null,
          address: null,
          dateOfBirth: null,
          expirationDate: null,
          confidence: null,
        },
        error: 'Extraction skipped. Please enter information manually.',
        provider: 'manual',
      },
      step: 'review',
    }));
  }, []);

  // Final: Transaction completed
  const handleTransactionCompleted = useCallback(
    (transaction: Transaction, customer: Customer) => {
      setState((prev) => ({
        ...prev,
        completedTransaction: transaction,
        completedCustomer: customer,
        step: 'success',
      }));
    },
    []
  );

  // Go back to previous step
  const handleGoBack = useCallback((toStep: WorkflowStep) => {
    setState((prev) => ({
      ...prev,
      step: toStep,
    }));
  }, []);

  // Start over
  const handleReset = useCallback(() => {
    setState({
      step: 'upload',
      storagePath: null,
      imagePreviewUrl: null,
      extractionResult: null,
      confirmedData: null,
      existingCustomer: null,
      transactionData: null,
      completedTransaction: null,
      completedCustomer: null,
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-950">New Transaction</h1>
        <p className="text-surface-600 text-sm mt-1">
          Upload a government ID, verify the customer, and record the transaction.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isFuture = index > currentStepIndex;

            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-initial">
                <div className="flex flex-col items-center gap-1.5 relative">
                  <div
                    className={`
                      w-10 h-10 rounded-xl flex items-center justify-center transition-all
                      ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isActive
                          ? 'gold-gradient text-white shadow-md shadow-gold-500/20 pulse-gold'
                          : 'bg-surface-300/30 text-surface-500'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      isActive
                        ? 'text-gold-400'
                        : isCompleted
                        ? 'text-emerald-400'
                        : 'text-surface-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500/40'
                        : 'bg-surface-300/30'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="animate-slide-up">
        {state.step === 'upload' && (
          <IdUploadStep onImageUploaded={handleImageUploaded} />
        )}

        {state.step === 'extract' && state.storagePath && (
          <ExtractionStep
            storagePath={state.storagePath}
            imagePreviewUrl={state.imagePreviewUrl}
            onExtractionComplete={handleExtractionComplete}
            onSkip={handleSkipExtraction}
            onGoBack={() => handleGoBack('upload')}
          />
        )}

        {state.step === 'review' && (
          <ReviewStep
            storagePath={state.storagePath}
            imagePreviewUrl={state.imagePreviewUrl}
            extractionResult={state.extractionResult}
            preselectedCustomer={state.existingCustomer || undefined}
            onTransactionCompleted={handleTransactionCompleted}
            onGoBack={() => {
              if (customerIdParam) {
                router.push('/customers');
              } else {
                handleGoBack('extract');
              }
            }}
          />
        )}

        {state.step === 'success' &&
          state.completedTransaction &&
          state.completedCustomer && (
            <SuccessStep
              transaction={state.completedTransaction}
              customer={state.completedCustomer}
              onNewTransaction={handleReset}
              onViewTransaction={() =>
                router.push(`/transactions/${state.completedTransaction!.id}`)
              }
              onViewCustomer={() =>
                router.push(`/customers/${state.completedCustomer!.id}`)
              }
            />
          )}
      </div>
    </div>
  );
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-10"><Check className="animate-spin text-gold-500 w-8 h-8" /></div>}>
      <NewTransactionContent />
    </Suspense>
  );
}
