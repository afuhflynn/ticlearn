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
  paper3ExamLimit: number;
  paper3RetakeLimit: number;
  paper3AIExamMessages: number;
  canViewCorrectAnswers: boolean;
  canAccessPaper3AI: boolean;
  canShareResults: boolean;
}

interface Usage {
  pdfUploads: number;
  quizGenerations: number;
  aiTutorMessages: number;
  paper3ExamsUsed: number;
  paper3RetakesUsed: number;
}

interface ChatDailyUsage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  resetsInSeconds: number;
}

interface Paper3Usage {
  examsUsed: number;
  examsLimit: number;
  retakesUsed: number;
  retakesLimit: number;
  remaining: number;
  canRetake: boolean;
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
  canTakePaper3Exam: boolean;
  canRetakePaper3Exam: boolean;
  canViewPaper3CorrectAnswers: boolean;
  canUsePaper3AI: boolean;
  paper3AIExamMessages: number;
  paper3AIExamMessagesUsed: number;
  canSharePaper3Results: boolean;
  chatDailyUsage: ChatDailyUsage | null;
  paper3Usage: Paper3Usage | null;
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

  const displayPlan = isPending && data?.previousPlan ? data.previousPlan : data?.plan || "FREE";

  const defaultLimits: PlanLimits = {
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

  const result: UseUsageResult = {
    plan: displayPlan,
    status: currentStatus,
    previousPlan: data?.previousPlan || null,
    limits: {
      ...defaultLimits,
      ...(data?.limits ?? {}),
    } as PlanLimits,
    usage: {
      pdfUploads: data?.usage?.pdfUploads ?? 0,
      quizGenerations: data?.usage?.quizGenerations ?? 0,
      aiTutorMessages: data?.usage?.aiTutorMessages ?? 0,
      paper3ExamsUsed: data?.usage?.paper3ExamsUsed ?? 0,
      paper3RetakesUsed: data?.usage?.paper3RetakesUsed ?? 0,
    },
    canUpload: data?.canUpload ?? true,
    canGenerateQuiz: data?.canGenerateQuiz ?? true,
    canUseAIChat: data?.canUseAIChat ?? true,
    canAccessCommunity: data?.limits?.canAccessCommunity ?? false,
    canAccessLeaderboard: data?.limits?.canAccessLeaderboard ?? false,
    canAccessGCE: data?.limits?.canAccessGCE ?? false,
    canTakePaper3Exam: data?.canTakePaper3Exam ?? true,
    canRetakePaper3Exam: data?.canRetakePaper3Exam ?? false,
    canViewPaper3CorrectAnswers: data?.limits?.canViewCorrectAnswers ?? false,
    canUsePaper3AI: data?.limits?.canAccessPaper3AI ?? false,
    paper3AIExamMessages: data?.limits?.paper3AIExamMessages ?? 4,
    paper3AIExamMessagesUsed: 0,
    canSharePaper3Results: data?.limits?.canShareResults ?? false,
    chatDailyUsage: data?.chatDailyUsage ?? null,
    paper3Usage: data?.paper3Usage ?? null,
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
    | "upload"
    | "paper3"
    | "paper3Retake"
    | "paper3AI"
    | "paper3CorrectAnswers"
    | "paper3Share",
): boolean {
  const {
    canAccessCommunity,
    canAccessLeaderboard,
    canAccessGCE,
    isPaid,
    isPending,
    canUpload,
    canGenerateQuiz,
    canUseAIChat,
    canTakePaper3Exam,
    canRetakePaper3Exam,
    canViewPaper3CorrectAnswers,
    canUsePaper3AI,
    canSharePaper3Results,
  } = useUsage();

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
      return canUpload || isPending;
    case "paper3":
      return canTakePaper3Exam || isPending;
    case "paper3Retake":
      return canRetakePaper3Exam || isPending;
    case "paper3AI":
      return canUsePaper3AI || isPending;
    case "paper3CorrectAnswers":
      return canViewPaper3CorrectAnswers || isPending;
    case "paper3Share":
      return canSharePaper3Results || isPending;
    default:
      return false;
  }
}

export function useCheckLimit(feature: "upload" | "quiz" | "chat" | "paper3Exam"): {
  allowed: boolean;
  remaining: number;
  limit: number;
} {
  const { limits, usage, canUpload, canGenerateQuiz, canUseAIChat, canTakePaper3Exam, paper3Usage } = useUsage();

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
    case "paper3Exam": {
      const limit = limits.paper3ExamLimit;
      const used = usage.paper3ExamsUsed;
      const remaining = limit === -1 ? -1 : Math.max(0, limit - used);
      return { allowed: canTakePaper3Exam, remaining, limit };
    }
    default:
      return { allowed: true, remaining: -1, limit: -1 };
  }
}