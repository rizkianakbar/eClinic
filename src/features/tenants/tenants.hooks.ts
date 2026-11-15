import { useMutation, useQuery } from '@tanstack/react-query';
import { type ActionResult, unwrap, useDebouncedValue } from '@/lib/query';
import { queryKeys } from '@/lib/query-keys';
import { checkSlugAction, signUpAction, siteSignInAction } from './tenants.actions';
import type { SignupValues, SiteLoginValues } from './tenants.lib';

/** Availability of the subdomain being typed, checked once typing pauses. */
export function useSlugAvailability(slug: string) {
  const debounced = useDebouncedValue(slug.trim().toLowerCase(), 350);

  const query = useQuery({
    queryKey: queryKeys.tenants.slug(debounced),
    queryFn: async () => unwrap(await checkSlugAction(debounced)),
    enabled: debounced.length > 0,
    staleTime: 10_000,
  });

  // While typing, the last answer belongs to another value: report "checking", not a stale verdict.
  return { ...query, settled: debounced === slug.trim().toLowerCase() };
}

/**
 * Signup and root-domain sign-in end on another host (the clinic's subdomain), so success is a full page
 * navigation to the handoff link, not a router push. The button stays busy until the new page loads.
 */
function useHandoffMutation<TValues>(action: (values: TValues) => Promise<ActionResult<{ url: string }>>) {
  return useMutation({
    mutationFn: async (values: TValues) => unwrap(await action(values)),
    onSuccess: ({ url }) => window.location.assign(url),
  });
}

/** `trap`: the honeypot and when the form appeared (see looksAutomated). */
export function useSignUp(trap: () => { website: string; startedAt: number }) {
  return useHandoffMutation<SignupValues>((values) => signUpAction(values, trap()));
}

export function useSiteSignIn() {
  return useHandoffMutation<SiteLoginValues>(siteSignInAction);
}
