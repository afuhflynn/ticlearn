import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api-client";

interface UsePlanResult {
  plan: string;
  status: string;
  previousPlan: string | null;
  isLoading: boolean;
  isPaid: boolean;
  isPending: boolean;
  canUpload: boolean;
  uploadLimit: number;
  canAccessCommunity: boolean;
  canAccessLeaderboard: boolean;
  canAccessGCE: boolean;
  aiTutorLimit: number;
  quizLimit: number;
}

const FREE_LIMITS = {
  pdfUploads: 2,
  quizGenerations: 4,
  aiTutorMessages: 8,
  canAccessCommunity: false,
  canAccessLeaderboard: false,
  canAccessGCE: false,
};

const PREMIUM_LIMITS = {
  pdfUploads: -1,
  quizGenerations: -1,
  aiTutorMessages: -1,
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
};

const STARTER_LIMITS = {
  pdfUploads: 10,
  quizGenerations: 20,
  aiTutorMessages: -1,
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
};

const STANDARD_LIMITS = {
  pdfUploads: 30,
  quizGenerations: 60,
  aiTutorMessages: -1,
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
};

const PLAN_MAP: Record<string, typeof PREMIUM_LIMITS> = {
  PREMIUM: PREMIUM_LIMITS,
  STARTER: STARTER_LIMITS,
  STANDARD: STANDARD_LIMITS,
};

export function usePlan(): UsePlanResult {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async () => {
      const result = await api.queries.subscription();
      return result;
    },
    staleTime: 1000 * 60 * 5,
  });

  const subscription = data?.subscription;
  const previousPlan = data?.previousPlan ?? null;
  const planName = subscription?.plan || "FREE";
  const status = subscription?.status || "NONE";

  // Only paid if subscription is ACTIVE and not FREE
  const isPaid = status === "ACTIVE" && planName !== "FREE" || false;
  const isPending = status === "PENDING" || (previousPlan && !subscription) || false;

  const displayPlan = isPending && previousPlan ? previousPlan : planName;
  const limits = PLAN_MAP[displayPlan] || FREE_LIMITS;

  return {
    plan: displayPlan,
    status,
    previousPlan,
    isLoading,
    isPaid,
    isPending,
    canUpload: true,
    uploadLimit: limits.pdfUploads,
    canAccessCommunity: limits.canAccessCommunity,
    canAccessLeaderboard: limits.canAccessLeaderboard,
    canAccessGCE: limits.canAccessGCE,
    aiTutorLimit: limits.aiTutorMessages,
    quizLimit: limits.quizGenerations,
  };
}

export function useCanAccess(
  feature: "community" | "leaderboard" | "gce" | "affiliate",
): boolean {
  const {
    canAccessCommunity,
    canAccessLeaderboard,
    canAccessGCE,
    isPaid,
    isPending,
  } = usePlan();

  // Pending users still have access from their previous plan
  if (isPending) {
    switch (feature) {
      case "community":
        return canAccessCommunity;
      case "leaderboard":
        return canAccessLeaderboard;
      case "gce":
        return canAccessGCE;
      case "affiliate":
        return isPaid;
      default:
        return false;
    }
  }

  switch (feature) {
    case "community":
      return canAccessCommunity;
    case "leaderboard":
      return canAccessLeaderboard;
    case "gce":
      return canAccessGCE;
    case "affiliate":
      return isPaid;
    default:
      return false;
  }
}
