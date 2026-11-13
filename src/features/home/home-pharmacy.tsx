import { ArrowRightIcon, CheckCheckIcon, FlaskConicalIcon, PackageCheckIcon, PrinterIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Elapsed } from "@/components/ui/elapsed";
import { Panel, PanelEmpty } from "@/components/ui/panel";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { listDispensedToday } from "@/features/pharmacy/pharmacy.service";
import type { listLowStock, listPharmacyDesk } from "./home.service";

type HomePharmacyProps = {
  waiting: Awaited<ReturnType<typeof listPharmacyDesk>>;
  lowStock: Awaited<ReturnType<typeof listLowStock>>;
  dispensed: Awaited<ReturnType<typeof listDispensedToday>>;
  alerts: { low: number; expiring: number };
  now: number;
};

type Waiting = HomePharmacyProps["waiting"][number];

const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
const duration = (minutes: number) => (minutes < 60 ? `${minutes} mnt` : `${Math.floor(minutes / 60)} j ${minutes % 60} m`);

/** The pharmacy station: the next prescription up front, the rest as a worklist, and the stock that needs attention. */
export function HomePharmacy(props: HomePharmacyProps) {
  const [next, ...rest] = props.waiting;
  const longest = props.waiting.reduce((max, visit) => Math.max(max, minutesSince(visit.updated_at, props.now)), 0);
  const shortVisits = props.waiting.filter((visit) => visit.shortCount > 0).length;
  const itemsHanded = props.dispensed.reduce(
    (sum, dispensation) => sum + dispensation.items.filter((item) => item.status === "given").length,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] lg:grid-cols-4 lg:divide-y-0">
        <Figure label="Resep menunggu" value={props.waiting.length} hint={props.waiting.length ? `terlama ${duration(longest)}` : "Antrean kosong"} />
        <Figure
          label="Diserahkan hari ini"
          value={props.dispensed.length}
          hint={`${itemsHanded} obat keluar`}
        />
        <Figure
          label="Stok menipis"
          value={props.alerts.low}
          hint={shortVisits ? `${shortVisits} resep terkena kekurangan` : "Tidak ada resep terdampak"}
          tone={props.alerts.low > 0 ? "warn" : undefined}
          href="/inventory?filter=low"
        />
        <Figure
          label="Kedaluwarsa ≤ 3 bulan"
          value={props.alerts.expiring}
          hint="Keluarkan lebih dulu"
          tone={props.alerts.expiring > 0 ? "warn" : undefined}
          href="/inventory?filter=expiring"
        />
      </dl>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {next ? (
            <NextPrescription visit={next} now={props.now} />
          ) : (
            <div className="rounded-2xl border bg-card">
              <PanelEmpty
                icon={<CheckCheckIcon />}
                title="Tidak ada resep menunggu"
                description="Resep muncul di sini begitu dokter menandatangani rekam medis. Halaman ini diperbarui sendiri."
              />
            </div>
          )}

          {rest.length > 0 && (
            <Panel title="Antre berikutnya" count={rest.length} dot="bg-line-pharmacy">
              <ol className="divide-y">
                {rest.map((visit) => (
                  <li key={visit.id}>
                    <Link href={`/pharmacy/${visit.id}`} className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                      <span className="numeral flex size-10 shrink-0 items-center justify-center rounded-lg bg-status-pharmacy-soft text-lg text-status-pharmacy">
                        {visit.queue_no}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{visit.patient?.full_name}</span>
                          {visit.payer_type === "bpjs" && <BpjsChip />}
                        </p>
                        <MedicineChips medicines={visit.medicines} limit={4} />
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Elapsed since={visit.updated_at} now={props.now} />
                        <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Stok perlu dipesan" count={props.lowStock.length} link={{ href: "/inventory?filter=low", label: "Stok" }}>
            {props.lowStock.length === 0 ? (
              <PanelEmpty icon={<PackageCheckIcon />} title="Semua stok di atas minimum" />
            ) : (
              <ul className="divide-y">
                {props.lowStock.map((medicine) => {
                  const ratio = Math.min(1, (medicine.qty_on_hand ?? 0) / Math.max(1, medicine.min_stock ?? 1));
                  return (
                    <li key={medicine.medicine_id}>
                      <Link href={`/inventory/medicines/${medicine.medicine_id}`} className="flex flex-col gap-1.5 px-4 py-2.5 hover:bg-muted/50">
                        <span className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{medicine.name}</span>
                          <span className="tabular shrink-0 text-[0.8125rem] text-muted-foreground">
                            <span className="font-semibold text-status-cancelled">{medicine.qty_on_hand}</span> / min {medicine.min_stock} {medicine.unit}
                          </span>
                        </span>
                        <span className="h-1 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-status-cancelled" style={{ width: `${Math.max(4, ratio * 100)}%` }} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel title="Diserahkan hari ini" count={props.dispensed.length}>
            {props.dispensed.length === 0 ? (
              <PanelEmpty title="Belum ada obat diserahkan" />
            ) : (
              <ul className="divide-y">
                {props.dispensed.slice(0, 5).map((dispensation) => {
                  const given = dispensation.items.filter((item) => item.status === "given").length;
                  return (
                    <li key={dispensation.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="tabular w-10 shrink-0 text-[0.8125rem] text-muted-foreground">{formatTime(dispensation.dispensed_at)}</span>
                      <Link href={`/pharmacy/${dispensation.visit?.id}`} className="min-w-0 flex-1 hover:underline">
                        <span className="block truncate text-sm">{dispensation.visit?.patient?.full_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {given} obat{given < dispensation.items.length && `, ${dispensation.items.length - given} tidak diberikan`}
                        </span>
                      </Link>
                      <Link
                        href={`/print/drug-labels/${dispensation.visit?.id}`}
                        target="_blank"
                        title="Cetak ulang etiket"
                        aria-label={`Cetak ulang etiket ${dispensation.visit?.patient?.full_name}`}
                        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <PrinterIcon className="size-4" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

        </div>
      </div>
    </div>
  );
}

/** The prescription to prepare now, with everything on it, so the pharmacist can start picking before opening it. */
function NextPrescription(props: { visit: Waiting; now: number }) {
  const { visit } = props;
  return (
    <section className="overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,color-mix(in_srgb,var(--status-pharmacy-soft)_70%,white),white_60%)] shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
        <span className="numeral flex size-16 shrink-0 items-center justify-center rounded-2xl bg-line-pharmacy text-[2rem] text-white">
          {visit.queue_no}
        </span>
        <div className="min-w-0 flex-[1_1_16rem]">
          <p className="text-sm font-medium text-muted-foreground">Siapkan sekarang</p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[1.375rem] leading-tight font-semibold tracking-tight">{visit.patient?.full_name}</span>
            {visit.payer_type === "bpjs" && <BpjsChip />}
          </p>
          <p className="text-sm text-muted-foreground">
            {visit.doctor?.full_name} · {visit.poli?.name} · RM <span className="tabular">{visit.patient?.mrn}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Elapsed since={visit.updated_at} now={props.now} />
          <Link href={`/pharmacy/${visit.id}`} className={buttonVariants({ size: "lg" })}>
            Siapkan resep
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
      <ol className="grid gap-px border-t bg-border sm:grid-cols-2">
        {visit.medicines.map((medicine, index) => (
          <li key={index} className="flex items-center gap-3 bg-card px-5 py-2.5">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md",
                medicine.short ? "bg-status-cancelled-soft text-status-cancelled" : "bg-status-pharmacy-soft text-status-pharmacy",
              )}
            >
              {medicine.short ? (
                <TriangleAlertIcon className="size-3.5" aria-hidden />
              ) : medicine.name.startsWith("Racikan") ? (
                <FlaskConicalIcon className="size-3.5" aria-hidden />
              ) : (
                <span className="tabular text-xs font-semibold">{index + 1}</span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{medicine.name}</span>
            <span className={cn("tabular shrink-0 text-[0.8125rem]", medicine.short ? "font-medium text-status-cancelled" : "text-muted-foreground")}>
              {medicine.short ? "stok kurang" : medicine.amount}
            </span>
          </li>
        ))}
        {visit.medicines.length % 2 === 1 && <li className="hidden bg-card sm:block" aria-hidden />}
      </ol>
    </section>
  );
}

function MedicineChips(props: { medicines: Waiting["medicines"]; limit: number }) {
  const shown = props.medicines.slice(0, props.limit);
  const more = props.medicines.length - shown.length;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1">
      {shown.map((medicine, index) => (
        <li
          key={index}
          className={cn(
            "inline-flex h-6 max-w-48 items-center gap-1 rounded-md px-1.5 text-xs",
            medicine.short ? "bg-status-cancelled-soft font-medium text-status-cancelled" : "bg-muted text-foreground/80",
          )}
        >
          {medicine.short && <TriangleAlertIcon className="size-3 shrink-0" aria-hidden />}
          <span className="truncate">{medicine.name}</span>
        </li>
      ))}
      {more > 0 && <li className="inline-flex h-6 items-center px-1 text-xs text-muted-foreground">+{more} lagi</li>}
    </ul>
  );
}

function BpjsChip() {
  return <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">BPJS</span>;
}

type FigureProps = {
  label: string;
  value: number;
  hint: string;
  tone?: "warn";
  href?: string;
};

function Figure(props: FigureProps) {
  const body = (
    <>
      <dt className="text-xs font-medium text-muted-foreground">{props.label}</dt>
      <dd className={cn("numeral text-[1.5rem]", props.tone === "warn" && "text-status-cancelled")}>{props.value}</dd>
      <dd className="text-xs text-muted-foreground">{props.hint}</dd>
    </>
  );
  return props.href ? (
    <Link href={props.href} className="flex min-w-0 flex-col gap-0.5 px-5 py-4 transition-colors hover:bg-muted/40">
      {body}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-col gap-0.5 px-5 py-4">{body}</div>
  );
}
