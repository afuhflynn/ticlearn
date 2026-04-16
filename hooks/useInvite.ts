import { api } from "@/lib/api-client";
import { useMutation } from "@tanstack/react-query";

export function useAcceptInvite() {
  return useMutation({
    mutationKey: ["accept", "invite"],
    mutationFn: async (token: string) =>
      await api.queries.invites.accept({ token }),
  });
}
