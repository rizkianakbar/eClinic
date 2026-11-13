"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/dates";
import { useActionMutation } from "@/lib/query";
import { addAmendmentAction } from "./exam.actions";
import { amendmentSchema, type SoapInput, type SoapValues } from "./exam.lib";
import type { listSoapNotes } from "./exam.service";
import { ExamSoapSheet, SoapText } from "./exam-soap-sheet";

type Note = NonNullable<Awaited<ReturnType<typeof listSoapNotes>>["main"]>;

type ExamAmendmentsProps = {
  visitId: string;
  amendments: Note[];
  canAmend: boolean;
};

const EMPTY: SoapInput = { subjective: "", objective: "", assessment: "", plan: "" };

/** Signed corrections, shown in order; the original note never changes. */
export function ExamAmendments(props: ExamAmendmentsProps) {
  const [adding, setAdding] = useState(false);
  const add = useActionMutation((values: SoapValues) => addAmendmentAction(props.visitId, values));
  const form = useForm<SoapInput, unknown, SoapValues>({
    resolver: zodResolver(amendmentSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  return (
    <div className="flex flex-col gap-3">
      {props.amendments.map((note) => (
        <div key={note.id} className="flex flex-col gap-2">
          <p className="text-[0.8125rem] text-muted-foreground">
            Amandemen oleh <span className="font-medium text-foreground">{note.author?.full_name}</span>,{" "}
            {formatDateTime(note.signed_at ?? note.created_at)}
          </p>
          <SoapText note={note} />
        </div>
      ))}

      {props.canAmend &&
        (adding ? (
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={form.handleSubmit((values) =>
              add.mutate(values, {
                onSuccess: () => {
                  toast.success("Amandemen ditambahkan.");
                  form.reset(EMPTY);
                  setAdding(false);
                },
              }),
            )}
          >
            <p className="text-[0.8125rem] text-muted-foreground">
              Tulis hanya bagian yang dikoreksi. Catatan asli tetap tersimpan.
            </p>
            <ExamSoapSheet
              render={(field) => (
                <>
                  <label htmlFor={`amend_${field.name}`} className="text-xs font-semibold">
                    {field.label}
                  </label>
                  <textarea
                    id={`amend_${field.name}`}
                    rows={1}
                    className="field-sizing-content min-h-10 w-full resize-none bg-transparent py-1 text-base leading-relaxed outline-none sm:text-sm"
                    {...form.register(field.name)}
                  />
                  {errors[field.name] && <p className="text-[0.8125rem] text-destructive">{errors[field.name]?.message}</p>}
                </>
              )}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={add.isPending}>
                {add.isPending ? "Menyimpan..." : "Tanda tangani amandemen"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Batal
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              Tambah amandemen
            </Button>
          </div>
        ))}
    </div>
  );
}
