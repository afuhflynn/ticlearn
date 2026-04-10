import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

export function useAffiliate() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.affiliate,
    queryFn: async () => {
      const result = await api.queries.affiliate();
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
