import { DownloadIcon, PrinterIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { DateRange, ExportReport } from "./reports.lib";

type ReportsExportLinksProps = {
  report: ExportReport;
  range: DateRange;
};

/** Excel download, and a print-friendly page for "Save as PDF". */
export function ReportsExportLinks(props: ReportsExportLinksProps) {
  const query = new URLSearchParams(props.range).toString();
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/api/export/${props.report}?${query}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <DownloadIcon />
        Excel
      </a>
      <a
        href={`/print/report/${props.report}?${query}`}
        target="_blank"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <PrinterIcon />
        PDF
      </a>
    </div>
  );
}
