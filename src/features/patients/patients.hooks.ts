import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrap, useDebouncedValue } from '@/lib/query';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/browser';
import { createPatientAction, updatePatientAction } from './patients.actions';
import { escapeLike, type PatientValues, parsePatientSearch } from './patients.lib';

const SEARCH_LIMIT = 20;

/**
 * Search-as-you-type, straight from the browser client (RLS limits rows to the
 * user's clinic). Server Actions run one at a time, too slow for keystrokes.
 */
export type SearchPatient = NonNullable<ReturnType<typeof usePatientSearch>['data']>[number];

export function usePatientSearch(input: string) {
  const query = useDebouncedValue(input.trim(), 200);
  const search = parsePatientSearch(query);

  return useQuery({
    queryKey: queryKeys.patients.search(query),
    enabled: search !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let request = createClient()
        .from('patients')
        .select('id, mrn, full_name, nik, bpjs_number, birth_date, sex, phone')
        .eq('is_active', true);

      if (search?.kind === 'number') {
        request = request.or(
          `mrn.eq.${search.digits},nik.eq.${search.digits},bpjs_number.eq.${search.digits},phone.ilike.*${search.phone}*`,
        );
      } else if (search?.kind === 'name') {
        request = request.ilike('full_name', `%${escapeLike(search.text)}%`);
      }

      const { data, error } = await request.order('full_name').limit(SEARCH_LIMIT);

      if (error) throw new Error('Pencarian pasien gagal. Periksa koneksi internet lalu coba lagi.');

      return data;
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PatientValues) => unwrap(await createPatientAction(values)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.patients.all }),
  });
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PatientValues) => unwrap(await updatePatientAction(patientId, values)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.patients.all }),
  });
}
