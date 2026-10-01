'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadIdImage } from '@/lib/actions/transactions';
import { validateIdImage } from '@/lib/utils';
import {
  Camera,
  Upload,
  X,
  RotateCcw,
  Loader2,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface IdUploadStepProps {
  onImageUploaded: (storagePath: string, previewUrl: string) => void;
}

export function IdUploadStep({ onImageUploaded }: IdUploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = useCallback((selectedFile: File) => {
    setError(null);

    const validation = validateIdImage(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file.');
      return;
    }

    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFileSelected(selectedFile);
    },
    [handleFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) handleFileSelected(droppedFile);
    },
    [handleFileSelected]
  );

  const handleClear = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('idImage', file);

      const result = await uploadIdImage(formData);

      if (!result.success) {
        setError(result.error || 'Upload failed.');
        setUploading(false);
        return;
      }

      onImageUploaded(result.data!.storagePath, previewUrl!);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setUploading(false);
    }
  }, [file, previewUrl, onImageUploaded]);

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-900">
          Upload Government ID
        </h2>
        <p className="text-sm text-surface-600 mt-1">
          Take a photo or upload an image of the customer&apos;s government-issued ID.
        </p>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleFileInput}
        aria-label="Upload ID image"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
        aria-label="Take photo of ID"
      />

      {/* Upload Area */}
      {!previewUrl ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-surface-400/30 rounded-2xl p-8 text-center hover:border-gold-500/50 hover:bg-surface-200/20 transition-all"
        >
          <ImageIcon className="w-12 h-12 text-surface-500 mx-auto mb-4" />
          <p className="text-surface-700 font-medium mb-4">
            Drop an image here or use the buttons below
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl gold-gradient text-white font-medium text-sm hover:brightness-110 transition-all shadow-md shadow-gold-500/20"
            >
              <Camera className="w-5 h-5" />
              Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-300/40 text-surface-800 font-medium text-sm hover:bg-surface-300/60 transition-all"
            >
              <Upload className="w-5 h-5" />
              Choose File
            </button>
          </div>
          <p className="text-xs text-surface-500 mt-4">
            JPEG, PNG, or WebP · Max 10MB
          </p>
        </div>
      ) : (
        /* Image Preview */
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-surface-100 border border-surface-300/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="ID Preview"
              className="w-full max-h-80 object-contain"
            />
            {!uploading && (
              <button
                onClick={handleClear}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                aria-label="Remove image"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-surface-600">
            <span className="truncate max-w-[200px]">{file?.name}</span>
            <span>
              {file ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : ''}
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClear}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-300/40 text-surface-700 font-medium text-sm hover:bg-surface-300/60 transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Change
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl gold-gradient text-white font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-gold-500/20"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Continue
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-400 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
