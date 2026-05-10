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
  paper3ExamLimit: number;
  paper3RetakeLimit: number;
  paper3AIExamMessages: number;
  canViewCorrectAnswers: boolean;
  canAccessPaper3AI: boolean;
  canShareResults: boolean;
}

const FREE_LIMITS = {
  pdfUploads: 2,
  quizGenerations: 4,
  aiTutorMessages: 8,
  canAccessCommunity: false,
  canAccessLeaderboard: false,
  canAccessGCE: false,
  paper3ExamLimit: 1,
  paper3RetakeLimit: 0,
  paper3AIExamMessages: 4,
  canViewCorrectAnswers: false,
  canAccessPaper3AI: false,
  canShareResults: false,
};

const PREMIUM_LIMITS = {
  pdfUploads: -1,
  quizGenerations: -1,
  aiTutorMessages: -1,
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
  paper3ExamLimit: -1,
  paper3RetakeLimit: -1,
  paper3AIExamMessages: -1,
  canViewCorrectAnswers: true,
  canAccessPaper3AI: true,
  canShareResults: true,
};

const STARTER_LIMITS = {
  pdfUploads: 10,
  quizGenerations: 20,
  aiTutorMessages: -1,
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
  paper3ExamLimit: 3,
  paper3RetakeLimit: 0,
  paper3AIExamMessages: 4,
  canViewCorrectAnswers: false,
  canAccessPaper3AI: false,
  canShareResults: false,
};

const STANDARD_LIMITS = {
  pdfUploads: 30,
  quizGenerations: 60,
  aiTutorMessages: -1,
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
  paper3ExamLimit: 5,
  paper3RetakeLimit: 0,
  paper3AIExamMessages: -1,
  canViewCorrectAnswers: true,
  canAccessPaper3AI: false,
  canShareResults: true,
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
    paper3ExamLimit: limits.paper3ExamLimit,
    paper3RetakeLimit: limits.paper3RetakeLimit,
    paper3AIExamMessages: limits.paper3AIExamMessages,
    canViewCorrectAnswers: limits.canViewCorrectAnswers,
    canAccessPaper3AI: limits.canAccessPaper3AI,
    canShareResults: limits.canShareResults,
  };
}