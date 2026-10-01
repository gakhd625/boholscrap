'use client';

import { useState, useEffect, useCallback } from 'react';
import { extractFromImage } from '@/lib/actions/transactions';
import type { ExtractionResult } from '@/lib/types';
import {
  Loader2,
  ScanSearch,
  AlertCircle,
  ArrowLeft,
  SkipForward,
  CheckCircle,
} from 'lucide-react';

interface ExtractionStepProps {
  storagePath: string;
  imagePreviewUrl: string | null;
  onExtractionComplete: (result: ExtractionResult) => void;
  onSkip: () => void;
  onGoBack: () => void;
}

export function ExtractionStep({
  storagePath,
  imagePreviewUrl,
  onExtractionComplete,
  onSkip,
  onGoBack,
}: ExtractionStepProps) {
  const [status, setStatus] = useState<'extracting' | 'done' | 'error'>('extracting');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runExtraction = useCallback(async () => {
    setStatus('extracting');
    setError(null);

    try {
      const response = await extractFromImage(storagePath);

      if (!response.success || !response.data) {
        setError(response.error || 'Extraction failed.');
        setStatus('error');
        return;
      }

      setResult(response.data);
      setStatus('done');
    } catch (err) {
      setError('An unexpected error occurred during extraction.');
      setStatus('error');
    }
  }, [storagePath]);

  useEffect(() => {
    runExtraction();
  }, [runExtraction]);

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-900">
          Extracting ID Information
        </h2>
        <p className="text-sm text-surface-600 mt-1">
          AI is analyzing the ID image to extract customer information.
        </p>
      </div>

      {/* ID Image Preview */}
      {imagePreviewUrl && (
        <div className="rounded-xl overflow-hidden bg-surface-100 border border-surface-300/30 max-h-48">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreviewUrl}
            alt="Uploaded ID"
            className="w-full max-h-48 object-contain"
          />
        </div>
      )}

      {/* Extracting State */}
      {status === 'extracting' && (
        <div className="text-center py-8 space-y-4 animate-fade-in">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full gold-gradient opacity-20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full gold-gradient flex items-center justify-center shadow-lg shadow-gold-500/20">
              <ScanSearch className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-surface-800 font-medium">Processing ID image...</p>
            <p className="text-sm text-surface-500 mt-1">
              This usually takes a few seconds.
            </p>
          </div>
          <div className="w-48 mx-auto h-1.5 rounded-full bg-surface-300/30 overflow-hidden">
            <div className="h-full rounded-full gold-gradient shimmer" style={{ width: '70%' }} />
          </div>
        </div>
      )}

      {/* Extraction Done */}
      {status === 'done' && result && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-400">
                Extraction complete
              </p>
              <p className="text-xs text-emerald-400/70 mt-0.5">
                {result.error
                  ? result.error
                  : 'Information extracted. Please review and confirm on the next step.'}
              </p>
            </div>
          </div>

          {/* Quick preview of extracted fields */}
          <div className="bg-surface-200/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              OCR Preview (Unconfirmed)
            </p>
            {result.data.fullName && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">Name</span>
                <span className="text-surface-800 font-medium">{result.data.fullName}</span>
              </div>
            )}
            {result.data.idType && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">ID Type</span>
                <span className="text-surface-800 font-medium">{result.data.idType}</span>
              </div>
            )}
            {result.data.idNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-600">ID Number</span>
                <span className="text-surface-800 font-medium">{result.data.idNumber}</span>
              </div>
            )}
            {!result.data.fullName && !result.data.idNumber && (
              <p className="text-sm text-surface-500 italic">
                No data could be extracted. You can enter it manually.
              </p>
            )}
          </div>

          <button
            onClick={() => onExtractionComplete(result)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl gold-gradient text-white font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-gold-500/20"
          >
            Continue to Review
          </button>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">
                Extraction encountered an issue
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                {error || 'Could not extract information from this image.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={runExtraction}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-300/40 text-surface-700 font-medium text-sm hover:bg-surface-300/60 transition-all"
            >
              Retry
            </button>
            <button
              onClick={onSkip}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl gold-gradient text-white font-semibold text-sm hover:brightness-110 transition-all shadow-md shadow-gold-500/20"
            >
              <SkipForward className="w-4 h-4" />
              Enter Manually
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="pt-2 border-t border-surface-300/20 flex items-center justify-between">
        <button
          onClick={onGoBack}
          disabled={status === 'extracting'}
          className="flex items-center gap-2 text-sm text-surface-600 hover:text-surface-800 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {status === 'extracting' && (
          <button
            onClick={onSkip}
            className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip & Enter Manually
          </button>
        )}
      </div>
    </div>
  );
}
