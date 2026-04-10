import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api-client";

interface UsePlanResult {
  plan: string;
  isLoading: boolean;
  isPaid: boolean;
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
  const { data: subscription, isLoading } = useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async () => {
      try {
        const result = await api.queries.subscription();
        return result;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const planName = subscription?.subscription?.plan || "FREE";
  const isPaid = planName !== "FREE";

  const limits = PLAN_MAP[planName] || FREE_LIMITS;

  return {
    plan: planName,
    isLoading,
    isPaid,
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
  const { canAccessCommunity, canAccessLeaderboard, canAccessGCE, isPaid } =
    usePlan();

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
