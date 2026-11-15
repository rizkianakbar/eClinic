'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { LOCALES } from '@/i18n/locales';
import { useActionMutation } from '@/lib/query';
import { setSiteLocaleAction } from './site.actions';

/** ID / EN for visitors. The chosen option fills at once; the page re-renders in that language when saved. */
export function SiteLocaleSwitch() {
  const t = useTranslations('site');
  const locale = useLocale();
  const save = useActionMutation(setSiteLocaleAction);
  const [shown, setShown] = useState(locale);

  return (
    <SegmentedControl
      label={t('language')}
      value={shown}
      options={LOCALES.map((value) => ({ value, label: value.toUpperCase() }))}
      onChange={(value) => {
        setShown(value);
        save.mutate(value, { onError: () => setShown(locale) });
      }}
      className="[&_label]:h-8 [&_label]:px-2.5 [&_label]:text-xs"
    />
  );
}
