/** Values for a message with placeholders, e.g. { min: 50, max: 300 }. */
export type MessageValues = Record<string, string | number>;

/**
 * A message key carrying its placeholder values in one string ("key|{json}"), for places that only hold a
 * string, like Zod messages. Pure: schemas import it on the server and in the browser.
 */
export function keyed(key: string, values: MessageValues) {
  return `${key}|${JSON.stringify(values)}`;
}

/** Splits a message back into its key and values (plain keys and text come back as they are). */
export function unkey(message: string): [string, MessageValues | undefined] {
  const bar = message.indexOf('|{');

  if (bar === -1) return [message, undefined];

  try {
    return [message.slice(0, bar), JSON.parse(message.slice(bar + 1)) as MessageValues];
  } catch {
    return [message, undefined];
  }
}
