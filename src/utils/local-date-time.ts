const formatters = new Map<string, Intl.DateTimeFormat>();

/** Calendar values in Home Assistant's configured time zone. */
export function zonedDateParts(
  now: Date,
  timeZone?: string
): {
  year: string;
  month: string;
  day: string;
  hour: number;
  minute: number;
} {
  const key = timeZone ?? '';
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(key, formatter);
  }
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

export function todayISO(now: Date = new Date(), timeZone?: string): string {
  const { year, month, day } = zonedDateParts(now, timeZone);
  return `${year}-${month}-${day}`;
}

/** Return the next wall-clock schedule label, preserving the configured HH:mm form. */
export function nextScheduleTime(
  times: ReadonlyArray<{ time?: string; start_time?: string }>,
  now: Date = new Date(),
  timeZone?: string
): string | undefined {
  const today = zonedDateParts(now, timeZone);
  const dayStart = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day));
  let best: { at: number; label: string } | undefined;
  for (const item of times) {
    const value = item.time ?? item.start_time;
    if (!value) continue;
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
    if (!match) continue;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) continue;
    for (const dayOffset of [0, 1]) {
      const date = new Date(dayStart + dayOffset * 86_400_000);
      const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), h, m);
      // Offset before and after the target catches a DST gap or repeated hour.
      const offsets = new Set(
        [-36, 0, 36].map((hours) => {
          const at = target + hours * 3_600_000;
          const wall = zonedDateParts(new Date(at), timeZone);
          return (
            Date.UTC(
              Number(wall.year),
              Number(wall.month) - 1,
              Number(wall.day),
              wall.hour,
              wall.minute
            ) - at
          );
        })
      );
      const candidates = [...offsets].map((offset) => {
        const at = target - offset;
        const wall = zonedDateParts(new Date(at), timeZone);
        const sameDay =
          Number(wall.year) === date.getUTCFullYear() &&
          Number(wall.month) === date.getUTCMonth() + 1 &&
          Number(wall.day) === date.getUTCDate();
        const wallMinutes = wall.hour * 60 + wall.minute;
        return { at, wall, sameDay, wallMinutes };
      });
      const scheduled = h * 60 + m;
      const exact = candidates.filter(
        (candidate) => candidate.sameDay && candidate.wallMinutes === scheduled
      );
      // A skipped spring hour has no exact instant. Luxon normalizes it
      // forward by the gap, so use the first wall time after the request.
      const valid = exact.length
        ? exact
        : candidates.filter((candidate) => candidate.sameDay && candidate.wallMinutes > scheduled);
      for (const candidate of valid) {
        if (candidate.at <= now.getTime()) continue;
        if (!best || candidate.at < best.at) {
          best = {
            at: candidate.at,
            label: `${String(candidate.wall.hour).padStart(2, '0')}:${String(candidate.wall.minute).padStart(2, '0')}`,
          };
        }
      }
    }
  }
  return best?.label;
}
