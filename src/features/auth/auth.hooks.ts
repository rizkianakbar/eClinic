import { useMutation } from "@tanstack/react-query";
import { unwrap } from "@/lib/query";
import { signIn, signOut } from "./auth.actions";
import type { SignInValues } from "./auth.lib";

export function useSignIn() {
  return useMutation({
    mutationFn: async (values: SignInValues) => unwrap(await signIn(values)),
  });
}

export function useSignOut() {
  return useMutation({ mutationFn: () => signOut() });
}
