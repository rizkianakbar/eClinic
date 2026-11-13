"use client";

import { CalendarRangeIcon, LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { segmentedGroup, segmentedItem } from "@/components/ui/segmented";
import { rangePresets, type DateRange } from "./reports.lib";

type ReportsRangeFilterProps = {
  range: DateRange;
  today: string;
  /** Extra params to keep, e.g. the active tab. */
  keep?: Record<string, string>;
};

/**
 * The period in the URL (reports stay linkable), changed by client-side navigation: presets are
 * links, the custom range is applied with router.push. Only the data below re-renders; the page,
 * header and tabs stay in place.
 */
export function ReportsRangeFilter(props: ReportsRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const href = (range: DateRange) => `${pathname}?${new URLSearchParams({ ...props.keep, ...range })}`;

  function apply(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get("from") ?? "");
    const to = String(data.get("to") ?? "");
    if (!from || !to) return setError("Isi kedua tanggal.");
    if (from > to) return setError("Tanggal awal harus sebelum tanggal akhir.");
    setError(null);
    startTransition(() => router.push(href({ from, to }), { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRangeIcon className="ml-1.5 size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Periode</span>
        <div className={segmentedGroup}>
          {rangePresets(props.today).map((preset) => {
            const active = preset.from === props.range.from && preset.to === props.range.to;
            return (
              <Link
                key={preset.label}
                href={href(preset)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={segmentedItem(active)}
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
      </div>
      {/* Keyed by the range so a preset click resets the date fields to the period now shown. */}
      <form key={`${props.range.from}:${props.range.to}`} noValidate className="flex flex-wrap items-center gap-2" onSubmit={apply}>
        <Input
          type="date"
          name="from"
          aria-label="Dari tanggal"
          aria-invalid={Boolean(error)}
          defaultValue={props.range.from}
          max={props.today}
          className="h-8 w-38"
          onChange={() => setError(null)}
        />
        <span className="text-sm text-muted-foreground">s/d</span>
        <Input
          type="date"
          name="to"
          aria-label="Sampai tanggal"
          aria-invalid={Boolean(error)}
          defaultValue={props.range.to}
          max={props.today}
          className="h-8 w-38"
          onChange={() => setError(null)}
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Tampilkan
        </Button>
        {error && <p className="w-full text-right text-[0.8125rem] text-destructive">{error}</p>}
      </form>
    </div>
  );
}
