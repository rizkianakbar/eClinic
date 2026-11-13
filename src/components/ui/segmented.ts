import { cn } from '@/lib/utils';

/*
 * One look for every "pick one" control (filters, views, payer, sex, text
 * size): a bordered group with dividers, so every option reads as a button;
 * the chosen one is filled dark, so it can never be mistaken for plain text.
 * Render the group as a <fieldset> with an sr-only <legend> (min-w-0 lets a fieldset shrink).
 */
export const segmentedGroup =
  'inline-flex w-fit max-w-full min-w-0 overflow-x-auto rounded-lg border border-input bg-card shadow-[0_1px_2px_rgb(20_32_29/0.05)] divide-x divide-input scrollbar-none';

export function segmentedItem(active: boolean, className?: string) {
  return cn(
    'flex h-8 shrink-0 items-center justify-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 select-none',
    active ? 'bg-foreground text-background' : 'text-foreground/80 hover:bg-muted hover:text-foreground',
    className,
  );
}

/** For <label> + hidden radio pairs: the same look, driven by :has(:checked). */
export const segmentedRadioItem =
  'flex h-8 cursor-pointer items-center justify-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap text-foreground/80 transition-colors duration-150 select-none hover:bg-muted has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-3 has-focus-visible:ring-inset has-focus-visible:ring-primary/30 has-disabled:cursor-not-allowed has-disabled:opacity-50';
