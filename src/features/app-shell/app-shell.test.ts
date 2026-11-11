import { describe, expect, it } from "vitest";
import { isActivePath, navItemsFor, type NavItem } from "./app-shell.lib";

const items: NavItem[] = [
  { href: "/dashboard", label: "Beranda", roles: "all" },
  { href: "/exam", label: "Pemeriksaan", roles: ["doctor", "nurse"] },
  { href: "/cashier", label: "Kasir", roles: ["cashier", "owner"] },
];

describe("navItemsFor", () => {
  it("shows shared items plus the role's own items", () => {
    expect(navItemsFor("doctor", items).map((item) => item.href)).toEqual(["/dashboard", "/exam"]);
    expect(navItemsFor("cashier", items).map((item) => item.href)).toEqual(["/dashboard", "/cashier"]);
  });

  it("hides clinical items from the cashier", () => {
    expect(navItemsFor("cashier", items).some((item) => item.href === "/exam")).toBe(false);
  });
});

describe("isActivePath", () => {
  it("matches the route and its children only", () => {
    expect(isActivePath("/exam/123", "/exam")).toBe(true);
    expect(isActivePath("/exam", "/exam")).toBe(true);
    expect(isActivePath("/examples", "/exam")).toBe(false);
  });
});
