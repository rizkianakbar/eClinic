"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { SEX_LABELS } from "./patients.constants";
import { usePatientSearch } from "./patients.hooks";
import { ageInYears, parsePatientSearch } from "./patients.lib";

/** Keyboard-first: type or scan (MRN), arrows to move, Enter to open. */
export function PatientSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const search = usePatientSearch(query);
  const results = parsePatientSearch(query) ? (search.data ?? []) : [];
  const active = Math.min(highlighted, Math.max(results.length - 1, 0));

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted(Math.min(active + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted(Math.max(active - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      router.push(`/patients/${results[active].id}`);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        autoFocus
        type="search"
        aria-label="Cari pasien"
        placeholder="Cari nama, NIK, nomor BPJS, nomor HP, atau no. RM (scan kartu)"
        className="h-10 text-base"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(0);
        }}
        onKeyDown={onKeyDown}
      />

      {parsePatientSearch(query) && !search.isPending && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Pasien tidak ditemukan. Periksa ejaan, atau daftarkan sebagai pasien baru.
        </p>
      )}

      {results.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {results.map((patient, index) => (
            <li key={patient.id}>
              <Link
                href={`/patients/${patient.id}`}
                className={cn(
                  "flex flex-wrap items-baseline gap-x-4 gap-y-1 px-3 py-2 hover:bg-muted",
                  index === active && "bg-muted",
                )}
                onMouseEnter={() => setHighlighted(index)}
              >
                <span className="font-mono text-sm text-muted-foreground">{patient.mrn}</span>
                <span className="font-medium">{patient.full_name}</span>
                <span className="text-sm text-muted-foreground">
                  {SEX_LABELS[patient.sex as keyof typeof SEX_LABELS]} · {formatDate(patient.birth_date)} (
                  {ageInYears(patient.birth_date)} th)
                </span>
                {patient.nik && <span className="text-sm text-muted-foreground">NIK {patient.nik}</span>}
                {patient.phone && <span className="text-sm text-muted-foreground">{patient.phone}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
