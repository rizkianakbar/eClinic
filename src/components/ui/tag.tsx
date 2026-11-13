import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TagProps = {
  className?: string;
  children: ReactNode;
};

/** A quiet bordered label for facts next to a title (age, RM, poli). */
export function Tag(props: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md border bg-card px-2 text-xs text-muted-foreground',
        props.className,
      )}>
      {props.children}
    </span>
  );
}
