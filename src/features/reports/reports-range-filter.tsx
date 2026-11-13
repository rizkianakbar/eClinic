import { CalendarRangeIcon } from "lucide-react";
import Link from "next/link";
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

/** Plain GET form: the range lives in the URL, so reports are linkable and work without JS. */
export function ReportsRangeFilter(props: ReportsRangeFilterProps) {
  const href = (range: DateRange) =>
    `?${new URLSearchParams({ ...props.keep, ...range })}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRangeIcon className="ml-1.5 size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium">Periode</span>
        <div className={segmentedGroup}>
          {rangePresets(props.today).map((preset) => {
            const active = preset.from === props.range.from && preset.to === props.range.to;
            return (
              <Link key={preset.label} href={href(preset)} aria-current={active ? "true" : undefined} className={segmentedItem(active)}>
                {preset.label}
              </Link>
            );
          })}
        </div>
      </div>
      <form className="flex flex-wrap items-center gap-2" method="get">
        {Object.entries(props.keep ?? {}).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Input type="date" name="from" aria-label="Dari tanggal" defaultValue={props.range.from} max={props.today} className="h-8 w-38" />
        <span className="text-sm text-muted-foreground">s/d</span>
        <Input type="date" name="to" aria-label="Sampai tanggal" defaultValue={props.range.to} max={props.today} className="h-8 w-38" />
        <Button type="submit" variant="outline" size="sm">
          Tampilkan
        </Button>
      </form>
    </div>
  );
}
