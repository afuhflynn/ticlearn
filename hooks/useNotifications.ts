import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

export function useNotifications(unreadOnly = false) {
  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.notifications, unreadOnly],
    queryFn: async () => {
      const result = await api.queries.notifications(unreadOnly);
      return result;
    },
  });

  return {
    notifications: data?.notifications || [],
    isLoading,
    error,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await api.mutations.notifications.markRead(id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}
