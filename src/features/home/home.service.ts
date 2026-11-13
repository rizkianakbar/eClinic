import 'server-only';
import { shortItems } from '@/features/pharmacy/pharmacy.lib';
import { availableStock } from '@/features/pharmacy/pharmacy.service';
import { fetchAll } from '@/lib/supabase/fetch-all';
import type { SupabaseClient } from '@/lib/supabase/server';

const VISIT_SELECT =
  'id, patient_id, status, queue_no, doctor_id, payer_type, called_at, skipped_at, created_at, updated_at, patient:patients(full_name, mrn), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)';

/** Today's visits (RLS: the user's clinic), in queue order. */
export async function listTodayVisits(supabase: SupabaseClient, today: string) {
  const { data, error } = await supabase.from('visits').select(VISIT_SELECT).eq('visit_date', today).order('queue_no');

  if (error) throw new Error(`listTodayVisits failed: ${error.code}`);

  return data;
}

const DESK_SELECT =
  'id, status, queue_no, doctor_id, payer_type, updated_at, patient:patients(full_name, mrn), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)';

/** Patients waiting to pay, oldest first, with their bill total when it exists. */
export async function listCashierDesk(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('visits')
    .select(`${DESK_SELECT}, invoices(total, status, items:invoice_items(count))`)
    .eq('status', 'to_cashier')
    .order('updated_at');

  if (error) throw new Error(`listCashierDesk failed: ${error.code}`);

  return data.map((visit) => ({
    ...visit,
    billTotal: visit.invoices.find((invoice) => invoice.status !== 'void')?.total ?? null,
    billLines: visit.invoices.find((invoice) => invoice.status !== 'void')?.items[0]?.count ?? null,
  }));
}

/** Today's paid invoices with how they were paid (Jakarta day). */
export async function listPaidTodayDetail(supabase: SupabaseClient, today: string) {
  // The day's totals per payment method are summed from this list: every paid invoice of the day.
  return fetchAll('listPaidTodayDetail', (from, to) =>
    supabase
      .from('invoices')
      .select(
        'id, invoice_no, subtotal, total, payer_type, paid_at, payments(method, amount), visit:visits(id, queue_no, patient:patients(full_name, mrn), poli:polis(name))',
      )
      .eq('status', 'paid')
      .gte('paid_at', `${today}T00:00:00+07:00`)
      .order('paid_at', { ascending: false })
      .order('id')
      .range(from, to),
  );
}

/** Prescriptions waiting at the pharmacy, oldest first, with their size. */
export async function listPharmacyDesk(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('visits')
    .select(
      `${DESK_SELECT}, prescriptions(items:prescription_items(id, qty, compound_id, created_at, medicine:medicines(id, name, unit)), compounds:prescription_compounds(id, form))`,
    )
    .eq('status', 'to_pharmacy')
    .order('updated_at');

  if (error) throw new Error(`listPharmacyDesk failed: ${error.code}`);

  type DeskItem = {
    id: string;
    qty: number;
    compound_id: string | null;
    created_at: string;
    medicine: { id: string; name: string; unit: string } | null;
  };

  const visits = data.map((visit) => {
    // One prescription per visit (unique visit_id); PostgREST may return it as an object or a one-item array.
    const prescription = Array.isArray(visit.prescriptions) ? visit.prescriptions[0] : visit.prescriptions;
    const items: DeskItem[] = prescription?.items ?? [];
    const compounds: { id: string; form: string }[] = prescription?.compounds ?? [];

    return { visit, items, compounds };
  });

  // One stock read for every waiting prescription: which ones will hit a shortage.
  const available = await availableStock(
    supabase,
    visits.flatMap((entry) => entry.items.flatMap((item) => (item.medicine ? [item.medicine.id] : []))),
  );

  return visits.map(({ visit, items, compounds }) => {
    const dbOrder = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

    const short = shortItems(
      dbOrder.map((item) => ({ id: item.id, medicineId: item.medicine?.id ?? '', qty: item.qty })),
      available,
    );

    return {
      ...visit,
      itemCount: items.length,
      compoundCount: compounds.length,
      /** Regular medicines by name, then each racikan once. */
      medicines: [
        ...items
          .filter((item) => !item.compound_id)
          .map((item) => ({
            id: item.id,
            name: item.medicine?.name ?? '',
            amount: `${item.qty} ${item.medicine?.unit ?? ''}`,
            short: short.has(item.id),
          })),
        ...compounds.map((compound) => ({
          id: compound.id,
          name: `Racikan ${compound.form}`,
          amount: `${items.filter((item) => item.compound_id === compound.id).length} bahan`,
          short: items.some((item) => item.compound_id === compound.id && short.has(item.id)),
        })),
      ],
      shortCount: short.size,
    };
  });
}

/** Medicines at or under their minimum, emptiest first. */
export async function listLowStock(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('medicine_stock')
    .select('medicine_id, name, unit, min_stock, qty_on_hand')
    .eq('is_active', true)
    .eq('is_low', true)
    .order('qty_on_hand')
    .limit(6);

  if (error) throw new Error(`listLowStock failed: ${error.code}`);

  return data;
}

/** Which of today's visits already have vitals, and when the latest was taken. */
export async function listTodayVitals(supabase: SupabaseClient, visitIds: string[]) {
  if (visitIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from('vitals')
    .select('visit_id, created_at')
    .in('visit_id', visitIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`listTodayVitals failed: ${error.code}`);

  const latest = new Map<string, string>();

  for (const row of data) if (!latest.has(row.visit_id)) latest.set(row.visit_id, row.created_at);

  return latest;
}

/** Revenue and patient visits per day for the trend (owner only: report functions check the role). */
export async function getOwnerTrend(supabase: SupabaseClient, today: string, days: string[]) {
  const [revenue, visits] = await Promise.all([
    supabase.rpc('report_revenue_daily', { p_from: days[0], p_to: today }),
    fetchAll('getOwnerTrend visits', (from, to) =>
      supabase
        .from('visits')
        .select('visit_date')
        .gte('visit_date', days[0])
        .lte('visit_date', today)
        .neq('status', 'cancelled')
        .order('id')
        .range(from, to),
    ),
  ]);

  if (revenue.error) throw new Error(`getOwnerTrend revenue failed: ${revenue.error.code}`);

  return { revenue: revenue.data, visits };
}
