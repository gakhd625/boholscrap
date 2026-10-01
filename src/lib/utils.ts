import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx + tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize an ID number for consistent comparison.
 * Removes spaces, hyphens, and converts to uppercase.
 */
export function normalizeIdNumber(idNumber: string): string {
  return idNumber
    .replace(/[\s\-_.]/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Mask an ID number for display (show first 3 and last 2 characters).
 * Example: "1234567890" → "123•••••90"
 */
export function maskIdNumber(idNumber: string): string {
  if (!idNumber) return '';
  if (idNumber.length <= 5) return '•'.repeat(idNumber.length);
  const first = idNumber.slice(0, 3);
  const last = idNumber.slice(-2);
  const middle = '•'.repeat(Math.min(idNumber.length - 5, 6));
  return `${first}${middle}${last}`;
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a date string with time for display.
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format currency for Philippine Peso.
 */
export function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '₱0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(num);
}

/**
 * Validate an image file for ID upload.
 */
export function validateIdImage(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.',
    };
  }

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: 'File is too large. Maximum size is 10MB.',
    };
  }

  if (file.size < 1024) {
    return {
      valid: false,
      error: 'File appears to be empty or corrupted.',
    };
  }

  return { valid: true };
}

/**
 * Generate a storage path for an ID document image.
 */
export function generateStoragePath(fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  return `id-documents/${timestamp}-${random}.${ext}`;
}

/**
 * Capitalize first letter of each word.
 */
export function titleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get transaction type display label.
 */
export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    buy: 'Purchase',
    sell: 'Sale',
    pawn: 'Pawn',
    trade: 'Trade-In',
    repair: 'Repair',
    other: 'Other',
  };
  return labels[type] || type;
}

/**
 * Get confidence level display.
 */
export function getConfidenceLabel(confidence: number | null): {
  label: string;
  color: string;
} {
  if (confidence === null || confidence === undefined) {
    return { label: 'Unknown', color: 'text-zinc-400' };
  }
  if (confidence >= 0.9) {
    return { label: 'High', color: 'text-emerald-400' };
  }
  if (confidence >= 0.7) {
    return { label: 'Medium', color: 'text-amber-400' };
  }
  return { label: 'Low', color: 'text-rose-400' };
}
