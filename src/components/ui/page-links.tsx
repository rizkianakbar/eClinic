import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PageLinksProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Current search params to keep (filters, query); `page` is replaced. */
  params?: Record<string, string>;
  /** e.g. "obat", shown as "120 obat". */
  noun: string;
};

/** Previous / next links for server-paginated lists. Renders nothing on a single page. */
export function PageLinks(props: PageLinksProps) {
  const pages = Math.max(1, Math.ceil(props.total / props.pageSize));

  if (pages <= 1) return null;

  const href = (page: number) => `?${new URLSearchParams({ ...props.params, page: String(page) })}`;

  const link = (page: number, label: string, disabled: boolean) => (
    <Link
      href={href(page)}
      aria-disabled={disabled}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), disabled && 'pointer-events-none opacity-50')}>
      {label}
    </Link>
  );

  return (
    <nav aria-label="Halaman" className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        {props.total} {props.noun}, halaman {props.page} dari {pages}
      </span>
      <div className="flex gap-2">
        {link(props.page - 1, 'Sebelumnya', props.page <= 1)}
        {link(props.page + 1, 'Berikutnya', props.page >= pages)}
      </div>
    </nav>
  );
}
