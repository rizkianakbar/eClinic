import type { Metadata } from "next";
import { PATIENT_EDITOR_ROLES } from "@/features/patients/patients.constants";
import { PatientForm } from "@/features/patients/patients-form";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Pasien baru" };

export default async function NewPatientPage() {
  await requireRole(...PATIENT_EDITOR_ROLES);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Pasien baru</h1>
        <p className="text-sm text-muted-foreground">Nomor rekam medis dibuat otomatis saat disimpan.</p>
      </div>
      <PatientForm mode="create" />
    </div>
  );
}
