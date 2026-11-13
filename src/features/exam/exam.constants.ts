export const SOAP_FIELDS = [
  { name: "subjective", letter: "S", label: "Subjektif", hint: "Keluhan utama, riwayat penyakit" },
  { name: "objective", letter: "O", label: "Objektif", hint: "Hasil pemeriksaan fisik" },
  { name: "assessment", letter: "A", label: "Asesmen", hint: "Penilaian klinis" },
  { name: "plan", letter: "P", label: "Rencana", hint: "Terapi, edukasi, kontrol" },
] as const;

/** Roles that open the exam page (RLS limits clinical reads to the same roles). */
export const EXAM_VIEWER_ROLES = ["doctor", "nurse", "owner"] as const;
