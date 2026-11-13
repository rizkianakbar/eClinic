import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { type MessageValues, unkey } from './keyed';

export type { MessageValues } from './keyed';

type Translate = ReturnType<typeof useTranslations<never>>;

/**
 * Error and validation messages travel as message keys (Zod messages, ActionResult.error), so services and
 * schemas stay language-free; a key may carry its values (`keyed()`). This turns one into text: a known key is
 * translated, anything else (a raw database message) is shown as it is.
 */
function resolve(t: Translate, message: string, values?: MessageValues) {
  const [key, carried] = unkey(message);

  return t.has(key as never) ? t(key as never, { ...carried, ...values } as never) : message;
}

/** In components (client, or non-async server): `const message = useMessage(); message(error.message)`. */
export function useMessage() {
  const t = useTranslations() as unknown as Translate;

  return (message: string, values?: MessageValues) => resolve(t, message, values);
}

/** In async server code. */
export async function getMessage() {
  const t = (await getTranslations()) as unknown as Translate;

  return (message: string, values?: MessageValues) => resolve(t, message, values);
}
