import type { Role } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  roles: readonly Role[] | "all";
};

/** Sidebar entries. Each module adds its entry here when its route is built. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Beranda", roles: "all" },
];

export function navItemsFor(role: Role, items: readonly NavItem[] = NAV_ITEMS) {
  return items.filter((item) => item.roles === "all" || item.roles.includes(role));
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
