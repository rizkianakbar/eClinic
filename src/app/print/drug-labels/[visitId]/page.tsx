import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PrintButton } from '@/components/ui/print-button';
import { buildDrugLabels } from '@/features/pharmacy/pharmacy.lib';
import { getClinicName, getDispensation, getPharmacyVisit } from '@/features/pharmacy/pharmacy.service';
import { getPrescription } from '@/features/prescriptions/prescriptions.service';
import { requireRole } from '@/lib/auth';
import { formatDate } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Etiket obat' };

/** 58 mm thermal labels, one per given item or racikan. */
export default async function DrugLabelsPage(props: PageProps<'/print/drug-labels/[visitId]'>) {
  await requireRole('pharmacist');

  const { visitId } = await props.params;

  if (!z.uuid().safeParse(visitId).success) notFound();

  const supabase = await createClient();

  const [visit, prescription, dispensation, clinic] = await Promise.all([
    getPharmacyVisit(supabase, visitId),
    getPrescription(supabase, visitId),
    getDispensation(supabase, visitId),
    getClinicName(supabase),
  ]);

  if (!visit?.patient || !dispensation) notFound();

  const given = new Set(
    dispensation.items.filter((item) => item.status === 'given').map((item) => item.prescription_item_id),
  );

  const labels = buildDrugLabels(prescription, given);
  const date = formatDate(dispensation.dispensed_at);

  return (
    <main className="mx-auto flex w-[58mm] flex-col gap-2 p-2 text-[11px] leading-tight text-black print:p-0">
      <style>{'@page { size: 58mm auto; margin: 2mm; } @media print { body { background: white; } }'}</style>
      <div className="mb-2 print:hidden">
        <PrintButton />
      </div>
      {labels.length === 0 && <p className="print:hidden">Tidak ada obat yang diberikan.</p>}
      {labels.map((label) => (
        <section key={label.id} className="break-after-page border border-black p-2 last:break-after-auto">
          <p className="text-center font-bold">{clinic?.name}</p>
          {clinic?.address && <p className="text-center">{clinic.address}</p>}
          <hr className="my-1 border-black" />
          <p>
            {visit.patient?.full_name} · {visit.patient?.mrn}
          </p>
          <p>{date}</p>
          <p className="mt-1 font-bold">{label.title}</p>
          <p>{label.amount}</p>
          <p className="mt-1 text-center text-[13px] font-bold">{label.signa}</p>
        </section>
      ))}
    </main>
  );
}
