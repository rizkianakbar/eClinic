import { useTranslations } from 'next-intl';

/** "This list updates by itself": a small breathing dot and a label. */
export function LiveIndicator() {
  const t = useTranslations('common');

  return (
    <span className="inline-flex items-center gap-1.5 text-primary">
      <span className="signal-pulse size-1.5 rounded-full bg-current" aria-hidden />
      {t('live')}
    </span>
  );
}
