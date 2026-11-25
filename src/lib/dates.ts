/**
 * Timezone-safe helpers for calendar dates in "YYYY-MM-DD" form.
 * All math happens in UTC so a date never shifts by a day depending on
 * where the code runs (the old implementation used local Date + toISOString).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

/** Today's date in the given IANA zone (defaults to Central European time). */
export function today(timeZone = "Europe/Berlin"): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function dateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function weekday(date: string): number {
  return toUtc(date).getUTCDay();
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(toUtc(date));
}

/** "YYYY-MM-DD" → "YYMMDD" (Skyscanner URL format). */
export function compactDate(date: string): string {
  return date.slice(2).replaceAll("-", "");
}

/** "YYYY-MM-DD HH:mm" → "HH:mm". */
export function timeOf(dateTime: string): string {
  return dateTime.slice(11, 16);
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
