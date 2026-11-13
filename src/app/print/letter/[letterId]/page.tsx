import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PrintButton } from "@/components/ui/print-button";
import { EXAM_VIEWER_ROLES } from "@/features/exam/exam.constants";
import { restUntil } from "@/features/exam/exam.lib";
import { getLetter } from "@/features/exam/exam.service";
import { SEX_LABELS } from "@/features/patients/patients.constants";
import { ageInYears } from "@/features/patients/patients.lib";
import { getClinicProfile } from "@/features/settings/settings.service";
import { SettingsLetterhead } from "@/features/settings/settings-letterhead";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Surat" };

/** A5 letter on the clinic letterhead. */
export default async function LetterPage(props: PageProps<"/print/letter/[letterId]">) {
  await requireRole(...EXAM_VIEWER_ROLES);
  const { letterId } = await props.params;
  if (!z.uuid().safeParse(letterId).success) notFound();

  const supabase = await createClient();
  const [letter, clinic] = await Promise.all([getLetter(supabase, letterId), getClinicProfile(supabase)]);
  if (!letter?.visit?.patient || !clinic) notFound();

  const { patient } = letter.visit;
  const primary = letter.visit.diagnoses.find((diagnosis) => diagnosis.is_primary);
  const diagnosis = primary ? `${primary.icd10?.name_id ?? primary.icd10?.name} (${primary.icd10_code})` : "-";
  const issuedOn = formatDate(letter.created_at);
  const city = clinic.address?.split(",").at(-1)?.trim();

  return (
    <main className="mx-auto flex max-w-[148mm] flex-col gap-4 bg-white p-6 text-[13px] leading-relaxed text-black print:p-0">
      <style>{"@page { size: A5; margin: 12mm; } @media print { body { background: white; } }"}</style>
      <div className="print:hidden">
        <PrintButton />
      </div>
      <SettingsLetterhead clinic={clinic} />

      <div className="text-center">
        <p className="font-bold underline">
          {letter.type === "sick" ? "SURAT KETERANGAN SAKIT" : "SURAT RUJUKAN"}
        </p>
        <p>No. {letter.letter_no}</p>
      </div>

      {letter.type === "referral" && (
        <p>
          Kepada Yth. {letter.specialty ? `Dokter Spesialis ${letter.specialty}` : "Dokter"}
          <br />
          di {letter.destination}
        </p>
      )}

      <p>{letter.type === "sick" ? "Yang bertanda tangan di bawah ini menerangkan bahwa:" : "Mohon pemeriksaan dan penanganan lebih lanjut terhadap pasien:"}</p>
      <table className="w-full">
        <tbody>
          {[
            ["Nama", patient.full_name],
            ["Umur / Jenis kelamin", `${ageInYears(patient.birth_date)} tahun / ${SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]}`],
            ["No. rekam medis", patient.mrn],
            ["Alamat", patient.address ?? "-"],
          ].map(([label, value]) => (
            <tr key={label}>
              <td className="w-40 align-top">{label}</td>
              <td className="align-top">: {value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {letter.type === "sick" && letter.rest_from && letter.rest_days ? (
        <p>
          Berdasarkan hasil pemeriksaan, pasien tersebut dalam keadaan sakit
          {letter.show_diagnosis && <> dengan diagnosis {diagnosis}</>} dan perlu beristirahat selama{" "}
          <strong>{letter.rest_days} hari</strong>, terhitung tanggal {formatDate(letter.rest_from)} sampai dengan{" "}
          {formatDate(restUntil(letter.rest_from, letter.rest_days))}.
        </p>
      ) : (
        <table className="w-full">
          <tbody>
            {[
              ["Diagnosis", diagnosis],
              ["Alasan rujukan", letter.reason],
              ["Anamnesis & pemeriksaan", letter.clinical_summary],
              ["Terapi yang diberikan", letter.therapy],
            ].map(([label, value]) => (
              <tr key={label}>
                <td className="w-40 align-top">{label}</td>
                <td className="align-top whitespace-pre-wrap">: {value || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p>{letter.type === "sick" ? "Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya." : "Atas perhatian dan kerja samanya kami ucapkan terima kasih."}</p>

      <div className="ml-auto mt-4 w-56 text-center">
        <p>
          {city ? `${city}, ` : ""}
          {issuedOn}
        </p>
        <p>Dokter pemeriksa,</p>
        <div className="h-16" />
        <p className="font-semibold underline">{letter.doctor?.full_name}</p>
        {letter.doctor?.sip_number && <p className="text-xs">SIP. {letter.doctor.sip_number}</p>}
      </div>
    </main>
  );
}
