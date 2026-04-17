import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface PlanLimits {
  pdfUploads: number;
  quizGenerations: number;
  aiTutorMessages: number;
  canAccessCommunity: boolean;
  canAccessLeaderboard: boolean;
  canAccessGCE: boolean;
}

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
  canUpload: boolean;
  canGenerateQuiz: boolean;
  canUseAIChat: boolean;
  canAccessCommunity: boolean;
  canAccessLeaderboard: boolean;
  canAccessGCE: boolean;
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
    staleTime: 1000 * 60 * 2,
  });

  const currentStatus = data?.status || "NONE";
  const isPending = currentStatus === "PENDING";
  const isPaid = currentStatus === "ACTIVE" && data?.plan !== "FREE";

  // Pending users keep access from their previous plan
  const displayPlan =
    isPending && data?.previousPlan ? data.previousPlan : data?.plan || "FREE";

  const result: UseUsageResult = {
    plan: displayPlan,
    status: currentStatus,
    previousPlan: data?.previousPlan || null,
    limits: data?.limits || {
      pdfUploads: 2,
      quizGenerations: 4,
      aiTutorMessages: 8,
      canAccessCommunity: false,
      canAccessLeaderboard: false,
      canAccessGCE: false,
    },
    usage: data?.usage || {
      pdfUploads: 0,
      quizGenerations: 0,
      aiTutorMessages: 0,
    },
    canUpload: data?.canUpload ?? true,
    canGenerateQuiz: data?.canGenerateQuiz ?? true,
    canUseAIChat: data?.canUseAIChat ?? true,
    canAccessCommunity: data?.limits?.canAccessCommunity ?? false,
    canAccessLeaderboard: data?.limits?.canAccessLeaderboard ?? false,
    canAccessGCE: data?.limits?.canAccessGCE ?? false,
    chatDailyUsage: data?.chatDailyUsage ?? null,
    isLoading,
    isPaid,
    isPending,
    refetch,
  };

  return result;
}

export function useCanAccess(
  feature:
    | "community"
    | "leaderboard"
    | "gce"
    | "affiliate"
    | "chat"
    | "quiz"
    | "upload",
): boolean {
  const {
    canAccessCommunity,
    canAccessLeaderboard,
    canAccessGCE,
    isPaid,
    isPending,
    canGenerateQuiz,
    canUseAIChat,
  } = useUsage();

  // Pending users retain access from their previous plan
  const effectivePaid = isPaid || isPending;

  switch (feature) {
    case "community":
      return canAccessCommunity || isPending;
    case "leaderboard":
      return canAccessLeaderboard || isPending;
    case "gce":
      return canAccessGCE || isPending;
    case "affiliate":
      return effectivePaid;
    case "chat":
      return canUseAIChat || isPending;
    case "quiz":
      return canGenerateQuiz || isPending;
    case "upload":
      return true;
    default:
      return false;
  }
}

export function useCheckLimit(feature: "upload" | "quiz" | "chat"): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  const { limits, usage, canUpload, canGenerateQuiz, canUseAIChat } =
    useUsage();

  switch (feature) {
    case "upload": {
      const limit = limits.pdfUploads;
      const used = usage.pdfUploads;
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
      return { allowed: canUpload, remaining, limit };
    }
    case "quiz": {
      const limit = limits.quizGenerations;
      const used = usage.quizGenerations;
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
      return { allowed: canGenerateQuiz, remaining, limit };
    }
    case "chat": {
      const limit = limits.aiTutorMessages;
      const used = usage.aiTutorMessages;
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
      return { allowed: canUseAIChat, remaining, limit };
    }
    default:
      return { allowed: true, remaining: -1, limit: -1 };
  }
}
