import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { PAYER_LABELS, VISIT_STATUS_LABELS } from "./visits.constants";
import type { listPatientVisits } from "./visits.service";

type VisitsHistoryProps = {
  visits: Awaited<ReturnType<typeof listPatientVisits>>;
};

export function VisitsHistory(props: VisitsHistoryProps) {
  if (props.visits.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada kunjungan.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal</TableHead>
          <TableHead>Poli</TableHead>
          <TableHead>Dokter</TableHead>
          <TableHead>Bayar</TableHead>
          <TableHead>Antrean</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.visits.map((visit) => (
          <TableRow key={visit.id}>
            <TableCell>{formatDate(visit.visit_date)}</TableCell>
            <TableCell>{visit.poli?.name ?? "-"}</TableCell>
            <TableCell>{visit.doctor?.full_name ?? "-"}</TableCell>
            <TableCell>{PAYER_LABELS[visit.payer_type as keyof typeof PAYER_LABELS]}</TableCell>
            <TableCell className="font-mono">{visit.queue_no}</TableCell>
            <TableCell>
              <Badge variant={visit.status === "cancelled" ? "outline" : "secondary"}>
                {VISIT_STATUS_LABELS[visit.status]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
