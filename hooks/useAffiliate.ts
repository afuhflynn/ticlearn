import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useAffiliate() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.affiliate,
    queryFn: async () => {
      const res = await fetch("/api/affiliate");
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch affiliate");
      }
      return res.json();
    },
  });

  return {
    affiliate: data?.affiliate,
    isLoading,
    error,
    isPending: !data && !error,
  };
}

export function useUpdateAffiliate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { momoNumber: string; momoName: string }) => {
      const res = await fetch("/api/affiliate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update affiliate");
      return res.json();
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
      const res = await fetch("/api/referral?code=" + code, {
        method: "GET",
      });
      if (!res.ok) throw new Error("Invalid or expired referral code");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Referral code applied!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
