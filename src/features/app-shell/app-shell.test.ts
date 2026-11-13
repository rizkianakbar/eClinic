import { describe, expect, it } from "vitest";
import { isActivePath, myStationVisits, navItemsFor, newArrivals, parseTextSize, type NavItem } from "./app-shell.lib";

const items: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: "home", group: "service", roles: "all" },
  { href: "/exam", label: "Pemeriksaan", icon: "queue", group: "service", roles: ["doctor", "nurse"] },
  { href: "/cashier", label: "Kasir", icon: "cashier", group: "service", roles: ["cashier", "owner"] },
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

describe("parseTextSize", () => {
  it("falls back to normal for unknown values", () => {
    expect(parseTextSize("xlarge")).toBe("xlarge");
    expect(parseTextSize("huge")).toBe("normal");
    expect(parseTextSize(null)).toBe("normal");
  });
});

describe("myStationVisits", () => {
  const visits = [
    { id: "1", status: "to_cashier", doctor_id: "d1" },
    { id: "2", status: "waiting", doctor_id: "d1" },
    { id: "3", status: "waiting", doctor_id: "d2" },
    { id: "4", status: "waiting", doctor_id: "d1", skipped_at: "2026-11-12T02:00:00Z" },
  ];

  it("gives each role its own queue", () => {
    expect(myStationVisits(visits, "cashier", "x").map((v) => v.id)).toEqual(["1"]);
    expect(myStationVisits(visits, "doctor", "d1").map((v) => v.id)).toEqual(["2"]);
    expect(myStationVisits(visits, "nurse", "x").map((v) => v.id)).toEqual(["2", "3"]);
    expect(myStationVisits(visits, "front_desk", "x")).toEqual([]);
  });
});

describe("newArrivals", () => {
  it("is silent on first load, then reports only new ids", () => {
    expect(newArrivals(null, [{ id: "1" }])).toEqual([]);
    expect(newArrivals(new Set(["1"]), [{ id: "1" }, { id: "2" }]).map((v) => v.id)).toEqual(["2"]);
  });
});
