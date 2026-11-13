import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SOAP_FIELDS } from "./exam.constants";

type SoapName = (typeof SOAP_FIELDS)[number]["name"];

type ExamSoapSheetProps = {
  /** One control (or read-only text) per SOAP part. */
  render: (field: (typeof SOAP_FIELDS)[number]) => ReactNode;
  /** Parts to show; all four by default. */
  only?: readonly SoapName[];
  className?: string;
};

/** S, O, A, P as one sheet: the letter on the left, the writing on the right. */
export function ExamSoapSheet(props: ExamSoapSheetProps) {
  const fields = props.only ? SOAP_FIELDS.filter((field) => props.only!.includes(field.name)) : SOAP_FIELDS;
  return (
    // Inside a flush exam card the sheet runs edge to edge; elsewhere it keeps its own frame.
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] in-data-flush:rounded-none in-data-flush:border-0 in-data-flush:shadow-none",
        props.className,
      )}
    >
      {fields.map((field) => (
        <div
          key={field.name}
          className="grid grid-cols-[2.75rem_minmax(0,1fr)] border-b transition-colors last:border-0 focus-within:bg-secondary/30"
        >
          <div className="flex justify-center border-r bg-muted/40 pt-3">
            <span className="numeral text-[1.125rem] text-primary" aria-hidden>
              {field.letter}
            </span>
          </div>
          <div className="flex min-w-0 flex-col px-3 pt-2.5 pb-2">{props.render(field)}</div>
        </div>
      ))}
    </div>
  );
}

type SoapTextProps = {
  note: Record<SoapName, string | null>;
};

/** Read-only SOAP, skipping empty parts. */
export function SoapText(props: SoapTextProps) {
  const parts = SOAP_FIELDS.filter((field) => props.note[field.name]).map((field) => field.name);
  if (parts.length === 0) return <p className="text-sm text-muted-foreground">Catatan kosong.</p>;
  return (
    <ExamSoapSheet
      only={parts}
      render={(field) => (
        <>
          <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{props.note[field.name]}</p>
        </>
      )}
    />
  );
}
