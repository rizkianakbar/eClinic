/** The time of day for the greeting, by Jakarta hour (message key under home.greeting). */
export function greeting(hour: number) {
  if (hour < 11) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 18) return 'afternoon';

  return 'evening';
}

/** Current hour in Asia/Jakarta. */
export function jakartaHour(date: Date) {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hourCycle: 'h23' }).format(date),
  );
}

type PaidInvoice = {
  total: number;
  subtotal?: number;
  payer_type: string;
  payments: { method: string; amount: number }[];
};

/**
 * Today's money by method (umum only; BPJS bills are counted, not summed),
 * how many payments each method took, and the discounts given (subtotal − total).
 */
export function paymentBreakdown(invoices: readonly PaidInvoice[]) {
  const byMethod = { cash: 0, qris: 0, transfer: 0 };
  const countByMethod = { cash: 0, qris: 0, transfer: 0 };
  let total = 0;
  let bpjs = 0;
  let discounts = 0;

  for (const invoice of invoices) {
    if (invoice.payer_type === 'bpjs') {
      bpjs += 1;
      continue;
    }

    total += invoice.total;
    discounts += Math.max(0, (invoice.subtotal ?? invoice.total) - invoice.total);

    for (const payment of invoice.payments) {
      if (payment.method in byMethod) {
        byMethod[payment.method as keyof typeof byMethod] += payment.amount;
        countByMethod[payment.method as keyof typeof countByMethod] += 1;
      }
    }
  }

  return { total, byMethod, countByMethod, discounts, umum: invoices.length - bpjs, bpjs };
}

/** One entry per day from `from` to `to`, zero where nothing was earned. */
export function dailySeries(rows: readonly { day: string; revenue: number }[], days: readonly string[]) {
  const byDay = new Map(rows.map((row) => [row.day, row.revenue]));

  return days.map((day) => ({ day, value: byDay.get(day) ?? 0 }));
}

/** Change against a previous value, as a whole percentage; null when there is nothing to compare. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;

  return Math.round(((current - previous) / previous) * 100);
}

/** Visits per day for the given days (zero where none). */
export function dailyVisitCounts(visits: readonly { visit_date: string }[], days: readonly string[]) {
  const counts = new Map<string, number>();

  for (const visit of visits) counts.set(visit.visit_date, (counts.get(visit.visit_date) ?? 0) + 1);

  return days.map((day) => ({ day, value: counts.get(day) ?? 0 }));
}

/** Current Jakarta time as "HH:MM". */
export function jakartaClock(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Opening hours today from the doctors' sessions (earliest start to latest end),
 * and where "now" falls: before opening, open, or after closing.
 */
export function clinicHours(sessions: readonly { startTime: string; endTime: string }[], now: string) {
  if (sessions.length === 0) return { state: 'closed' as const, from: null, to: null };

  const from = sessions.map((session) => session.startTime.slice(0, 5)).sort()[0];

  const to = sessions
    .map((session) => session.endTime.slice(0, 5))
    .sort()
    .at(-1)!;

  const state = now < from ? ('before' as const) : now >= to ? ('after' as const) : ('open' as const);

  return { state, from, to };
}
