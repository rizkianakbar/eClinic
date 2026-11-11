"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActivePath, type NavItem } from "./app-shell.lib";

type AppShellNavProps = {
  items: readonly NavItem[];
};

export function AppShellNav(props: AppShellNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {props.items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-muted",
            isActivePath(pathname, item.href) && "bg-muted font-medium",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
