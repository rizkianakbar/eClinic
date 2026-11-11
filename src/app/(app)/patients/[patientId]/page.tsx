import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PATIENT_EDITOR_ROLES, SEX_LABELS } from "@/features/patients/patients.constants";
import { ageInYears } from "@/features/patients/patients.lib";
import { getPatient } from "@/features/patients/patients.service";
import { PatientForm } from "@/features/patients/patients-form";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Data pasien" };

export default async function PatientPage(props: PageProps<"/patients/[patientId]">) {
  await requireRole(...PATIENT_EDITOR_ROLES);
  const { patientId } = await props.params;
  if (!z.uuid().safeParse(patientId).success) notFound();

  const patient = await getPatient(await createClient(), patientId);
  if (!patient) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-sm text-muted-foreground">No. RM {patient.mrn}</p>
        <h1 className="text-2xl font-semibold">{patient.full_name}</h1>
        <p className="text-sm text-muted-foreground">
          {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]} · {formatDate(patient.birth_date)} (
          {ageInYears(patient.birth_date)} tahun)
          {!patient.is_active && " · Nonaktif"}
        </p>
      </div>
      <PatientForm
        mode="edit"
        patientId={patient.id}
        defaultValues={{
          full_name: patient.full_name,
          nik: patient.nik ?? "",
          bpjs_number: patient.bpjs_number ?? "",
          birth_date: patient.birth_date,
          sex: patient.sex as keyof typeof SEX_LABELS,
          phone: patient.phone ?? "",
          address: patient.address ?? "",
        }}
      />
    </div>
  );
}
