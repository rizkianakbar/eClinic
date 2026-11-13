"use client";

import { ActivityIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExamVitalsForm } from "./exam-vitals-form";

type ExamVitalsDialogProps = {
  visitId: string;
  patientName: string;
  /** "compact" on queue tickets; "default" on the exam page. */
  size?: "compact" | "default";
  label?: string;
};

/** Nurse triage from the queue board while the patient waits. */
export function ExamVitalsDialog(props: ExamVitalsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size={props.size === "default" ? "sm" : "xs"} variant="outline" onClick={() => setOpen(true)}>
        <ActivityIcon />
        {props.label ?? (props.size === "default" ? "Catat tanda vital" : "Vital")}
      </Button>
      <DialogContent variant="drawer">
        <DialogHeader>
          <DialogTitle>Tanda vital</DialogTitle>
          <DialogDescription>{props.patientName}</DialogDescription>
        </DialogHeader>
        <ExamVitalsForm visitId={props.visitId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
