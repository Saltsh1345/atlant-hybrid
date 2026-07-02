/** Models that work with @google/generative-ai generateContent (v1beta). */
export const GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
] as const;

export type GeminiModelName = (typeof GEMINI_MODELS)[number];

export function isModelNotFoundError(message: string): boolean {
  return /404|not found|no longer available/i.test(message);
}
