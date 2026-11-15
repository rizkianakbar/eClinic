import { useMutation } from '@tanstack/react-query';
import { unwrap } from '@/lib/query';
import { switchBranchAction } from './branches.actions';

/**
 * Start working at a branch, then open `next` there (its Beranda by default). A full page load follows, not a
 * router refresh: the live queue subscription, the client caches and every open screen belong to the old branch.
 */
export function useSwitchBranch(next = '/dashboard') {
  return useMutation({
    mutationFn: async (clinicId: string) => unwrap(await switchBranchAction(clinicId)),
    onSuccess: () => window.location.assign(next),
  });
}
