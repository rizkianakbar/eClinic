"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toHourMinute } from "@/features/schedules/schedules.lib";
import { useActionMutation } from "@/lib/query";
import { cn } from "@/lib/utils";
import { createVisitAction } from "./visits.actions";
import { PAYER_LABELS } from "./visits.constants";
import {
  createVisitSchema,
  firstOpenSession,
  type CreateVisitInput,
  type CreateVisitValues,
  type PracticeSession,
} from "./visits.lib";

type VisitsRegisterFormProps = {
  patientId: string;
  hasBpjsNumber: boolean;
  sessions: PracticeSession[];
  canManageSchedules: boolean;
};

/** Keyboard-first: the submit button has focus, so Enter registers the default session. */
export function VisitsRegisterForm(props: VisitsRegisterFormProps) {
  const register = useActionMutation(createVisitAction);
  const form = useForm<CreateVisitInput, unknown, CreateVisitValues>({
    resolver: zodResolver(createVisitSchema),
    defaultValues: {
      patient_id: props.patientId,
      schedule_id: firstOpenSession(props.sessions)?.id ?? "",
      payer_type: "umum",
    },
  });
  const { errors } = form.formState;

  if (props.sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada jadwal dokter hari ini.{" "}
        {props.canManageSchedules ? (
          <Link href="/settings/schedules" className="underline">
            Atur jadwal dokter
          </Link>
        ) : (
          "Hubungi admin klinik untuk mengatur jadwal."
        )}
      </p>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => {
        const session = props.sessions.find((item) => item.id === values.schedule_id);
        register.mutate(values, {
          onSuccess: (visit) => toast.success(`Terdaftar di ${session?.poliName}. Nomor antrean ${visit.queueNo}.`),
        });
      })}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Jadwal dokter hari ini</legend>
        {props.sessions.map((session) => {
          const full = session.taken >= session.quota;
          return (
            <label
              key={session.id}
              className={cn(
                "flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-muted",
                full && "cursor-not-allowed opacity-50",
              )}
            >
              <input type="radio" value={session.id} disabled={full} className="accent-primary" {...form.register("schedule_id")} />
              <span className="font-medium">{session.poliName}</span>
              <span>{session.doctorName}</span>
              <span className="text-muted-foreground">
                {toHourMinute(session.startTime)}–{toHourMinute(session.endTime)}
              </span>
              <span className={cn("ml-auto text-muted-foreground", full && "text-destructive")}>
                {full ? "Penuh" : `${session.taken}/${session.quota} pasien`}
              </span>
            </label>
          );
        })}
        {errors.schedule_id && <p className="text-sm text-destructive">{errors.schedule_id.message}</p>}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Pembayaran</legend>
        <div className="flex flex-wrap gap-4">
          {(["umum", "bpjs"] as const).map((payer) => {
            const disabled = payer === "bpjs" && !props.hasBpjsNumber;
            return (
              <label key={payer} className={cn("flex items-center gap-2 text-sm", disabled && "opacity-50")}>
                <input type="radio" value={payer} disabled={disabled} className="accent-primary" {...form.register("payer_type")} />
                {PAYER_LABELS[payer]}
              </label>
            );
          })}
        </div>
        {!props.hasBpjsNumber && (
          <p className="text-sm text-muted-foreground">BPJS tersedia setelah nomor BPJS pasien diisi di data pasien.</p>
        )}
      </fieldset>

      <div>
        <Button type="submit" autoFocus disabled={register.isPending}>
          {register.isPending ? "Mendaftarkan..." : "Daftarkan kunjungan"}
        </Button>
      </div>
    </form>
  );
}
