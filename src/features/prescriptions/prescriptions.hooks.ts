import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { escapeLike } from '@/features/patients/patients.lib';
import { useDebouncedValue } from '@/lib/query';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/browser';

/** Active medicines by name, for prescribing. */
export function useMedicineSearch(input: string) {
  const query = useDebouncedValue(input.trim(), 200);

  return useQuery({
    queryKey: queryKeys.medicines.search(query),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from('medicines')
        .select('id, name, unit')
        .eq('is_active', true)
        .ilike('name', `%${escapeLike(query)}%`)
        .order('name')
        .limit(15);

      if (error) throw new Error('Pencarian obat gagal. Periksa koneksi internet lalu coba lagi.');

      return data;
    },
  });
}
