import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PaymentSettingsData } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    gcTime: 0,
    staleTime: Infinity,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentSettings });
    },
    onError(error: Error) {
      toast.error(error.message ?? "Failed to save payment settings");
    },
  });
}
