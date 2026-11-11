import { MutationCache, QueryClient, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const FALLBACK_ERROR = "Terjadi kesalahan. Coba lagi, atau hubungi admin jika terus terjadi.";

/** One QueryClient per browser session. Mutation errors are toasted here, once, not at each call site. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000 },
    },
    mutationCache: new MutationCache({
      onError(error) {
        toast.error(error.message || FALLBACK_ERROR);
      },
    }),
  });
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
 */
export function useActionMutation<TVariables, TData = void>(
  action: (variables: TVariables) => Promise<ActionResult<TData>>,
) {
  const router = useRouter();
  return useMutation({
    mutationFn: async (variables: TVariables) => unwrap(await action(variables)),
    onSuccess: () => router.refresh(),
  });
}
