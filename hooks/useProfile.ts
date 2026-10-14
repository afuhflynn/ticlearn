import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const result = await api.queries.profile();
      return result;
    },
    gcTime: 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  return {
    user: data?.user,
    stats: data?.stats,
    affiliate: data?.affiliate,
    isLoading,
    error,
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name?: string; image?: string }) => {
      const result = await api.mutations.profile.update(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.session });
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
    gcTime: 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
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
      weeklyDigest?: boolean;
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

export function useSearch(query: string, type = "all") {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      const result = await api.queries.search(query, type);
      return result;
    },
    enabled: query.length >= 2,
  });
}
