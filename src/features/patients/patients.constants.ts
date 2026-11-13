import type { Role } from "@/lib/auth";

export const SEX_LABELS = {
  male: "Laki-laki",
  female: "Perempuan",
} as const;

/** Roles that register and edit patients. Mirrors the RLS policies on `patients`. */
export const PATIENT_EDITOR_ROLES = ["front_desk", "admin", "owner"] as const satisfies readonly Role[];

/** Roles that open patient records (list, history). Clinical details still follow RLS. */
export const PATIENT_VIEWER_ROLES = ["front_desk", "admin", "owner", "doctor", "nurse"] as const satisfies readonly Role[];
