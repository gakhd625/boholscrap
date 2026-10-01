'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Lock } from 'lucide-react';

interface IdImageViewerProps {
  storagePath: string;
}

/**
 * Secure ID image viewer component.
 * Requires explicit staff action to view — never loads automatically.
 * Uses authenticated API route to serve private images.
 */
export function IdImageViewer({ storagePath }: IdImageViewerProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleView = useCallback(async () => {
    if (visible) {
      setVisible(false);
      setImageUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/id-image?path=${encodeURIComponent(storagePath)}`;
      // Verify the image loads before showing
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load image');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
      setVisible(true);
    } catch (err) {
      setError('Could not load the ID image.');
    } finally {
      setLoading(false);
    }
  }, [storagePath, visible]);

  return (
    <div className="space-y-2">
      <button
        onClick={handleView}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          visible
            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            : 'bg-surface-300/40 text-surface-700 hover:bg-surface-300/60'
        } disabled:opacity-50`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </>
        ) : visible ? (
          <>
            <EyeOff className="w-4 h-4" />
            Hide ID Image
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            View ID Image
          </>
        )}
      </button>

      {visible && imageUrl && (
        <div className="rounded-xl overflow-hidden bg-surface-100 border border-surface-300/30 animate-fade-in relative">
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-xs text-surface-500">
            <Lock className="w-3 h-3" />
            Private — Staff Only
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Government ID Document"
            className="w-full max-h-64 object-contain"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
