import { Input as InputPrimitive } from '@base-ui/react/input';
import { cn } from 'cn';
import type * as React from 'react';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'h-9 px-3 py-1.5 w-full min-w-0 rounded-lg border border-input bg-card text-base sm:text-sm text-foreground shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/12 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/12 file:mr-3 file:inline-flex file:h-7 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:text-sm file:font-medium file:text-secondary-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
