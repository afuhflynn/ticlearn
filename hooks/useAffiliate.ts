import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { CreateAffiliateParams } from "@/types";

export function useAffiliate() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.affiliate,
    queryFn: async () => {
      const result = await api.queries.affiliates.affiliate();
      return result;
    },
  });

  return {
    affiliate: data?.affiliate,
    isLoading,
    error,
  };
}

export function useUpdateAffiliate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      payoutMethod?: string;
      payoutAddress?: string;
    }) => {
      const result = await api.mutations.affiliate.update(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliate });
      toast.success("Affiliate updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApplyReferralCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const result = await api.mutations.affiliate.applyReferral(code);
      return result;
    },
    onSuccess: () => {
      toast.success("Referral code applied!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await api.mutations.affiliate.requestPayout();
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.affiliate });
      toast.success(data.message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

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
