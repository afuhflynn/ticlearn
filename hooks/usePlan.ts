import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
  canAccessCommunity: boolean;
  canAccessLeaderboard: boolean;
  canAccessGCE: boolean;
  aiTutorLimit: number;
  quizLimit: number;
  mockLimitPerWeek: number;
  aiSolvesPerDay: number;
  canViewCorrectAnswers: boolean;
  canAccessAdvancedReadiness: boolean;
  paper3ExamLimit: number;
  paper3RetakeLimit: number;
  paper3AIExamMessages: number;
  canAccessPaper3AI: boolean;
  canShareResults: boolean;
}

const FREE_LIMITS = {
  pdfUploads: 2,
  quizGenerations: 4,
  aiTutorMessages: 8,
  canAccessCommunity: false,
  canAccessLeaderboard: true,
  canAccessGCE: true,
  mockLimitPerWeek: 1,
  aiSolvesPerDay: 10,
  canViewCorrectAnswers: false,
  canAccessAdvancedReadiness: false,
  paper3ExamLimit: 1,
  paper3RetakeLimit: 0,
  paper3AIExamMessages: 4,
  canAccessPaper3AI: false,
  canShareResults: false,
};

const PRO_LIMITS = {
  pdfUploads: -1,
  quizGenerations: -1,
  aiTutorMessages: -1,
  canAccessCommunity: true,
  canAccessLeaderboard: true,
  canAccessGCE: true,
  mockLimitPerWeek: -1,
  aiSolvesPerDay: -1,
  canViewCorrectAnswers: true,
  canAccessAdvancedReadiness: true,
  paper3ExamLimit: -1,
  paper3RetakeLimit: -1,
  paper3AIExamMessages: -1,
  canAccessPaper3AI: true,
  canShareResults: true,
};

const PLAN_MAP: Record<string, typeof PRO_LIMITS> = {
  PRO: PRO_LIMITS,
  PREMIUM: PRO_LIMITS,
  STANDARD: {
    pdfUploads: 30,
    quizGenerations: 60,
    aiTutorMessages: -1,
    canAccessCommunity: true,
    canAccessLeaderboard: true,
    canAccessGCE: true,
    mockLimitPerWeek: 3,
    aiSolvesPerDay: 30,
    canViewCorrectAnswers: true,
    canAccessAdvancedReadiness: false,
    paper3ExamLimit: -1,
    paper3RetakeLimit: 0,
    paper3AIExamMessages: -1,
    canAccessPaper3AI: true,
    canShareResults: true,
  },
  STARTER: {
    pdfUploads: 10,
    quizGenerations: 20,
    aiTutorMessages: 50,
    canAccessCommunity: true,
    canAccessLeaderboard: true,
    canAccessGCE: true,
    mockLimitPerWeek: 2,
    aiSolvesPerDay: 15,
    canViewCorrectAnswers: false,
    canAccessAdvancedReadiness: false,
    paper3ExamLimit: 3,
    paper3RetakeLimit: 0,
    paper3AIExamMessages: 4,
    canAccessPaper3AI: false,
    canShareResults: false,
  },
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

  const isPaid = (status === "ACTIVE" && planName !== "FREE") || false;
  const isPending =
    status === "PENDING" || (previousPlan && !subscription) || false;

  const displayPlan = isPending && previousPlan ? previousPlan : planName;
  const limits = PLAN_MAP[displayPlan] || FREE_LIMITS;

  return {
    plan: displayPlan,
    status,
    previousPlan,
    isLoading,
    isPaid,
    isPending,
    canUpload: limits.pdfUploads !== 0,
    uploadLimit: limits.pdfUploads,
    canAccessCommunity: limits.canAccessCommunity,
    canAccessLeaderboard: limits.canAccessLeaderboard,
    canAccessGCE: limits.canAccessGCE,
    aiTutorLimit: limits.aiTutorMessages,
    quizLimit: limits.quizGenerations,
    mockLimitPerWeek: limits.mockLimitPerWeek,
    aiSolvesPerDay: limits.aiSolvesPerDay,
    canViewCorrectAnswers: limits.canViewCorrectAnswers,
    canAccessAdvancedReadiness: limits.canAccessAdvancedReadiness,
    paper3ExamLimit: limits.paper3ExamLimit,
    paper3RetakeLimit: limits.paper3RetakeLimit,
    paper3AIExamMessages: limits.paper3AIExamMessages,
    canAccessPaper3AI: limits.canAccessPaper3AI,
    canShareResults: limits.canShareResults,
  };
}
