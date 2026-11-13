import { type AppLocale, INTL_LOCALE } from '@/i18n/locales';

export const CLINIC_TIME_ZONE = 'Asia/Jakarta';

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const formatters = new Map<string, Intl.DateTimeFormat>();

/** One cached formatter per language and style (Intl formatters are costly to build). */
function dateFormatter(locale: AppLocale, style: 'day' | 'date' | 'dateTime' | 'time') {
  const key = `${locale}:${style}`;
  let formatter = formatters.get(key);

  if (!formatter) {
    const options: Intl.DateTimeFormatOptions =
      style === 'day'
        ? { dateStyle: 'full' }
        : style === 'date'
          ? { dateStyle: 'long' }
          : style === 'dateTime'
            ? { dateStyle: 'medium', timeStyle: 'short' }
            : { timeStyle: 'short' };

    formatter = new Intl.DateTimeFormat(INTL_LOCALE[locale], { timeZone: CLINIC_TIME_ZONE, ...options });
    formatters.set(key, formatter);
  }

  return formatter;
}

/** Calendar date in Jakarta as "YYYY-MM-DD" (use for visit_date, report ranges, counter scopes). */
export function toJakartaDate(date: Date) {
  return isoDateFormatter.format(date);
}

/** Today's calendar date in Jakarta as "YYYY-MM-DD". */
export function todayInJakarta() {
  return toJakartaDate(new Date());
}

/** e.g. "12 November 2026". Printouts use the default (Bahasa). */
export function formatDate(date: Date | string, locale: AppLocale = 'id') {
  return dateFormatter(locale, 'date').format(new Date(date));
}

/** e.g. "Kamis, 12 November 2026" (en: "Thursday, 12 November 2026"). */
export function formatDay(date: Date | string, locale: AppLocale = 'id') {
  return dateFormatter(locale, 'day').format(new Date(date));
}

/** e.g. "12 Nov 2026, 09.30" (en: "12 Nov 2026, 09:30"). */
export function formatDateTime(date: Date | string, locale: AppLocale = 'id') {
  return dateFormatter(locale, 'dateTime').format(new Date(date));
}

/** ISO weekday (1 = Monday ... 7 = Sunday) of a "YYYY-MM-DD" calendar date. */
export function isoWeekday(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();

  return day === 0 ? 7 : day;
}

/** Clock time in Jakarta, e.g. "09.30" (en: "09:30"). */
export function formatTime(date: Date | string, locale: AppLocale = 'id') {
  return dateFormatter(locale, 'time').format(new Date(date));
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

const relativeFormatters = new Map<AppLocale, Intl.RelativeTimeFormat>();

/**
 * How long ago a calendar date was: "Hari ini", "Kemarin", "5 hari yang lalu", "3 minggu yang lalu"
 * (en: "Today", "Yesterday", "5 days ago"). Rounded down to days, weeks, months or years.
 */
export function relativeDay(date: string, today: string, locale: AppLocale = 'id') {
  let formatter = relativeFormatters.get(locale);

  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: 'auto' });
    relativeFormatters.set(locale, formatter);
  }

  const days = Math.max(0, daysBetween(date, today));

  const text =
    days < 14
      ? formatter.format(-days, 'day')
      : days < 60
        ? formatter.format(-Math.floor(days / 7), 'week')
        : days < 365
          ? formatter.format(-Math.floor(days / 30), 'month')
          : formatter.format(-Math.floor(days / 365), 'year');

  return text.charAt(0).toLocaleUpperCase(INTL_LOCALE[locale]) + text.slice(1);
}
