import { MutationCache, QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { queryKeys } from "./query-keys";

const FALLBACK_ERROR = "Terjadi kesalahan. Coba lagi, atau hubungi admin jika terus terjadi.";

/** One QueryClient per browser session. Mutation errors are toasted here, once, not at each call site. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000 },
    },
    mutationCache: new MutationCache({
      onError(error) {
        // A Server Action that redirects (e.g. an expired session) is navigation, not a failure.
        if (isNavigationSignal(error)) return;
        toast.error(error.message || FALLBACK_ERROR);
      },
    }),
  });
}

/** Next.js signals redirect()/notFound() by throwing errors with these digests. */
export function isNavigationSignal(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"));
}

/** Result shape for Server Actions called from useMutation. */
export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** Turns a failed ActionResult into a thrown Error so the MutationCache toasts it. */
export function unwrap<T>(result: ActionResult<T>) {
  if (!result.ok) throw new Error(result.error);
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
