import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { family, invalidateGroups } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";
import type { PaymentSettingsData } from "@/types";

export function usePaymentSettings() {
  return useQuery({
    queryKey: queryKeys.paymentSettings,
    queryFn: async () => {
      const result = await api.queries.payments.settings();
      return {
        mtnNumber: result.settings.mtnNumber || "",
        mtnHolderName: result.settings.mtnHolderName || "",
        orangeNumber: result.settings.orangeNumber || "",
        orangeHolderName: result.settings.orangeHolderName || "",
      };
    },
    ...family("settings"),
  });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: queryKeys.savePaymentSettings,
    mutationFn: async (data: PaymentSettingsData) =>
      api.mutations.payments.updateSettings(data),
    onSuccess() {
      toast.success("Payment settings saved successfully");
      void invalidateGroups(queryClient, "paymentSettings");
    },
    onError(error: Error) {
      toast.error(error.message ?? "Failed to save payment settings");
    },
  });
}
