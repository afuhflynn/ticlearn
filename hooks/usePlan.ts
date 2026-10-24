import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  getPlanLimits,
  isUnlimited,
  limitReached,
  UNLIMITED,
} from "@/lib/plan-limits";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

interface UsePlanResult {
  plan: string;
  status: string;
  previousPlan: string | null;
  isLoading: boolean;
  isPaid: boolean;
  isPending: boolean;
  canUpload: boolean;
  uploadLimit: number;
  aiTutorLimit: number;
  quizLimit: number;
  chatReached: (used: number) => boolean;
  quizReached: (used: number) => boolean;
  uploadReached: (used: number) => boolean;
}

export function usePlan(): UsePlanResult {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async () => {
      const result = await api.queries.subscription();
      return result;
    },
    ...family("plan"),
  });

  const subscription = data?.subscription;
  const previousPlan = data?.previousPlan ?? null;
  const planName = subscription?.plan || "FREE";
  const status = subscription?.status || "NONE";

  const isPaid = status === "ACTIVE" && planName !== "FREE";
  const isPending =
    status === "PENDING" || (previousPlan && !subscription) || false;

  const displayPlan = isPending && previousPlan ? previousPlan : planName;
  const limits = getPlanLimits(displayPlan);

  return {
    plan: displayPlan,
    status,
    previousPlan,
    isLoading,
    isPaid,
    isPending,
    canUpload: limits.pdfUploads !== 0,
    uploadLimit: limits.pdfUploads,
    aiTutorLimit: limits.aiTutorMessages,
    quizLimit: limits.quizGenerations,
    chatReached: (used: number) => limitReached(limits.aiTutorMessages, used),
    quizReached: (used: number) => limitReached(limits.quizGenerations, used),
    uploadReached: (used: number) => limitReached(limits.pdfUploads, used),
  };
}

export { UNLIMITED, isUnlimited };
