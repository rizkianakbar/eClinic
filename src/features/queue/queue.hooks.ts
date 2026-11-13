import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { VitalsReading } from '@/features/exam/exam.lib';
import { type ActionResult, unwrap } from '@/lib/query';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/browser';
import type { QueueVisit } from './queue.lib';

/**
 * The app's one Realtime subscription to today's visits (mounted once, in the
 * app shell). Any insert, update or delete refetches every queue query; bursts
 * (signing moves a visit and writes several rows) collapse into one refetch.
 */
export function useQueueRealtime(visitDate: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel(`queue:${visitDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visits', filter: `visit_date=eq.${visitDate}` },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: queryKeys.queue.all }), 150);
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [visitDate, queryClient]);
}

/**
 * Today's visits for the clinic (RLS). Kept live by `useQueueRealtime` in the
 * shell, refetched on every screen that opens it, and every 60 s as a safety net.
 */
export function useQueueBoard(visitDate: string) {
  const queryKey = queryKeys.queue.board(visitDate);

  return useQuery({
    queryKey,
    // Live data: every screen that opens the board refetches it, so a status changed elsewhere is never shown stale.
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<QueueVisit[]> => {
      const { data, error } = await createClient()
        .from('visits')
        .select(
          'id, queue_no, status, doctor_id, poli_id, called_at, skipped_at, updated_at, created_at, vitals_recorded_at, payer_type, patient:patients(full_name, mrn, sex, birth_date), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)',
        )
        .eq('visit_date', visitDate)
        .order('queue_no');

      if (error) throw new Error('Antrean gagal dimuat. Periksa koneksi internet; daftar dicoba lagi otomatis.');

      return data;
    },
  });
}

/** Runs a queue Server Action and refreshes the board (Realtime also refreshes other screens). */
export function useQueueAction<TVariables>(
  visitDate: string,
  action: (variables: TVariables) => Promise<ActionResult>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => unwrap(await action(variables)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.queue.board(visitDate) }),
  });
}

export type DeskDetails = {
  /** Latest vitals reading per visit. */
  vitals: Map<string, VitalsReading & { created_at: string }>;
  /** Primary diagnosis per visit. */
  diagnoses: Map<string, { code: string; name: string }>;
};

/**
 * What the doctor's desk shows beside each patient: the latest vitals (triage
 * done?) and, for finished visits, the primary diagnosis. Refetches when the
 * set of visits changes and every minute.
 */
export function useDeskDetails(visitDate: string, visitIds: string[]) {
  const ids = [...visitIds].sort();

  return useQuery({
    queryKey: queryKeys.queue.desk(visitDate, ids),
    enabled: ids.length > 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<DeskDetails> => {
      const supabase = createClient();

      const [vitals, diagnoses] = await Promise.all([
        supabase
          .from('vitals')
          .select(
            'visit_id, created_at, systolic, diastolic, pulse, temperature, respiratory_rate, spo2, weight, height',
          )
          .in('visit_id', ids)
          .order('created_at', { ascending: false }),
        supabase
          .from('visit_diagnoses')
          .select('visit_id, icd10_code, icd10:icd10_codes(name, name_id)')
          .in('visit_id', ids)
          .eq('is_primary', true),
      ]);

      if (vitals.error || diagnoses.error) throw new Error('Rincian pasien gagal dimuat. Dicoba lagi otomatis.');

      const latest = new Map<string, VitalsReading & { created_at: string }>();

      for (const row of vitals.data) if (!latest.has(row.visit_id)) latest.set(row.visit_id, row);

      return {
        vitals: latest,
        diagnoses: new Map(
          diagnoses.data.map((row) => [
            row.visit_id,
            { code: row.icd10_code, name: row.icd10?.name_id ?? row.icd10?.name ?? row.icd10_code },
          ]),
        ),
      };
    },
  });
}
