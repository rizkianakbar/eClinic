import 'server-only';

/** Supabase's API returns at most this many rows per request (PostgREST max-rows), whatever `.limit()` says. */
export const MAX_ROWS = 1000;

type Page<T> = PromiseLike<{ data: T[] | null; error: { code?: string } | null }>;

/**
 * Every row of a query, fetched in pages of MAX_ROWS. Without this a list or a
 * total silently stops at the first 1000 rows. `page(from, to)` must apply
 * `.range(from, to)` to a query with a total order (end with a unique column,
 * e.g. `.order("id")`), or rows can repeat or go missing between pages.
 */
export async function fetchAll<T>(label: string, page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += MAX_ROWS) {
    const { data, error } = await page(from, from + MAX_ROWS - 1);

    if (error) throw new Error(`${label} failed: ${error.code}`);

    rows.push(...(data ?? []));
    if (!data || data.length < MAX_ROWS) return rows;
  }
}
