import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useAcceptInvite() {
  return useMutation({
    mutationKey: ["accept", "invite"],
    mutationFn: async (token: string) =>
      await api.queries.invites.accept({ token }),
  });
}
