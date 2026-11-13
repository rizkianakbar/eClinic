"use client";

import { usePathname } from "next/navigation";
import { NavTabs } from "@/components/ui/nav-tabs";

const TABS = [
  { href: "/inventory", label: "Stok", match: (path: string) => path === "/inventory" || path.startsWith("/inventory/medicines") },
  { href: "/inventory/purchases", label: "Pembelian", match: (path: string) => path.startsWith("/inventory/purchases") },
  { href: "/inventory/opname", label: "Stok opname", match: (path: string) => path.startsWith("/inventory/opname") },
] as const;

export function InventoryTabs() {
  const pathname = usePathname();
  return <NavTabs label="Bagian stok obat" tabs={TABS.map((tab) => ({ href: tab.href, label: tab.label, active: tab.match(pathname) }))} />;
}
