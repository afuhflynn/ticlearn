import { api } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useAdminStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.mutations.admin.stats(),
  });
  return { stats: data?.stats, isLoading, error, refetch };
}

export function useAdminUsers(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    onboardingStatus?: "completed" | "not_completed" | "skipped" | "all";
    sortBy?: string;
    sortOrder?: string;
  } = {},
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => api.mutations.admin.users.getAll(params),
  });
  return {
    users: (data?.users ?? []) as unknown as {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      role: string;
      activeProfileId: string | null;
      onboardingCompleted: boolean | null;
      onboardingSkipped: boolean | null;
      onboardingStep: number | null;
      phoneNumber: string | null;
      phoneCountryCode: string | null;
      createdAt: string;
      notesCount: number;
      quizzesCount: number;
      attemptsCount: number;
    }[],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error,
    refetch,
  };
}

export function useAdminUser(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => api.mutations.admin.users.getById(id),
    enabled: !!id,
  });
  return {
    user: data?.user,
    stats: data?.stats,
    recentNotes: data?.recentNotes,
    recentQuizzes: data?.recentQuizzes,
    recentAttempts: data?.recentAttempts,
    isLoading,
    error,
    refetch,
  };
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; role?: string };
    }) => api.mutations.admin.users.update(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.mutations.admin.users.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminFeedback(
  params: { page?: number; limit?: number; status?: string } = {},
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "feedback", params],
    queryFn: () => api.mutations.admin.feedback.getAll(params),
    refetchInterval: 30000,
    staleTime: 0,
  });
  return {
    feedbacks: (data?.feedbacks ?? []) as unknown as {
      id: string;
      user: { id: string; name: string | null; email: string };
      type: string;
      status: string;
      message: string;
      createdAt: string;
      attemptId: string | null;
      mockId: string | null;
      conversationId: string | null;
      rating: number | null;
    }[],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error,
    refetch,
  };
}

export function useUpdateAdminFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status?: string; adminNote?: string };
    }) => api.mutations.admin.feedback.update(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] }),
  });
}

export function useDeleteAdminFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.mutations.admin.feedback.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] }),
  });
}

export function useAdminSubscriptions(
  params: { page?: number; limit?: number; status?: string } = {},
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "subscriptions", params],
    queryFn: () => api.mutations.admin.subscriptions.getAll(params),
  });
  return {
    subscriptions: (data?.subscriptions ?? []) as unknown as {
      id: string;
      userEmail: string;
      userName: string;
      plan: string;
      status: string;
      activatedAt: string | null;
      amount: number;
      fapshiTransId: string | null;
      startDate: string;
      endDate: string | null;
      createdAt: string;
    }[],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error,
    refetch,
  };
}

export function useUpdateAdminSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status: string; plan?: string };
    }) => api.mutations.admin.subscriptions.update(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] }),
  });
}

export function useDeleteAdminSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.mutations.admin.subscriptions.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] }),
  });
}

export function useCreateAdminSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      userId: string;
      plan: string;
      amount: number;
      startDate: string;
      endDate: string;
    }) => api.mutations.admin.subscriptions.create(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions"] }),
  });
}

export function useAdminAffiliates(
  params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "affiliates", params],
    queryFn: () => api.mutations.admin.affiliates.getAll(params),
  });
  return {
    affiliates: (data?.affiliates ?? []) as unknown as {
      id: string;
      code: string;
      status: string;
      userName: string;
      userEmail: string;
      totalClicks: number;
      totalConversions: number;
      totalEarnings: number;
      pendingEarnings: number;
      momoNumber: string;
      momoName: string;
    }[],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    error,
    refetch,
  };
}

export function useAdminAffiliate(id: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "affiliates", id],
    queryFn: () => api.mutations.admin.affiliates.getById(id),
    enabled: !!id,
  });
  return {
    affiliate: data?.affiliate,
    totalEarnings: data?.totalEarnings,
    isLoading,
    error,
    refetch,
  };
}

export function useUpdateAdminAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status?: string; commissionRate?: number };
    }) => api.mutations.admin.affiliates.update(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] }),
  });
}

export function useDeleteAdminAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.mutations.admin.affiliates.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] }),
  });
}

export function useCreateAdminAffiliate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      userId: string;
      code: string;
      commissionRate?: number;
      status?: string;
    }) => api.mutations.admin.affiliates.create(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] }),
  });
}

export function usePayAffiliateEarnings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/affiliates/${id}/payout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process payout");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "affiliates"] });
    },
  });
}

export function useGenerateAdminReport() {
  return useMutation({
    mutationFn: async (type: string) => {
      const response = await api.mutations.admin.generateReport(type);
      const blob = response as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
