import { cn } from 'cn';
import type * as React from 'react';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-20 px-3 py-2 leading-relaxed w-full min-w-0 rounded-lg border border-input bg-card text-base sm:text-sm text-foreground shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/12 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/12',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
