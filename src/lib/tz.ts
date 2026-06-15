// Single source of truth for the store's local timezone — WIB / Asia/Jakarta
// (UTC+7, no DST). All server-side "what day/time is it for the store" logic must
// go through here: the server runs in UTC (e.g. Vercel), so raw Date getters would
// be 7 hours off and misalign reports and time-based promos with the store's clock.
//
// The trick throughout: shift the absolute epoch by the offset, then read it with
// the *UTC* getters — that yields the store-local calendar fields without relying
// on the host timezone.

export const STORE_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight of the store-local day containing `now`, as absolute epoch ms. */
export function startOfStoreDay(now: number = Date.now()): number {
  return Math.floor((now + STORE_TZ_OFFSET_MS) / DAY_MS) * DAY_MS - STORE_TZ_OFFSET_MS;
}

/** yyyy-mm-dd of `ts` in the store timezone. */
export function storeIsoDate(ts: number): string {
  const d = new Date(ts + STORE_TZ_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Day of week (0 = Minggu/Sunday) of `ts` in the store timezone. */
export function storeDayOfWeek(ts: number): number {
  return new Date(ts + STORE_TZ_OFFSET_MS).getUTCDay();
}

/** Minutes since midnight (0–1439) right now in the store timezone. */
export function storeMinutesOfDay(now: number = Date.now()): number {
  const d = new Date(now + STORE_TZ_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
