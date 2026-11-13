import { MutationCache, QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { MessageValues } from '@/i18n/keyed';
import { queryKeys } from './query-keys';

/** Turns an error's message key into text in the current language (see i18n/message). */
export type ErrorText = (message: string, values?: MessageValues) => string;

/**
 * One QueryClient per browser session. Mutation errors are toasted here, once, not at each call site.
 * `text` is read at toast time, so a language switch applies without rebuilding the client.
 */
export function makeQueryClient(text: { current: ErrorText }) {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000 },
    },
    mutationCache: new MutationCache({
      onError(error) {
        // A Server Action that redirects (e.g. an expired session) is navigation, not a failure.
        if (isNavigationSignal(error)) return;

        const values = error instanceof ActionError ? error.values : undefined;

        toast.error(text.current(error.message || 'errors.generic', values));
      },
    }),
  });
}

/** Next.js signals redirect()/notFound() by throwing errors with these digests. */
export function isNavigationSignal(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;

  return (
    typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK'))
  );
}

/**
 * Result shape for Server Actions called from useMutation. `error` is a message key (translated in the browser,
 * in the user's language), with `values` for its placeholders.
 */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string; values?: MessageValues };

/** A failed action, carried to the MutationCache with its placeholder values. */
export class ActionError extends Error {
  constructor(
    message: string,
    readonly values?: MessageValues,
  ) {
    super(message);
  }
}

/** Turns a failed ActionResult into a thrown Error so the MutationCache toasts it. */
export function unwrap<T>(result: ActionResult<T>) {
  if (!result.ok) throw new ActionError(result.error, result.values);

  return result.data;
}

/**
 * useMutation around a Server Action that changes server-rendered data:
 * throws on failure (toasted by the MutationCache) and refreshes the route on success.
 * It also refetches today's queue: signing, dispensing, paying and registering all
 * move a patient, and the board is cached across pages (Realtime is the second net).
 */
export function useActionMutation<TVariables, TData = void>(
  action: (variables: TVariables) => Promise<ActionResult<TData>>,
) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TVariables) => unwrap(await action(variables)),
    onSuccess: () => {
      router.refresh();
      void queryClient.invalidateQueries({ queryKey: queryKeys.queue.all });
    },
  });
}

/** The value after it stopped changing for `delayMs` (search-as-you-type). */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
