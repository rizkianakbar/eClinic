import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { useMessage } from '@/i18n/message';
import { cn } from '@/lib/utils';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  /** A message key (Zod message) or text. */
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/** Label, control, then either the error or a short hint underneath. */
export function FormField(props: FormFieldProps) {
  const message = useMessage();

  return (
    <div className={cn('flex flex-col gap-1.5', props.className)}>
      <Label htmlFor={props.htmlFor}>{props.label}</Label>
      {props.children}
      {props.error ? (
        <p className="text-[0.8125rem] text-destructive">{message(props.error)}</p>
      ) : (
        props.hint && <p className="text-xs text-muted-foreground first-letter:uppercase">{props.hint}</p>
      )}
    </div>
  );
}
