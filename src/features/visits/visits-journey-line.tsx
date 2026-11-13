import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOURNEY, type JourneyStatus } from "./visits.lib";

/** Each station's colour on the line, the same colours as the status badges. */
export const STATION_COLORS: Record<JourneyStatus, { line: string; text: string; soft: string; ring: string }> = {
  waiting: { line: "bg-line-waiting", text: "text-status-waiting", soft: "bg-status-waiting-soft", ring: "border-line-waiting" },
  in_exam: { line: "bg-line-exam", text: "text-status-exam", soft: "bg-status-exam-soft", ring: "border-line-exam" },
  to_pharmacy: { line: "bg-line-pharmacy", text: "text-status-pharmacy", soft: "bg-status-pharmacy-soft", ring: "border-line-pharmacy" },
  to_cashier: { line: "bg-line-cashier", text: "text-status-cashier", soft: "bg-status-cashier-soft", ring: "border-line-cashier" },
  done: { line: "bg-line-done", text: "text-status-done", soft: "bg-status-done-soft", ring: "border-line-done" },
};

type VisitsJourneyCountsProps = {
  counts: Record<JourneyStatus, number>;
};

/**
 * The clinic as a route map: one line, five stations, how many patients are
 * at each right now. Reads left to right like the walk through the building.
 */
export function VisitsJourneyCounts(props: VisitsJourneyCountsProps) {
  return (
    <ol className="grid grid-cols-5">
      {JOURNEY.map((station, index) => {
        const color = STATION_COLORS[station.status];
        const count = props.counts[station.status];
        const busy = count > 0 && station.status !== "done";
        return (
          <li key={station.status} className="relative flex flex-col items-center gap-3 px-1 text-center">
            {/* The track: a segment to the next station, in this station's colour. */}
            {index < JOURNEY.length - 1 && (
              <span
                aria-hidden
                className={cn("absolute top-[1.375rem] left-1/2 h-1.5 w-full -translate-y-1/2 rounded-full", color.line)}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-11 items-center justify-center rounded-full border-[5px] bg-card",
                color.ring,
                busy && cn(color.line, "text-white"),
              )}
            >
              <span className="numeral text-[1.12rem]">{count}</span>
            </span>
            <span className="flex flex-col">
              <span className={cn("text-[0.94rem] leading-tight font-bold sm:text-[1.02rem]", busy ? color.text : "text-foreground")}>
                {station.label}
              </span>
              <span className="hidden text-[0.88rem] text-muted-foreground sm:block">{station.hint}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type VisitsJourneyPositionProps = {
  status: JourneyStatus | "registered" | "cancelled";
  className?: string;
};

/** Where this one patient is now: passed stations ticked, the current one marked "di sini". */
export function VisitsJourneyPosition(props: VisitsJourneyPositionProps) {
  if (props.status === "cancelled") {
    return (
      <p className={cn("rounded-lg bg-status-cancelled-soft px-3 py-2 font-semibold text-status-cancelled", props.className)}>
        Kunjungan dibatalkan
      </p>
    );
  }
  const current = JOURNEY.findIndex((station) => station.status === (props.status === "registered" ? "waiting" : props.status));

  return (
    <ol aria-label="Posisi pasien" className={cn("grid grid-cols-5", props.className)}>
      {JOURNEY.map((station, index) => {
        const color = STATION_COLORS[station.status];
        const passed = index < current;
        const here = index === current;
        return (
          <li
            key={station.status}
            aria-current={here ? "step" : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            {index < JOURNEY.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3 left-1/2 h-1 w-full -translate-y-1/2 rounded-full",
                  index < current ? STATION_COLORS[station.status].line : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-6 items-center justify-center rounded-full border-[3px] bg-card",
                passed && cn(color.ring, color.line, "text-white"),
                here && cn(color.ring, color.text, "signal-pulse"),
                !passed && !here && "border-border",
              )}
            >
              {passed && <CheckIcon className="size-3.5" strokeWidth={3.5} aria-hidden />}
              {here && <span className={cn("size-2 rounded-full", color.line)} />}
            </span>
            <span
              className={cn(
                "text-[0.82rem] leading-tight",
                here ? cn("font-bold", color.text) : passed ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              <span aria-hidden>{station.short}</span>
              <span className="sr-only">
                {station.label}
                {here && " (posisi sekarang)"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
