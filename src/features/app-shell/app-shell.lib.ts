import { PATIENT_EDITOR_ROLES } from "@/features/patients/patients.constants";
import type { Role } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  roles: readonly Role[] | "all";
};

/** Sidebar entries. Each module adds its entry here when its route is built. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Beranda", roles: "all" },
  { href: "/registration", label: "Pendaftaran", roles: PATIENT_EDITOR_ROLES },
];

export function navItemsFor(role: Role, items: readonly NavItem[] = NAV_ITEMS) {
  return items.filter((item) => item.roles === "all" || item.roles.includes(role));
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
