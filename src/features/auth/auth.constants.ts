import type { Role } from "@/lib/auth";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Pemilik",
  admin: "Admin",
  front_desk: "Resepsionis",
  nurse: "Perawat",
  doctor: "Dokter",
  pharmacist: "Farmasi",
  cashier: "Kasir",
};
