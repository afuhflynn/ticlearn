"use client";

import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { ArrowLeft, GripVertical, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  useDeletePaper3Mock,
  usePaper3Mock,
  usePaper3Questions,
  useUpdatePaper3Mock,
} from "@/hooks";

export default function EditMockPage() {
  const params = useParams<{ mockId: string }>();
  const mockId = params?.mockId ?? "";

  if (!mockId) return null;

  return <EditMockInner />;
}

function EditMockInner() {
  const params = useParams<{ mockId: string }>();
  const mockId = params?.mockId ?? "";
  const router = useRouter();
  const { data, isLoading: loadingMock } = usePaper3Mock(mockId);
  const updateMock = useUpdatePaper3Mock();
  const deleteMock = useDeletePaper3Mock();
  const [deleting, setDeleting] = useState(false);

  const mock = data?.mock;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<"ICT" | "COMPUTER_SCIENCE">("ICT");
  const [focusCategory, setFocusCategory] = useState<
    "MIXED" | "DATABASE" | "SPREADSHEET" | "PROGRAMMING" | "WEB_PROGRAMMING"
  >("MIXED");
  const [timeLimit, setTimeLimit] = useState(60);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [moduleId, setModuleId] = useState<string>("");
  const [visibleToAllStudents, setVisibleToAllStudents] = useState(true);
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [showBank, setShowBank] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: questionsData } = usePaper3Questions({
    status: "APPROVED",
    category: focusCategory === "MIXED" ? "" : focusCategory,
  });

  useEffect(() => {
    fetch("/api/admin/paper3/modules")
      .then((res) => res.json())
      .then((data: { modules?: { id: string; title: string }[] }) => {
        setModules(data.modules?.map((m) => ({ id: m.id, title: m.title })) ?? []);
      })
      .catch(() => {});
  }, []);

  const approvedQuestions = useMemo(() => {
    return (
      questionsData?.questions?.filter(
        (q: { status: string }) => q.status === "APPROVED",
      ) ?? []
    );
  }, [questionsData]);

  if (loadingMock) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!mock) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Mock not found.
      </div>
    );
  }

  if (!initialized) {
    setTitle(mock.title);
    setDescription(mock.description || "");
    setSubject(mock.subject);
    setFocusCategory(mock.focusCategory);
    setTimeLimit(mock.timeLimit);
    setStatus(mock.status);
    setQuestionIds(mock.questions.map((q: { questionId: string }) => q.questionId));
    setModuleId(
      (mock as { moduleId?: string | null }).moduleId ||
        (mock as { module?: { id: string } | null }).module?.id ||
        "",
    );
    setVisibleToAllStudents(
      (mock as { visibleToAllStudents?: boolean }).visibleToAllStudents ??
        true,
    );
    setInitialized(true);
    return null;
  }

  const currentQuestions = questionIds
    .map((id) => approvedQuestions.find((q: { id: string }) => q.id === id))
    .filter(Boolean);

  const bankQuestions = approvedQuestions.filter(
    (q: { id: string }) => !questionIds.includes(q.id),
  );

  const totalMarks = questionIds.reduce((sum, id) => {
    const q = approvedQuestions.find((q: { id: string }) => q.id === id);
    return sum + (q?.marks ?? 0);
  }, 0);

  const handleSave = async () => {
    await updateMock.mutateAsync({
      id: mockId,
      title,
      description: description || undefined,
      subject,
      focusCategory,
      timeLimit,
      status,
      totalMarks,
      questionIds,
      moduleId: moduleId || null,
      visibleToAllStudents,
    });
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this mock exam? This cannot be undone.")) return;
    setDeleting(true);
    await deleteMock.mutateAsync(mockId);
    router.push("/admin/paper3/mocks");
  };

  const onDragEnd = (result: { source: { index: number }; destination: { index: number } | null }) => {
    if (!result.destination) return;
    const items = Array.from(questionIds);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setQuestionIds(items);
  };

  const addQuestion = (id: string) => {
    setQuestionIds((prev) => [...prev, id]);
  };

  const removeQuestion = (id: string) => {
    setQuestionIds((prev) => prev.filter((qid) => qid !== id));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4 md:py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/paper3/mocks"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold md:text-2xl">Edit Mock Exam</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Subject</label>
            <select
              value={subject}
              onChange={(e) =>
                setSubject(e.target.value as "ICT" | "COMPUTER_SCIENCE")
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="ICT">ICT</option>
              <option value="COMPUTER_SCIENCE">Computer Science</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Focus Category</label>
            <select
              value={focusCategory}
              onChange={(e) =>
                setFocusCategory(
                  e.target.value as typeof focusCategory,
                )
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="MIXED">Mixed</option>
              <option value="DATABASE">Database</option>
              <option value="SPREADSHEET">Spreadsheet</option>
              <option value="PROGRAMMING">Programming</option>
              <option value="WEB_PROGRAMMING">Web Programming</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Time Limit (minutes)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              min={30}
              max={180}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as typeof status)
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Draft = visible only in admin until you publish. AI-generated mocks
              start as draft.
            </p>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={visibleToAllStudents}
                onChange={(e) => setVisibleToAllStudents(e.target.checked)}
                className="rounded border"
              />
              Visible to students (catalog)
            </label>
            <p className="text-xs text-muted-foreground">
              Off hides the mock unless it belongs to a published module marked
              visible to all.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Module (optional)</label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">
              Questions ({questionIds.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Total marks: {totalMarks}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBank(!showBank)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Question Bank
          </button>
        </div>

        {showBank && (
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">Approved Questions</h3>
              <button
                type="button"
                onClick={() => setShowBank(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {bankQuestions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No more questions available.
                </p>
              ) : (
                bankQuestions.map((q: { id: string; title: string; marks: number; taskType: string }) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => addQuestion(q.id)}
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">{q.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {q.marks} marks | {q.taskType}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {currentQuestions.map(
                  (q: { id: string; title: string; marks: number; taskType: string } | undefined, index: number) => {
                    if (!q) return null;
                    return (
                      <Draggable key={q.id} draggableId={q.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab text-muted-foreground"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="flex-1 text-sm font-medium">
                              {q.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {q.marks} marks | {q.taskType}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeQuestion(q.id)}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  },
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="flex gap-3 border-t pt-6">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || deleteMock.isPending}
          className="rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {deleteMock.isPending ? "Deleting..." : "Delete Mock"}
        </button>
        <div className="flex-1" />
        <Link
          href="/admin/paper3/mocks"
          className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={updateMock.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMock.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  );
}
