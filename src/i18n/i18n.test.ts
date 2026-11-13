import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import id from '../../messages/id.json';

/** Every leaf key ("a.b.c") of a messages object. */
function keys(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

/** The arguments and tags of a message: "{name}", "{count, plural, …}", "<b>" (plural branch text is not one). */
function slots(message: string) {
  return [...message.matchAll(/\{(\w+)(?=[,}])|<(\w+)>/g)].map((match) => match[1] ?? `<${match[2]}>`).sort();
}

function leaf(messages: object, key: string) {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages) as string;
}

describe('messages', () => {
  it('English has exactly the Bahasa keys', () => {
    expect(keys(en).sort()).toEqual(keys(id).sort());
  });

  it('every translation keeps the same placeholders and tags', () => {
    const mismatched = keys(id).filter(
      (key) =>
        JSON.stringify([...new Set(slots(leaf(id, key)))]) !== JSON.stringify([...new Set(slots(leaf(en, key)))]),
    );

    expect(mismatched).toEqual([]);
  });

  it('has no empty messages', () => {
    expect(keys(id).filter((key) => !leaf(id, key) || !leaf(en, key))).toEqual([]);
  });
});
