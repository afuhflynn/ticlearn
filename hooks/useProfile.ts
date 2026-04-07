import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
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
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
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
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
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
      darkMode?: boolean;
      language?: string;
      timezone?: string;
    }) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
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
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&type=${type}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: query.length >= 2,
  });
}
