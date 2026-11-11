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

/** Label + control + optional hint and validation message. */
export function FormField(props: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <Label htmlFor={props.htmlFor}>
        {props.label}
        {props.hint && <span className="font-normal text-muted-foreground">({props.hint})</span>}
      </Label>
      {props.children}
      {props.error && <p className="text-sm text-destructive">{props.error}</p>}
    </div>
  );
}
