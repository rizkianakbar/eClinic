import { MutationCache, QueryClient } from "@tanstack/react-query";
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
