import { CASHIER_ROLES } from "@/features/billing/billing.constants";
import { PHARMACY_ROLES } from "@/features/inventory/inventory.constants";
import { PATIENT_EDITOR_ROLES, PATIENT_VIEWER_ROLES } from "@/features/patients/patients.constants";
import { QUEUE_VIEWER_ROLES } from "@/features/queue/queue.lib";
import type { Role } from "@/lib/auth";

export type NavIcon =
  | "home"
  | "register"
  | "patients"
  | "queue"
  | "prescriptions"
  | "stock"
  | "cashier"
  | "reports"
  | "expenses"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  group: "service" | "management";
  roles: readonly Role[] | "all";
};

/** Sidebar entries, in the order of a patient's visit, then management. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: "home", group: "service", roles: ["owner", "admin", "doctor", "nurse"] },
  { href: "/registration", label: "Pendaftaran", icon: "register", group: "service", roles: PATIENT_EDITOR_ROLES },
  { href: "/patients", label: "Pasien", icon: "patients", group: "service", roles: PATIENT_VIEWER_ROLES },
  { href: "/queue", label: "Antrean", icon: "queue", group: "service", roles: QUEUE_VIEWER_ROLES },
  { href: "/pharmacy", label: "Resep masuk", icon: "prescriptions", group: "service", roles: ["pharmacist"] },
  { href: "/cashier", label: "Kasir", icon: "cashier", group: "service", roles: CASHIER_ROLES },
  { href: "/inventory", label: "Stok obat", icon: "stock", group: "management", roles: PHARMACY_ROLES },
  { href: "/reports", label: "Laporan", icon: "reports", group: "management", roles: ["owner"] },
  { href: "/expenses", label: "Pengeluaran", icon: "expenses", group: "management", roles: ["owner"] },
  { href: "/settings", label: "Pengaturan", icon: "settings", group: "management", roles: ["owner", "admin"] },
];

/** Roles whose home is their station page; /dashboard sends them there. */
export const STATION_HOME: Partial<Record<Role, string>> = {
  front_desk: "/registration",
  pharmacist: "/pharmacy",
  cashier: "/cashier",
};

export function navItemsFor(role: Role, items: readonly NavItem[] = NAV_ITEMS) {
  return items.filter((item) => item.roles === "all" || item.roles.includes(role));
}

type StationStatus = "waiting" | "to_pharmacy" | "to_cashier";

/** The station each role works, and whose arrivals it should be told about. */
export const ROLE_STATION: Partial<Record<Role, { status: StationStatus; label: string; href: string; ownPatientsOnly?: boolean }>> = {
  doctor: { status: "waiting", label: "Pasien Anda menunggu", href: "/queue", ownPatientsOnly: true },
  nurse: { status: "waiting", label: "Pasien menunggu", href: "/queue" },
  pharmacist: { status: "to_pharmacy", label: "Resep menunggu", href: "/pharmacy" },
  cashier: { status: "to_cashier", label: "Menunggu pembayaran", href: "/cashier" },
};

type StripVisit = { id: string; status: string; doctor_id: string; skipped_at?: string | null };

/** Visits waiting at the user's own station right now (skipped patients excluded). */
export function myStationVisits<T extends StripVisit>(visits: readonly T[], role: Role, userId: string) {
  const station = ROLE_STATION[role];
  if (!station) return [];
  return visits.filter(
    (visit) =>
      (visit.status === station.status || (station.status === "waiting" && visit.status === "registered")) &&
      !visit.skipped_at &&
      (!station.ownPatientsOnly || visit.doctor_id === userId),
  );
}

/** Ids present now that were not before: who just arrived. */
export function newArrivals<T extends { id: string }>(previous: ReadonlySet<string> | null, current: readonly T[]) {
  if (!previous) return [];
  return current.filter((visit) => !previous.has(visit.id));
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const TEXT_SIZES = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Besar" },
  { value: "xlarge", label: "Ekstra" },
] as const;

export type TextSize = (typeof TEXT_SIZES)[number]["value"];

export const TEXT_SIZE_STORAGE_KEY = "e-clinic:text-size";

export function parseTextSize(value: string | null | undefined): TextSize {
  return value === "large" || value === "xlarge" ? value : "normal";
}
