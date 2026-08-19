import type { HealthConcernId } from "@/lib/training/intake/types";

const HC_PREFIX = /^__hc:(\[.*?\])__\s*(.*)$/s;

/** Fallback, если колонка health_concerns ещё не мигрирована. */
export function encodeNotesWithHealth(
  concerns: HealthConcernId[] | undefined,
  notes?: string,
): string | null {
  const base = notes?.trim() ?? "";
  if (!concerns?.length) return base || null;
  const encoded = `__hc:${JSON.stringify(concerns)}__${base ? ` ${base}` : ""}`;
  return encoded;
}

export function decodeHealthFromNotes(raw: string | null | undefined): {
  healthConcerns: HealthConcernId[];
  notes?: string;
} {
  if (!raw?.trim()) return { healthConcerns: [] };
  const m = raw.match(HC_PREFIX);
  if (!m) return { healthConcerns: [], notes: raw.trim() };
  try {
    const parsed = JSON.parse(m[1]!) as HealthConcernId[];
    const rest = m[2]?.trim();
    return {
      healthConcerns: Array.isArray(parsed) ? parsed : [],
      notes: rest || undefined,
    };
  } catch {
    return { healthConcerns: [], notes: raw.trim() };
  }
}

export function isHealthConcernsSchemaError(message: string): boolean {
  return /health_concerns|schema cache|PGRST204/i.test(message);
}
