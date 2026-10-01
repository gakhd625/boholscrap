import type { ExtractionResult } from '@/lib/types';
import { OcrProvider, EMPTY_EXTRACTION } from './provider';

/**
 * Mock OCR Provider for development and testing.
 * Returns empty extraction data, allowing manual entry.
 * Used when no OCR_API_KEY is configured.
 */
export class MockOcrProvider implements OcrProvider {
  name = 'mock';

  async extractIdInformation(
    _imageBuffer: Buffer,
    _mimeType: string
  ): Promise<ExtractionResult> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    return {
      success: true,
      data: {
        ...EMPTY_EXTRACTION,
        confidence: 0,
      },
      error: 'Using development mode — no OCR API configured. Please enter ID information manually.',
      provider: this.name,
    };
  }
}
