import type { ExtractionResult } from '@/lib/types';
import type { OcrProvider } from './provider';
import { EMPTY_EXTRACTION } from './provider';
import { GeminiOcrProvider } from './gemini-provider';
import { MockOcrProvider } from './mock-provider';

/**
 * Get the configured OCR provider based on environment variables.
 */
function getProvider(): OcrProvider {
  const providerName = process.env.OCR_PROVIDER || 'gemini';
  const apiKey = process.env.OCR_API_KEY;

  switch (providerName) {
    case 'gemini':
      if (!apiKey) {
        console.warn(
          '[OCR] No OCR_API_KEY configured. Falling back to mock provider.'
        );
        return new MockOcrProvider();
      }
      return new GeminiOcrProvider(apiKey);
    case 'mock':
      return new MockOcrProvider();
    default:
      console.warn(
        `[OCR] Unknown provider "${providerName}". Falling back to mock.`
      );
      return new MockOcrProvider();
  }
}

/**
 * Main extraction function.
 * This is the single entry point for ID extraction.
 * Call this from server actions — never from client code.
 *
 * @param imageBuffer - Raw image data
 * @param mimeType - MIME type of the image
 * @returns ExtractionResult with structured ID data
 */
export async function extractIdInformation(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  try {
    const provider = getProvider();
    return await provider.extractIdInformation(imageBuffer, mimeType);
  } catch (error) {
    console.error('[OCR] Fatal extraction error:', error);
    return {
      success: false,
      data: EMPTY_EXTRACTION,
      error: 'An unexpected error occurred during ID processing. Please enter information manually.',
      provider: 'unknown',
    };
  }
}
