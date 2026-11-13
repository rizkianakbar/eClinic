import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PageLinksProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Current search params to keep (filters, query); `page` is replaced. */
  params?: Record<string, string>;
  /** The total, counted in the caller's words and language, e.g. "120 obat" / "120 medicines". */
  countLabel: string;
};

/** Previous / next links for server-paginated lists. Renders nothing on a single page. */
export function PageLinks(props: PageLinksProps) {
  const t = useTranslations('common.pagination');
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
    <nav aria-label={t('label')} className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        {t('summary', { count: props.countLabel, page: props.page, pages })}
      </span>
      <div className="flex gap-2">
        {link(props.page - 1, t('previous'), props.page <= 1)}
        {link(props.page + 1, t('next'), props.page >= pages)}
      </div>
    </nav>
  );
}
