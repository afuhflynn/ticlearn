import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { CreateAffiliateParams } from "@/types";

/**
 * Admin only, from spec 0014. A student never creates or edits an affiliate;
 * an admin invites a named partner. The student facing page is gone.
 */
export function useCreateAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAffiliateParams) =>
      api.mutations.affiliate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
      toast.success("Affiliate created successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create affiliate",
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
