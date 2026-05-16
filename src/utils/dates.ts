// All date arithmetic treats YYYY-MM-DD strings as UTC to avoid timezone drift.

const DAY_MS = 86400000;

/** Number of days between two YYYY-MM-DD strings, inclusive of both ends. */
export function flightDays(start: string, end: string): number {
  return Math.max(1, (Date.parse(end) - Date.parse(start)) / DAY_MS + 1);
}

/** Add N days to a YYYY-MM-DD string (inclusive: +1 day = next day). */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(date) + n * DAY_MS).toISOString().slice(0, 10);
}
