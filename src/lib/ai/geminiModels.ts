/** Models for @google/generative-ai generateContent (v1beta). */
export const GEMINI_MODELS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
] as const;

export type GeminiModelName = (typeof GEMINI_MODELS)[number];

export function isModelNotFoundError(message: string): boolean {
  return /404|not found|no longer available/i.test(message);
}
