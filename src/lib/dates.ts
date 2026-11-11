export const CLINIC_TIME_ZONE = "Asia/Jakarta";

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: CLINIC_TIME_ZONE,
  dateStyle: "long",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: CLINIC_TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
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
