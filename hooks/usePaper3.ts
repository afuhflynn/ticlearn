import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { QuestionType } from "@/types";
import { Paper3Question } from "@/lib/generated/prisma/client";
import { useRouter } from "next/navigation";

type SourceMutationPayload = {
  title: string;
  year: number;
  subject: "ICT" | "COMPUTER_SCIENCE";
  section: "A" | "B";
  category: "SPREADSHEET" | "DATABASE" | "PROGRAMMING";
  paperType: "QUESTION_PAPER" | "MARKING_SCHEME";
  sourceType: "OFFICIAL" | "TEACHER" | "RECONSTRUCTED";
  fileUrl: string;
  uploadthingKey?: string;
  fileName: string;
};

type QuestionUpdatePayload = {
  id: string;
  title?: string;
  content?: string;
  contentMd?: string;
  marks?: number;
  expectedAnswer?: string;
  markingBreakdown?:
    | string
    | Array<{
        criteria: string;
        marks: number;
        description: string;
      }>;
  explanation?: string;
  concepts?: string[];
  visualElements?: unknown;
  taskItems?: unknown;
};

type MockCreatePayload = {
  title: string;
  description?: string;
  subject: "ICT" | "COMPUTER_SCIENCE";
  focusCategory?:
    | "MIXED"
    | "DATABASE"
    | "SPREADSHEET"
    | "PROGRAMMING"
    | "WEB_PROGRAMMING";
  timeLimit: number;
  questionIds: string[];
};

type MockUpdatePayload = {
  id: string;
  title?: string;
  description?: string;
  subject?: "ICT" | "COMPUTER_SCIENCE";
  focusCategory?:
    | "MIXED"
    | "DATABASE"
    | "SPREADSHEET"
    | "PROGRAMMING"
    | "WEB_PROGRAMMING";
  timeLimit?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  totalMarks?: number;
  questionIds?: string[];
  moduleId?: string | null;
  visibleToAllStudents?: boolean;
};

type MockGeneratePayload = {
  subject: "ICT" | "COMPUTER_SCIENCE";
  section?: "A" | "B";
  focusCategory?:
    | "MIXED"
    | "DATABASE"
    | "SPREADSHEET"
    | "PROGRAMMING"
    | "WEB_PROGRAMMING";
  title: string;
  description?: string;
  timeLimit: number;
  questionCount: number;
  markDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
};

type AnswerCheckPayload = {
  questionId: string;
  userAnswer: string;
};

type MockStartPayload = {
  mockId: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _Paper3StatsData {
  questionsAttempted: number;
  questionsCorrect: number;
  mockExamsTaken: number;
  avgScore: number;
  weakConcepts: string[];
  strongConcepts: string[];
  readinessScore: number;
}

function getPaper3Sources() {
  return fetch("/api/paper3/sources", { credentials: "include" }).then(
    (res) => {
      if (!res.ok) throw new Error("Failed to fetch sources");
      return res.json();
    },
  );
}

function getPaper3Source(id: string) {
  return fetch(`/api/paper3/sources/${id}`, { credentials: "include" }).then(
    (res) => {
      if (!res.ok) throw new Error("Failed to fetch source");
      return res.json();
    },
  );
}

function getPaper3Questions(params?: {
  status?: string;
  section?: string;
  taskType?: string;
  category?: string;
  source?: string;
  subject?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.section) searchParams.set("section", params.section);
  if (params?.taskType) searchParams.set("taskType", params.taskType);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.source) searchParams.set("source", params.source);
  if (params?.subject) searchParams.set("subject", params.subject);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));

  return fetch(`/api/paper3/questions?${searchParams.toString()}`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch questions");
    return res.json();
  });
}

function getPaper3Question(id: string) {
  return fetch(`/api/paper3/questions/${id}`, { credentials: "include" }).then(
    (res) => {
      if (!res.ok) throw new Error("Failed to fetch question");
      return res.json();
    },
  );
}

function createPaper3Source(data: SourceMutationPayload) {
  return fetch("/api/paper3/sources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to create source");
    return res.json();
  });
}

