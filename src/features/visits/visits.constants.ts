import type { Database } from '@/lib/supabase/database.types';

export type VisitStatus = Database['public']['Enums']['visit_status'];

export type PayerType = 'umum' | 'bpjs';

/**
 * The five stations of a visit, in order (registered counts as waiting). Names: messages
 * `journey.<status>.label | short | hint`. Kept free of Zod so the landing page can draw the journey cheaply.
 */
export const JOURNEY = [
  { status: 'waiting' },
  { status: 'in_exam' },
  { status: 'to_pharmacy' },
  { status: 'to_cashier' },
  { status: 'done' },
] as const satisfies readonly { status: VisitStatus }[];

export type JourneyStatus = (typeof JOURNEY)[number]['status'];
