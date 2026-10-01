import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-200/50 flex items-center justify-center mb-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
      <h2 className="text-xl font-semibold text-surface-900 mb-1">Loading Data</h2>
      <p className="text-surface-500 text-sm">Please wait while we fetch the latest information...</p>
    </div>
  );
}