function deletePaper3Source(id: string) {
  return fetch(`/api/paper3/sources/${id}`, {
    method: "DELETE",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to delete source");
    return res.json();
  });
}

function processPaper3Source(sourceId: string) {
  console.log("[Hook] Processing source:", sourceId);
  const url = `/api/paper3/sources/${sourceId}`;
  console.log("[Hook] Full URL:", url);
  console.log("[Hook] Current origin:", window?.location?.origin);

  return fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  }).then(async (res) => {
    const text = await res.text();
    console.log("[Hook] Response status:", res.status, "body:", text);
    if (!res.ok) {
      try {
        const err = JSON.parse(text);
        throw new Error(err.error || `Failed: ${res.status}`);
      } catch {
        throw new Error(text || `Failed to process source: ${res.status}`);
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return { success: true };
    }
  });
}

function updatePaper3Question(data: QuestionUpdatePayload) {
  return fetch(`/api/paper3/questions/${data.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to update question");
    return res.json();
  });
}

function approvePaper3Question(id: string) {
  return fetch(`/api/paper3/questions/${id}/approve`, {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to approve question");
    return res.json();
  });
}

function rejectPaper3Question(id: string, rejectionReason?: string) {
  return fetch(`/api/paper3/questions/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ rejectionReason }),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to reject question");
    return res.json();
  });
}

function getPaper3Mocks(params?: {
  subject?: string;
  status?: string;
  focusCategory?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.subject) searchParams.set("subject", params.subject);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.focusCategory) {
    searchParams.set("focusCategory", params.focusCategory);
  }

  return fetch(`/api/paper3/mocks?${searchParams.toString()}`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch mocks");
    return res.json();
  });
}

function getPaper3Mock(id: string) {
  return fetch(`/api/paper3/mocks/${id}`, { credentials: "include" }).then(
    (res) => {
      if (!res.ok) throw new Error("Failed to fetch mock");
      return res.json();
    },
  );
}

function createPaper3Mock(data: MockCreatePayload) {
  return fetch("/api/paper3/mocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to create mock");
    return res.json();
  });
}

function generatePaper3Mock(data: MockGeneratePayload) {
  return fetch("/api/paper3/mocks/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to start mock generation");
    return res.json();
  });
}

function deletePaper3Mock(id: string) {
  return fetch(`/api/paper3/mocks/${id}`, {
    method: "DELETE",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to delete mock");
    return res.json();
  });
}

function updatePaper3Mock(data: MockUpdatePayload) {
  const { id, ...body } = data;
  return fetch(`/api/paper3/mocks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to update mock");
    return res.json();
  });
}

function publishPaper3Mock(id: string) {
  return fetch(`/api/paper3/mocks/${id}/publish`, {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to publish mock");
    return res.json();
  });
}

function getPaper3PracticeQuestions(params?: {
  section?: string;
  taskType?: string;
  category?: string;
  concepts?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.section) searchParams.set("section", params.section);
  if (params?.taskType) searchParams.set("taskType", params.taskType);
  if (params?.category) searchParams.set("category", params.category);
  if (params?.concepts) searchParams.set("concepts", params.concepts);
  if (params?.limit) searchParams.set("limit", String(params.limit));

  return fetch(`/api/paper3/practice?${searchParams.toString()}`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch practice questions");
    return res.json();
  });
}

function getPaper3PracticeQuestion(id: string) {
  return fetch(`/api/paper3/practice/${id}`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch question");
    return res.json();
  });
}

function checkPaper3Answer(data: AnswerCheckPayload) {
  return fetch(`/api/paper3/practice/${data.questionId}/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userAnswer: data.userAnswer }),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to check answer");
    return res.json();
  });
}

function startPaper3MockExam(data: MockStartPayload) {
  return fetch(`/api/paper3/mocks/${data.mockId}/start`, {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to start exam");
    return res.json();
  });
}

