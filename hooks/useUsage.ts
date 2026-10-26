import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { FREE_LIMITS, type PlanLimits, remainingOf } from "@/lib/plan-limits";
import { family } from "@/lib/query-families";
import { queryKeys } from "@/lib/query-keys";

interface Usage {
  pdfUploads: number;
  quizGenerations: number;
  aiTutorMessages: number;
}

interface ChatDailyUsage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  resetsInSeconds: number;
}

interface UseUsageResult {
  plan: string;
  status: string;
  previousPlan: string | null;
  limits: PlanLimits;
  usage: Usage;
  creditCosts: { quizGeneration: number; aiTutorMessage: number };
  canUpload: boolean;
  canGenerateQuiz: boolean;
  canUseAIChat: boolean;
  chatDailyUsage: ChatDailyUsage | null;
  isLoading: boolean;
  isPaid: boolean;
  isPending: boolean;
  refetch: () => void;
}

export function useUsage(): UseUsageResult {
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.usage,
    queryFn: async () => {
      const result = await api.queries.usage();
      return result;
    },
    ...family("usage"),
  });

  const currentStatus = data?.status || "NONE";
  const isPending = currentStatus === "PENDING";
  const isPaid = currentStatus === "ACTIVE" && data?.plan !== "FREE";

  const displayPlan =
    isPending && data?.previousPlan ? data.previousPlan : data?.plan || "FREE";

  return {
    plan: displayPlan,
    status: currentStatus,
    previousPlan: data?.previousPlan || null,
    limits: { ...FREE_LIMITS, ...(data?.limits ?? {}) },
    usage: {
      pdfUploads: data?.usage?.pdfUploads ?? 0,
      quizGenerations: data?.usage?.quizGenerations ?? 0,
      aiTutorMessages: data?.usage?.aiTutorMessages ?? 0,
    },
    creditCosts: {
      quizGeneration: data?.creditCosts?.quizGeneration ?? 50,
      aiTutorMessage: data?.creditCosts?.aiTutorMessage ?? 5,
    },
    canUpload: data?.canUpload ?? true,
    canGenerateQuiz: data?.canGenerateQuiz ?? true,
    canUseAIChat: data?.canUseAIChat ?? true,
    chatDailyUsage: data?.chatDailyUsage ?? null,
    isLoading,
    isPaid,
    isPending,
    refetch,
  };
}

export function useCheckLimit(feature: "upload" | "quiz" | "chat"): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  const { limits, usage, canUpload, canGenerateQuiz, canUseAIChat } =
    useUsage();

  switch (feature) {
    case "upload":
      return {
        allowed: canUpload,
        remaining: remainingOf(limits.pdfUploads, usage.pdfUploads),
        limit: limits.pdfUploads,
      };
    case "quiz":
      return {
        allowed: canGenerateQuiz,
        remaining: remainingOf(limits.quizGenerations, usage.quizGenerations),
        limit: limits.quizGenerations,
      };
    case "chat":
      return {
        allowed: canUseAIChat,
        remaining: remainingOf(limits.aiTutorMessages, usage.aiTutorMessages),
        limit: limits.aiTutorMessages,
      };
    default:
      return { allowed: true, remaining: -1, limit: -1 };
  }
}
