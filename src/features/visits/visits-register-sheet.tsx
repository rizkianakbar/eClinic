"use client";

import { CalendarPlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PracticeSession } from "./visits.lib";
import { VisitsRegisterForm } from "./visits-register-form";

type VisitsRegisterSheetProps = {
  patientId: string;
  patientName: string;
  hasBpjsNumber: boolean;
  sessions: PracticeSession[];
  canManageSchedules: boolean;
  now: string;
};

/** Register today's visit from the patient's page, in a drawer. */
export function VisitsRegisterSheet(props: VisitsRegisterSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <CalendarPlusIcon />
        Daftarkan kunjungan
      </Button>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>Daftarkan kunjungan</DialogTitle>
          <DialogDescription>{props.patientName}, hari ini.</DialogDescription>
        </DialogHeader>
        <VisitsRegisterForm
          patientId={props.patientId}
          hasBpjsNumber={props.hasBpjsNumber}
          sessions={props.sessions}
          canManageSchedules={props.canManageSchedules}
          now={props.now}
          layout="panel"
          onRegistered={(visit) => {
            setOpen(false);
            toast.success(`Nomor antrean ${visit.queueNo}`, {
              description: `${visit.session.poliName} · ${visit.session.doctorName}`,
              duration: 10_000,
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
