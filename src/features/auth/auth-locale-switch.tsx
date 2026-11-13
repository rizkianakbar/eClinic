'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { type AppLocale, LOCALES } from '@/i18n/locales';
import { useActionMutation } from '@/lib/query';
import { setLocaleAction } from './auth.actions';

/** Language names in their own language, so each reader finds theirs. */
const NAMES: Record<AppLocale, string> = { id: 'Bahasa Indonesia', en: 'English' };

/** The screen language of the signed-in person. Takes effect everywhere once the page refreshes. */
export function AuthLocaleSwitch() {
  const t = useTranslations('auth.locale');
  const locale = useLocale();
  const save = useActionMutation(setLocaleAction);
  // The chosen option fills at once; the page re-renders in that language when the action lands.
  const [shown, setShown] = useState(locale);

  return (
    <SegmentedControl
      label={t('label')}
      value={shown}
      options={LOCALES.map((value) => ({ value, label: NAMES[value] }))}
      onChange={(value) => {
        setShown(value);
        save.mutate(value, { onError: () => setShown(locale) });
      }}
    />
  );
}
