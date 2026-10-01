import type { ExtractedIdData, ExtractionResult } from '@/lib/types';

/**
 * OCR Provider Interface.
 * All OCR/AI providers must implement this interface.
 * This abstraction allows swapping providers without changing business logic.
 */
export interface OcrProvider {
  /** Provider name identifier */
  name: string;

  /**
   * Extract ID information from an image buffer.
   * @param imageBuffer - Raw image data
   * @param mimeType - MIME type of the image
   * @returns Extraction result with structured data
   */
  extractIdInformation(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<ExtractionResult>;
}

/**
 * Empty extraction result for fallback/manual entry.
 */
export const EMPTY_EXTRACTION: ExtractedIdData = {
  fullName: null,
  idType: null,
  idNumber: null,
  address: null,
  dateOfBirth: null,
  expirationDate: null,
  confidence: null,
};
