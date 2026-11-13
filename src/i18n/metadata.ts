import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

type MessageKey = Parameters<Awaited<ReturnType<typeof getTranslations<never>>>>[0];

/** A page's tab title in the reader's language: `export const generateMetadata = pageTitle('nav.queue');` */
export function pageTitle(key: MessageKey) {
  return async (): Promise<Metadata> => ({ title: (await getTranslations())(key) });
}
