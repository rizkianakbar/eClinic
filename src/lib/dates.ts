export const CLINIC_TIME_ZONE = 'Asia/Jakarta';

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: CLINIC_TIME_ZONE,
  dateStyle: 'long',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: CLINIC_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: CLINIC_TIME_ZONE,
  timeStyle: 'short',
});

/** Calendar date in Jakarta as "YYYY-MM-DD" (use for visit_date, report ranges, counter scopes). */
export function toJakartaDate(date: Date) {
  return isoDateFormatter.format(date);
}

/** Today's calendar date in Jakarta as "YYYY-MM-DD". */
export function todayInJakarta() {
  return toJakartaDate(new Date());
}

/** e.g. "12 November 2026". */
export function formatDate(date: Date | string) {
  return longDateFormatter.format(new Date(date));
}

/** e.g. "12 Nov 2026, 09.30". */
export function formatDateTime(date: Date | string) {
  return dateTimeFormatter.format(new Date(date));
}

/** ISO weekday (1 = Monday ... 7 = Sunday) of a "YYYY-MM-DD" calendar date. */
export function isoWeekday(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();

  return day === 0 ? 7 : day;
}

/** Clock time in Jakarta, e.g. "09.30". */
export function formatTime(date: Date | string) {
  return timeFormatter.format(new Date(date));
}

/** Adds calendar months to a "YYYY-MM-DD" date, clamping to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();

  target.setUTCDate(Math.min(day, lastDay));

  return target.toISOString().slice(0, 10);
}

/** Adds calendar days to a "YYYY-MM-DD" date (negative goes back). */
export function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"). */
export function daysBetween(from: string, to: string) {
  const toUtc = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);

    return Date.UTC(year, month - 1, day);
  };

  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

/** "Hari ini", "Kemarin", "5 hari lalu", "3 minggu lalu", "2 bulan lalu", "1 tahun lalu". */
export function relativeDay(date: string, today: string) {
  const days = daysBetween(date, today);

  if (days <= 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  if (days < 14) return `${days} hari lalu`;
  if (days < 60) return `${Math.floor(days / 7)} minggu lalu`;
  if (days < 365) return `${Math.floor(days / 30)} bulan lalu`;

  return `${Math.floor(days / 365)} tahun lalu`;
}
