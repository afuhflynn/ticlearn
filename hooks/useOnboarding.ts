import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useOnboardingProgress() {
  return useQuery({
    queryKey: queryKeys.onboardingProgress,
    queryFn: () => api.mutations.onboarding.progress(),
  });
}

export function useStartOnboarding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.mutations.onboarding.start(),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.onboardingProgress });
    },
  });
}

export function useSaveOnboardingStep() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.mutations.onboarding.save,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.onboardingProgress });
    },
  });
}

export function useFinishOnboarding() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.mutations.onboarding.finish,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.onboardingProgress });
      void client.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}
