import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

/**
 * Partner side plus admin invite side for the invite only loop (spec 0038).
 * A student never creates an affiliate; an admin invites, the person claims,
 * the admin approves. Partner screens show counts only, never referee emails.
 */
export function useCreateAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      userId: string;
      code: string;
      momoNumber: string;
      momoName: string;
    }) => api.mutations.admin.affiliates.create(data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
      toast.error(
        "Direct partner creation is retired. Invite the person by email instead.",
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Direct creation is retired. Invite by email instead.",
      );
    },
  });
}

export function useConfirmEarnings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payEarningsId: string) =>
      api.mutations.affiliate.confirmEarnings(payEarningsId),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to process payout",
      );
    },
  });
}

export function usePartnerStats(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["partner", "me"],
    queryFn: () => api.mutations.admin.partner.me(),
    enabled,
    retry: false,
  });
  return { stats: data, isLoading, error, refetch };
}

export function useClaimPartnerInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.mutations.admin.partner.claim(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner", "me"] });
      toast.success(
        "Invite claimed. Your partner account is pending approval.",
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not claim this invite",
      );
    },
  });
}

export function useRequestPartnerPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.mutations.admin.partner.requestPayout(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["partner", "me"] });
      toast.success(
        `Payout requested for ${data.requested} earning${data.requested === 1 ? "" : "s"}.`,
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not request payout",
      );
    },
  });
}

export function useAdminPartnerInvites(
  params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "partner-invites", params],
    queryFn: () => api.mutations.admin.affiliates.invites(params),
  });
  return {
    invites: data?.invites ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error,
    refetch,
  };
}

export function useInvitePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      api.mutations.admin.affiliates.inviteCreate({ email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-invites"] });
      toast.success("Invite sent.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not send invite",
      );
    },
  });
}

export function useApprovePartnerInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.mutations.admin.affiliates.inviteApprove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-invites"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
      toast.success("Partner approved.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not approve invite",
      );
    },
  });
}

export function useResendPartnerInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.mutations.admin.affiliates.inviteResend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-invites"] });
      toast.success("Invite resent with a fresh link.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not resend invite",
      );
    },
  });
}

export function useRevokePartnerInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.mutations.admin.affiliates.inviteRevoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "partner-invites"] });
      toast.success("Invite revoked.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not revoke invite",
      );
    },
  });
}

export function usePayoutPartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payoutReference,
    }: {
      id: string;
      payoutReference: string;
    }) => api.mutations.admin.affiliates.payout(id, { payoutReference }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not pay partner",
      );
    },
  });
}

export function useRevokePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.mutations.admin.affiliates.revoke(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
      toast.success("Partner link revoked. Tracking stopped at once.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not revoke partner",
      );
    },
  });
}
