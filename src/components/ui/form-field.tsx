import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/** Label, control, then either the error or a short hint underneath. */
export function FormField(props: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", props.className)}>
      <Label htmlFor={props.htmlFor}>{props.label}</Label>
      {props.children}
      {props.error ? (
        <p className="text-[0.8125rem] text-destructive">{props.error}</p>
      ) : (
        props.hint && <p className="text-xs text-muted-foreground first-letter:uppercase">{props.hint}</p>
      )}
    </div>
  );
}
