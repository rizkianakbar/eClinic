/** Message keys (schedules.days.*) by ISO weekday - 1 (Monday first), matching doctor_schedules.day_of_week. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Message key of an ISO weekday (1 = Monday ... 7 = Sunday). */
export const weekdayKey = (day: number) => WEEKDAYS[(day - 1 + 7) % 7];
