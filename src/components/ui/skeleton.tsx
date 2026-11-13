import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

/*
 * Skeletons stand in for content while it loads, and must take exactly its room: same frame, same padding, same
 * line heights. Build them from the real component's outer markup (or its real static labels) and put these
 * blocks only where data goes, so nothing moves when the content arrives.
 */

type SkeletonProps = {
  className?: string;
};

/** A placeholder block. Size it like the thing it stands for. */
export function Skeleton(props: SkeletonProps) {
  return <span aria-hidden className={cn('block animate-pulse rounded-md bg-foreground/7', props.className)} />;
}

/** Line box height (the text's line-height) and bar height (about its cap height) per text style. */
const LINE = {
  /** text-xs: 12px on a 16px line. */
  xs: ['h-4', 'h-2.5'],
  /** text-[0.8125rem] and text-sm: 13–14px on a 20px line. */
  sm: ['h-5', 'h-3'],
  /** text-base: 16px on a 24px line. */
  base: ['h-6', 'h-3.5'],
  /** Page titles: 1.5rem, leading-tight. */
  title: ['h-7.5', 'h-5'],
  /** .numeral text-xl (line-height 1). */
  'numeral-xl': ['h-5', 'h-4'],
  /** .numeral text-[1.5rem]. */
  'numeral-2xl': ['h-6', 'h-5'],
  /** .numeral text-[1.75rem]. */
  'numeral-3xl': ['h-7', 'h-6'],
} as const;

type SkeletonLineProps = {
  size?: keyof typeof LINE;
  /** Width of the bar, e.g. "w-32". */
  className?: string;
};

/** One line of text: a bar in a box of the line's own height, so it takes the room the text will. */
export function SkeletonLine(props: SkeletonLineProps) {
  const [box, bar] = LINE[props.size ?? 'sm'];

  return (
    <span aria-hidden className={cn('flex items-center', box)}>
      <Skeleton className={cn(bar, 'w-24 max-w-full rounded', props.className)} />
    </span>
  );
}

type SkeletonStatsProps = {
  /** The real labels (static), with their hint when it is static too. */
  items: { label: string; hint?: string }[];
  className?: string;
};

/**
 * The small figure strip used in page headers (patients, cashier, stock, clinic today): real labels, the
 * numbers still loading.
 */
export function SkeletonStats(props: SkeletonStatsProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'grid grid-cols-2 divide-x divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:flex sm:divide-y-0',
        props.className,
      )}>
      {props.items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 px-4 py-2.5">
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="flex items-baseline gap-1.5">
            <SkeletonLine size="numeral-xl" className="w-8" />
            {item.hint ? (
              <span className="text-xs text-muted-foreground">{item.hint}</span>
            ) : (
              <SkeletonLine size="xs" className="w-12" />
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

type SkeletonCardProps = {
  /** Rows of list-like content inside the card. */
  rows?: number;
  className?: string;
};

/** A framed card placeholder (Panel / table shape) with a few rows. */
export function SkeletonCard(props: SkeletonCardProps) {
  return (
    <div
      aria-busy
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]',
        props.className,
      )}>
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: props.rows ?? 3 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: identical placeholder rows; the position is their identity.
        <Skeleton key={index} className="h-10" />
      ))}
    </div>
  );
}

/** `count` placeholder keys, for mapping identical skeleton rows. */
export function placeholders(count: number) {
  return Array.from({ length: count }, (_, index) => `placeholder-${index}`);
}

type SkeletonPageProps = {
  /** What is loading, for screen readers: "Memuat antrean". */
  label: string;
  /** A route's loading.tsx (not an in-page Suspense fallback): the nav progress bar runs until it is replaced. */
  route?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** The wrapper every loading screen uses: announces loading, lays out like the page (gap-6 sections). */
export function SkeletonPage(props: SkeletonPageProps) {
  return (
    <div
      role="status"
      aria-busy
      aria-label={props.label}
      data-route-loading={props.route || undefined}
      className={cn('flex flex-col gap-6', props.className)}>
      {props.children}
    </div>
  );
}

const BUTTON = {
  xs: 'h-7 pointer-coarse:h-9',
  sm: 'h-8 pointer-coarse:h-9',
  default: 'h-9 pointer-coarse:h-10',
  lg: 'h-11',
} as const;

type SkeletonButtonProps = {
  size?: keyof typeof BUTTON;
  /** Width, e.g. "w-32". */
  className?: string;
};

/** A button still waiting for its data: the button's own height (touch sizes included). */
export function SkeletonButton(props: SkeletonButtonProps) {
  return <Skeleton className={cn('shrink-0 rounded-lg', BUTTON[props.size ?? 'default'], props.className)} />;
}

type SkeletonActionProps = {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
  icon?: React.ReactNode;
  children: React.ReactNode;
};

/** An action button with its real label, drawn but inert until the page arrives: exactly its size. */
export function SkeletonAction(props: SkeletonActionProps) {
  return (
    <span
      aria-hidden
      className={cn(buttonVariants({ variant: props.variant, size: props.size }), 'pointer-events-none opacity-60')}>
      {props.icon}
      {props.children}
    </span>
  );
}
