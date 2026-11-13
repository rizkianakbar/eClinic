import type { ReactNode } from "react";

type ReportsSectionProps = {
  title: string;
  /** Short context on the right of the heading. */
  aside?: ReactNode;
  children: ReactNode;
};

/** A titled card inside a report. */
export function ReportsSection(props: ReportsSectionProps) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">{props.title}</h3>
        {props.aside && <span className="text-xs text-muted-foreground">{props.aside}</span>}
      </div>
      <div className="flex-1 overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">{props.children}</div>
    </section>
  );
}
