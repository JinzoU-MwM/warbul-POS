// Sanitize a customer-entered per-item note. Pure (no server deps) so it is
// safe to import on client + server and to unit-test standalone.
export const MAX_NOTE_LEN = 140;

export function cleanNote(s?: string | null): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE_LEN);
  return t.length ? t : null;
}
