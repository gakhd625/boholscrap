import type { ExtractionResult } from '@/lib/types';
import { OcrProvider, EMPTY_EXTRACTION } from './provider';

/**
 * Google Gemini Vision OCR Provider.
 * Uses Gemini 1.5 Flash for structured data extraction from Philippine IDs.
 * Free tier: 15 RPM, 1,500 RPD — more than enough for a jewelry shop.
 */
export class GeminiOcrProvider implements OcrProvider {
  name = 'gemini';
  private apiKey: string;
  private model = 'gemini-1.5-flash';
  private apiUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
  }

  async extractIdInformation(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<ExtractionResult> {
    try {
      const base64Image = imageBuffer.toString('base64');

      const prompt = `You are an expert at reading Philippine government-issued IDs.

Analyze this ID image and extract ALL available information.

Return ONLY a valid JSON object with these fields (use null for any field you cannot read):
{
  "fullName": "string or null - the full name on the ID",
  "idType": "string or null - the type of ID (e.g., 'Driver\\'s License (LTO)', 'SSS ID / UMID', 'Philippine National ID (PhilSys)', 'Passport', 'PRC ID', 'Postal ID', 'Voter\\'s ID (COMELEC)', 'TIN ID (BIR)', 'PhilHealth ID', 'Senior Citizen ID', 'PWD ID')",
  "idNumber": "string or null - the ID number or license number",
  "address": "string or null - the address on the ID",
  "dateOfBirth": "string or null - in YYYY-MM-DD format",
  "expirationDate": "string or null - in YYYY-MM-DD format",
  "confidence": "number between 0 and 1 - your confidence in the overall extraction accuracy"
}

Important:
- Extract the name exactly as it appears on the ID
- For ID numbers, include any prefixes or suffixes
- Normalize dates to YYYY-MM-DD format
- If the image is blurry, upside-down, or not a valid ID, set confidence below 0.3
- Return ONLY the JSON object, no other text`;

      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GeminiOCR] API error:', response.status);
        return {
          success: false,
          data: EMPTY_EXTRACTION,
          error: `OCR API returned status ${response.status}. The AI service may be temporarily unavailable.`,
          provider: this.name,
        };
      }

      const result = await response.json();

      // Extract text from Gemini response
      const textContent =
        result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from the response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          data: EMPTY_EXTRACTION,
          error: 'Could not parse structured data from the ID image. Please enter information manually.',
          provider: this.name,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        data: {
          fullName: parsed.fullName || null,
          idType: parsed.idType || null,
          idNumber: parsed.idNumber || null,
          address: parsed.address || null,
          dateOfBirth: parsed.dateOfBirth || null,
          expirationDate: parsed.expirationDate || null,
          confidence:
            typeof parsed.confidence === 'number'
              ? parsed.confidence
              : null,
        },
        provider: this.name,
      };
    } catch (error) {
      console.error('[GeminiOCR] Extraction error:', error);

      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          success: false,
          data: EMPTY_EXTRACTION,
          error: 'OCR request timed out. Please try again or enter information manually.',
          provider: this.name,
        };
      }

      return {
        success: false,
        data: EMPTY_EXTRACTION,
        error: 'Failed to process the ID image. Please enter information manually.',
        provider: this.name,
      };
    }
  }
}