function submitPaper3MockExam(data: {
  mockId: string;
  attemptId: string;
  answers: Record<string, string>;
  timeTaken: number;
}) {
  return fetch(`/api/paper3/mocks/${data.mockId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      attemptId: data.attemptId,
      answers: data.answers,
      timeTaken: data.timeTaken,
    }),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to submit exam");
    return res.json();
  });
}

function getPaper3MockAttempt(attemptId: string) {
  return fetch(`/api/paper3/attempts/${attemptId}`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch attempt");
    return res.json();
  });
}

function getPaper3MyAttempts(page = 1, limit = 20) {
  return fetch(`/api/paper3/attempts?page=${page}&limit=${limit}`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch attempts");
    return res.json();
  });
}

function getPaper3Stats() {
  return fetch("/api/paper3/stats", { credentials: "include" }).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  });
}

function getPaper3Recommendations() {
  return fetch("/api/paper3/recommendations", { credentials: "include" }).then(
    (res) => {
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
  );
}

function getPaper3Leaderboard(mockId: string, page = 1, limit = 20) {
  return fetch(
    `/api/paper3/leaderboard/${mockId}?page=${page}&limit=${limit}`,
    { credentials: "include" },
  ).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch leaderboard");
    return res.json();
  });
}

export function usePaper3Sources() {
  return useQuery({
    queryKey: queryKeys.paper3Sources,
    queryFn: getPaper3Sources,
    refetchInterval: (query) => {
      const sources = query.state.data?.sources ?? [];
      const shouldPoll = sources.some(
        (source: { status: string }) =>
          source.status === "PENDING" || source.status === "PROCESSING",
      );

      return shouldPoll ? 3000 : false;
    },
  });
}

export function usePaper3Source(id: string) {
  return useQuery({
    queryKey: queryKeys.paper3Source(id),
    queryFn: () => getPaper3Source(id),
    enabled: !!id,
  });
}

export function usePaper3Questions(params?: {
  status?: string;
  section?: string;
  taskType?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: [
      ...queryKeys.paper3Questions,
      params?.status,
      params?.section,
      params?.taskType,
      params?.category,
    ],
    queryFn: () => getPaper3Questions(params),
  });
}

export function usePaper3Question(id: string) {
  return useQuery({
    queryKey: queryKeys.paper3Question(id),
    queryFn: () => getPaper3Question(id),
    enabled: !!id,
  });
}

export function useUploadPaper3Source() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPaper3Source,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Sources });
      toast.success("Source uploaded! Processing started.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePaper3Source() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePaper3Source,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Sources });
      toast.success("Source deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useProcessPaper3Source() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: processPaper3Source,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Sources });
      toast.success("Processing started");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePaper3Question() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePaper3Question,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Questions });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paper3Question(variables.id),
      });
      toast.success("Question updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useApprovePaper3Question() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approvePaper3Question,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Questions });
      toast.success("Question approved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRejectPaper3Question() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      rejectionReason,
    }: {
      id: string;
      rejectionReason?: string;
    }) => rejectPaper3Question(id, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Questions });
      toast.success("Question rejected");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePaper3Mocks(params?: {
  subject?: string;
  status?: string;
  focusCategory?: string;
}) {
  return useQuery({
    queryKey: [
      ...queryKeys.paper3Mocks,
      params?.subject,
      params?.status,
      params?.focusCategory,
    ],
    queryFn: () => getPaper3Mocks(params),
  });
}

export function usePaper3Mock(id: string) {
  return useQuery({
    queryKey: queryKeys.paper3Mock(id),
    queryFn: () => getPaper3Mock(id),
    enabled: !!id,
  });
}

export function useCreatePaper3Mock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPaper3Mock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Mocks });
      toast.success("Mock exam created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGeneratePaper3Mock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generatePaper3Mock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Mocks });
      toast.success("Mock generation started");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePaper3Mock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePaper3Mock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Mocks });
      toast.success("Mock exam deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePaper3Mock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePaper3Mock,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Mocks });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paper3Mock(variables.id),
      });
      toast.success("Mock exam updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePublishPaper3Mock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishPaper3Mock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Mocks });
      toast.success("Mock exam published");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePaper3PracticeQuestions(params?: {
  section?: string;
  taskType?: string;
  category?: string;
  concepts?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: [
      ...queryKeys.paper3Practice,
      params?.section,
      params?.taskType,
      params?.category,
    ],
    queryFn: () => getPaper3PracticeQuestions(params),
  });
}

export function usePaper3PracticeQuestion(id: string) {
  return useQuery({
    queryKey: queryKeys.paper3PracticeQuestion(id),
    queryFn: () => getPaper3PracticeQuestion(id),
    enabled: !!id,
  });
}

export function useCheckPaper3Answer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkPaper3Answer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Stats });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paper3Recommendations,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useStartPaper3MockExam() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: startPaper3MockExam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3MyAttempts });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      router.push("/dashboard");
    },
  });
}

export function useSubmitPaper3MockExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitPaper3MockExam,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3MyAttempts });
      queryClient.invalidateQueries({ queryKey: queryKeys.paper3Stats });
      queryClient.invalidateQueries({
        queryKey: queryKeys.paper3Leaderboard(variables.mockId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

function viewPaper3CorrectAnswer(attemptId: string) {
  return fetch(`/api/paper3/attempts/${attemptId}/view-answer`, {
    method: "POST",
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to view correct answer");
    return res.json().then((data) => ({ ...data, attemptId }));
  });
}

export function useViewPaper3CorrectAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: viewPaper3CorrectAnswer,
    onSuccess: (_data, variables) => {
      toast.success("Correct answers revealed");
      queryClient.invalidateQueries({
        // @note Can be handled better later
        queryKey: queryKeys.paper3MockAttempt(
          (variables as unknown as { attemptId: string }).attemptId,
        ),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePaper3MockAttempt(attemptId: string) {
  return useQuery({
    queryKey: queryKeys.paper3MockAttempt(attemptId),
    queryFn: () => getPaper3MockAttempt(attemptId),
    enabled: !!attemptId,
  });
}

export function usePaper3MyAttempts(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...queryKeys.paper3MyAttempts, page, limit],
    queryFn: () => getPaper3MyAttempts(page, limit),
  });
}

export function usePaper3Stats() {
  return useQuery({
    queryKey: queryKeys.paper3Stats,
    queryFn: getPaper3Stats,
  });
}

export function usePaper3Recommendations() {
  return useQuery({
    queryKey: queryKeys.paper3Recommendations,
    queryFn: getPaper3Recommendations,
  });
}

export function usePaper3Leaderboard(mockId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: [...queryKeys.paper3Leaderboard(mockId), page, limit],
    queryFn: () => getPaper3Leaderboard(mockId, page, limit),
    enabled: !!mockId,
  });
}

function getGlobalPaper3Leaderboard(page = 1, limit = 20) {
  return fetch(
    `/api/paper3/leaderboard/global?page=${page}&limit=${limit}`,
    { credentials: "include" },
  ).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch global leaderboard");
    return res.json();
  });
}

export function useGlobalPaper3Leaderboard(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["paper3", "globalLeaderboard", page, limit],
    queryFn: () => getGlobalPaper3Leaderboard(page, limit),
  });
}

function getPaper3QuestionLeaderboard(
  questionId: string,
  page = 1,
  limit = 20,
) {
  return fetch(
    `/api/paper3/leaderboard/question/${questionId}?page=${page}&limit=${limit}`,
    { credentials: "include" },
  ).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch question leaderboard");
    return res.json();
  });
}

export function usePaper3QuestionLeaderboard(
  questionId: string,
  page = 1,
  limit = 20,
) {
  return useQuery({
    queryKey: ["paper3", "questionLeaderboard", questionId, page, limit],
    queryFn: () => getPaper3QuestionLeaderboard(questionId, page, limit),
    enabled: !!questionId,
  });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function sendPaper3ChatMessage(
  attemptId: string,
  questionId: string | null,
  messages: ChatMessage[],
) {
  return fetch("/api/paper3/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ attemptId, questionId, messages }),
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to get chat response");
    return res.json();
  });
}

export function usePaper3Chat() {
  return useMutation({
    mutationFn: ({
      attemptId,
      questionId,
      messages,
    }: {
      attemptId: string;
      questionId: string | null;
      messages: ChatMessage[];
    }) => sendPaper3ChatMessage(attemptId, questionId, messages),
  });
}
