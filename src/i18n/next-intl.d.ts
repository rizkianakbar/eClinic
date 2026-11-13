import type messages from '../../messages/id.json';
import type { AppLocale } from './locales';

// Bahasa Indonesia is the source: every key used in code must exist there, and messages/en.json must match it
// (i18n.test.ts).
declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof messages;
  }
}
