import 'server-only';
import type { ActionResult } from '@/lib/query';
import type { SupabaseClient } from '@/lib/supabase/server';
import { queueErrorMessage } from './queue.lib';

type VisitUpdate = {
  status?: 'in_exam' | 'cancelled';
  called_at?: string;
  skipped_at?: string;
  cancel_reason?: string;
};

/**
 * All queue actions are plain updates; private.visits_before_update() checks the
 * status, the actor's role and stamps call/skip times with the database clock.
 */
async function updateVisit(supabase: SupabaseClient, visitId: string, values: VisitUpdate): Promise<ActionResult> {
  const { data, error } = await supabase.from('visits').update(values).eq('id', visitId).select('id').maybeSingle();

  if (error) return { ok: false, error: queueErrorMessage(error) };
  if (!data) return { ok: false, error: queueErrorMessage({ message: 'not_allowed', code: 'P0001' }) };

  return { ok: true, data: undefined };
}

export const callVisit = (supabase: SupabaseClient, visitId: string) =>
  updateVisit(supabase, visitId, { called_at: new Date().toISOString() });

export const skipVisit = (supabase: SupabaseClient, visitId: string) =>
  updateVisit(supabase, visitId, { skipped_at: new Date().toISOString() });

export const startExam = (supabase: SupabaseClient, visitId: string) =>
  updateVisit(supabase, visitId, { status: 'in_exam' });

export const cancelVisit = (supabase: SupabaseClient, visitId: string, reason: string) =>
  updateVisit(supabase, visitId, { status: 'cancelled', cancel_reason: reason });
