/**
 * Lifecycle Timestamp seam (card side).
 *
 * The single owner of how a plant stage-start (`seedling_start … cure_start`) is
 * converted between the backend wire format and the `datetime-local` input. See
 * CONTEXT.md "Lifecycle Timestamp" and ADR-0018. Lifecycle timestamps are
 * timezone-aware ISO 8601 datetimes end-to-end; date-only is only a legacy
 * stored value the read path tolerates.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Backend value → `datetime-local` input value (`YYYY-MM-DDTHH:MM`).
 *
 * A legacy date-only value is read as a LOCAL calendar date. `new Date('2026-01-15')`
 * parses as UTC midnight, which renders the previous day in negative-offset
 * timezones — so date-only is mapped straight to local midnight instead.
 */
export function fromBackend(value?: string | null): string {
  if (!value) return '';

  if (DATE_ONLY.test(value)) {
    return `${value}T00:00`;
  }

  const dt = new Date(value);
  if (isNaN(dt.getTime())) return '';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const min = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * `datetime-local` input value → wire string, verbatim (no truncation), or `null`
 * when empty. The backend parses the local datetime and stamps the timezone, so
 * the card sends the wall-clock value as-is.
 */
export function toWire(inputValue?: string | null): string | null {
  if (inputValue === null || inputValue === undefined) return null;
  const val = String(inputValue).trim();
  if (!val || val === 'null' || val === 'undefined') return null;
  return val;
}
