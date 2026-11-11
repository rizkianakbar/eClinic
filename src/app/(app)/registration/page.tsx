import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PATIENT_EDITOR_ROLES } from "@/features/patients/patients.constants";
import { PatientSearch } from "@/features/patients/patients-search";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Pendaftaran" };

export default async function RegistrationPage() {
  await requireRole(...PATIENT_EDITOR_ROLES);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Pendaftaran</h1>
        <Link href="/patients/new" className={buttonVariants()}>
          <PlusIcon />
          Pasien baru
        </Link>
      </div>
      <PatientSearch />
    </div>
  );
}
