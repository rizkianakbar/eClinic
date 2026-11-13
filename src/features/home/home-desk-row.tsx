import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HomeDeskRowProps = {
  href: string;
  number: number;
  /** Station tone for the number tile, e.g. "bg-status-cashier-soft text-status-cashier". */
  tone: string;
  name: string;
  bpjs?: boolean;
  meta: ReactNode;
  /** Right side: amount, timer, call to action. */
  aside?: ReactNode;
  /** The first row is the one to serve now. */
  first?: boolean;
};

/** One patient waiting for this person: number, who, context, and the way in. */
export function HomeDeskRow(props: HomeDeskRowProps) {
  return (
    <li className="border-b last:border-0">
      <Link
        href={props.href}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
          props.first && "bg-secondary/40 hover:bg-secondary/60",
        )}
      >
        <span className={cn("numeral flex size-10 shrink-0 items-center justify-center rounded-lg text-lg", props.tone)}>
          {props.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{props.name}</span>
            {props.bpjs && (
              <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">BPJS</span>
            )}
          </span>
          <span className="block truncate text-[0.8125rem] text-muted-foreground">{props.meta}</span>
        </span>
        {props.aside}
      </Link>
    </li>
  );
}
