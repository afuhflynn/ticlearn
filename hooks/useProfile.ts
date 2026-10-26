import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { family, invalidateGroups } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; image?: string }) => {
      const result = await api.mutations.profile.update(data);
      return result;
    },
    onSuccess: () => {
      void invalidateGroups(queryClient, "profile");
      toast.success("Profile updated");
    },
  });
}

export function useSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      const result = await api.queries.settings();
      return result;
    },
    ...family("settings"),
  });

  return {
    settings: data?.settings,
    isLoading,
    error,
  };
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
    }) => {
      const result = await api.mutations.settings.update(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success("Settings saved");
    },
  });
}
