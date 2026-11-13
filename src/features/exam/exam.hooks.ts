import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@/lib/query';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/browser';
import { parseIcd10Search } from './exam.lib';

/** ICD-10 search by code prefix or disease name (English or Indonesian). */
export function useIcd10Search(input: string) {
  const query = useDebouncedValue(input.trim(), 200);
  const search = parseIcd10Search(query);

  return useQuery({
    queryKey: queryKeys.icd10.search(query),
    enabled: search !== null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      let request = createClient().from('icd10_codes').select('code, name, name_id').eq('is_active', true);

      if (search?.kind === 'code') request = request.like('code', `${search.code}%`);
      else if (search?.kind === 'name')
        request = request.or(`name.ilike.*${search.text}*,name_id.ilike.*${search.text}*`);

      const { data, error } = await request.order('code').limit(20);

      if (error) throw new Error('Pencarian ICD-10 gagal. Periksa koneksi internet lalu coba lagi.');

      return data;
    },
  });
}
