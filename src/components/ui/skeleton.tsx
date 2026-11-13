import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

/** A placeholder block while a section streams in. Size it like the content it stands for, so nothing jumps. */
export function Skeleton(props: SkeletonProps) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-muted/80", props.className)} />;
}

type SkeletonCardProps = {
  /** Rows of list-like content inside the card. */
  rows?: number;
  className?: string;
};

/** A framed card placeholder (Panel / table shape) with a few rows. */
export function SkeletonCard(props: SkeletonCardProps) {
  return (
    <div aria-busy className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]", props.className)}>
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: props.rows ?? 3 }, (_, index) => (
        <Skeleton key={index} className="h-10" />
      ))}
    </div>
  );
}
