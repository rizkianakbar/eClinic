import Link from "next/link";
import { cn } from "@/lib/utils";

type NavTabsProps = {
  label: string;
  tabs: readonly { href: string; label: string; active: boolean }[];
  className?: string;
};

/** Sub-pages of one section, as links (each tab has its own URL). */
export function NavTabs(props: NavTabsProps) {
  return (
    <nav aria-label={props.label} className={cn("flex gap-1 overflow-x-auto border-b [scrollbar-width:none]", props.className)}>
      {props.tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={cn(
            "group relative -mb-px flex h-10 items-center px-1 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
            tab.active && "font-medium text-foreground",
          )}
        >
          <span className="rounded-md px-2 py-1 transition-colors group-hover:bg-black/5">{tab.label}</span>
          {tab.active && <span aria-hidden className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-foreground" />}
        </Link>
      ))}
    </nav>
  );
}
