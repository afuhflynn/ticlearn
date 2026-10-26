"use client";

import {
  BookOpen,
  Coins,
  ExternalLink,
  FileText,
  FileType,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FileDrop } from "@/components/ui/file-drop";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingRegion, useLongWait } from "@/components/ui/pending-region";
import {
  ProcessProgress,
  ProgressLine,
} from "@/components/ui/process-progress";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  useCheckLimit,
  useCredits,
  useDeleteNote,
  useGenerateQuiz,
  useNotes,
  usePlan,
  useProcessNote,
  useUpdateNote,
  useUploadNote,
  useUsage,
} from "@/hooks";
import { useSession } from "@/lib/auth-client";
import { NOTE_STAGES } from "@/lib/note-stages";
import { useUploadThing } from "@/lib/uploadthing";
import { correctionsForKeys } from "@/nuqs";
import { uploadViewDefaults, uploadViewParsers } from "@/nuqs/upload";
import { NoteListSkeleton, UploadPageSkeleton } from "./upload-skeleton";

type QuizConfig = {
  noteId: string;
  questionCount: string;
  questionTypes: "MCQ" | "OPEN" | "MIXED";
  timed: boolean;
  timeLimit: string;
  isPublic: boolean;
};

const defaultQuizConfig = (noteId = ""): QuizConfig => ({
  noteId,
  questionCount: "10",
  questionTypes: "MIXED",
  timed: false,
  timeLimit: "15",
  isPublic: false,
});

const QUESTION_COUNTS = ["5", "10", "15", "20", "30", "40", "50", "60"];

function fileIcon(type: string) {
  if (type === "PDF") return FileText;
  if (type === "WORD") return FileType;
  return ImageIcon;
}

function fileTypeLabel(type: string) {
  if (type === "PDF") return "PDF";
  if (type === "WORD") return "Word";
  return "Image";
}

function statusVariant(status: string) {
  if (status === "READY") return "default" as const;
  if (status === "ERROR") return "destructive" as const;
  return "secondary" as const;
}

/**
 * A quiz is one model call, so the honest indicator is a plain line with a
 * time estimate and not a stage list. The line only appears once the wait
 * passes ten seconds, measured on the client's own clock.
 */
function QuizGeneratingLine() {
  const isLongWait = useLongWait(true);
  if (!isLongWait) {
    return (
      <p className="text-sm text-muted-foreground">
        The quiz is being written in the background.
      </p>
    );
  }
  return (
    <ProgressLine
      message="The quiz is still being written."
      estimate="It usually takes about a minute."
    />
  );
}

function UploadContent() {
  const {
    notes,
    isPending: notesPending,
    isRefreshing: notesRefreshing,
    isError: notesError,
    isOffline: notesOffline,
    refetch: refetchNotes,
  } = useNotes();
  const uploadNoteMutation = useUploadNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const processNoteMutation = useProcessNote();
  const generateQuizMutation = useGenerateQuiz();
  const { allowed: canUpload, remaining: uploadRemaining } =
    useCheckLimit("upload");
  const { creditCosts } = useUsage();
  const { data: creditsData } = useCredits();
  const { plan } = usePlan();

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  // The rename and quiz dialogs live in the URL as one modal name plus the
  // note id, so back steps out of a dialog and shared links reproduce it.
  // Titles and quiz setup stay local drafts.
  const [view, setView] = useQueryStates(
    {
      modal: uploadViewParsers.modal,
      selectedId: uploadViewParsers.selectedId,
    },
    { history: "push" },
  );
  const rawParams = useSearchParams();

  useEffect(() => {
    const patch = correctionsForKeys(
      rawParams,
      { modal: view.modal, selectedId: view.selectedId },
      uploadViewDefaults,
    );
    if (Object.keys(patch).length > 0) {
      setView(patch, { history: "replace" });
    }
  }, [rawParams, view.modal, view.selectedId, setView]);

  const dialogNote = notes.find((note) => note.id === view.selectedId) ?? null;
  const [editTitle, setEditTitle] = useState("");
  const [quizConfig, setQuizConfig] = useState<QuizConfig>(defaultQuizConfig());

  // Reseed the local drafts when the dialog row changes. A background refetch
  // must not clobber a draft the student is already typing.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${view.modal}:${dialogNote?.id ?? ""}`;
    if (dialogNote && seededFor.current !== key) {
      seededFor.current = key;
      if (view.modal === "edit") setEditTitle(dialogNote.title);
      if (view.modal === "quiz") {
        setQuizConfig(defaultQuizConfig(dialogNote.id));
      }
    }
    if (view.modal === "") seededFor.current = null;
  }, [view.modal, dialogNote]);

  // A dialog id with no row behind it (stale link, or a deleted note) closes
  // the dialog and corrects the URL once the list has loaded.
  useEffect(() => {
    if (view.modal !== "" && !notesPending && !dialogNote) {
      setView({ modal: "", selectedId: "" }, { history: "replace" });
    }
  }, [view.modal, notesPending, dialogNote, setView]);

  const closeDialog = () => {
    setView({ modal: "", selectedId: "" }, { history: "replace" });
  };

  const { startUpload, isUploading } = useUploadThing("documentUploader", {
    onUploadProgress: (progress) => {
      setUploadPercent(progress);
    },
    onClientUploadComplete: async (result) => {
      const uploadedFile = result?.[0];
      if (!uploadedFile) {
        toast.error("The upload finished without a file");
        return;
      }

      try {
        await uploadNoteMutation.mutateAsync({
          title: title.trim(),
          fileUrl: uploadedFile.url,
          uploadthingKey:
            "key" in uploadedFile && typeof uploadedFile.key === "string"
              ? uploadedFile.key
              : undefined,
          fileName: uploadedFile.name,
          fileType: (() => {
            const lower = uploadedFile.name.toLowerCase();
            if (lower.endsWith(".docx")) return "WORD";
            if (
              uploadedFile.type === "application/pdf" ||
              lower.endsWith(".pdf")
            ) {
              return "PDF";
            }
            return "IMAGE";
          })(),
        });

        setFile(null);
        setTitle("");
        setUploadPercent(null);
      } catch {
        setUploadPercent(null);
      }
    },
    onUploadError: (error) => {
      setUploadPercent(null);
      toast.error(error.message);
    },
  });

  const processingNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          note.status === "UPLOADING" ||
          note.status === "PROCESSING" ||
          note.latestQuiz?.status === "GENERATING",
      ).length,
    [notes],
  );

  const handleFileSelection = (selected?: File | null) => {
    if (!selected) return;

    const name = selected.name.toLowerCase();
    const supported =
      selected.type === "application/pdf" ||
      selected.type.startsWith("image/") ||
      name.endsWith(".docx") ||
      name.match(/\.(pdf|docx|jpg|jpeg|png)$/);

    if (!supported) {
      toast.error("Choose a PDF, a Word document or an image");
      return;
    }

    setFile(selected);
    if (!title.trim()) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = () => {
    if (!file || !title.trim()) {
      toast.error("Add a file and a title first");
      return;
    }
    startUpload([file]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note and every quiz made from it?")) return;
    await deleteNoteMutation.mutateAsync(id);
  };

  const openEditDialog = (noteId: string) => {
    setView({ modal: "edit", selectedId: noteId });
  };

  const openQuizDialog = (noteId: string) => {
    setView({ modal: "quiz", selectedId: noteId });
  };

  const saveEdit = async () => {
    if (!dialogNote) return;
    await updateNoteMutation.mutateAsync({
      id: dialogNote.id,
      title: editTitle.trim(),
    });
    closeDialog();
  };

  useEffect(() => {
    if (!quizConfig.timed) return;
    const count = Number(quizConfig.questionCount);
    setQuizConfig((current) => ({
      ...current,
      timeLimit: String(Math.ceil(count * 1.5)),
    }));
  }, [quizConfig.questionCount, quizConfig.timed]);

  const submitQuizGeneration = async () => {
    await generateQuizMutation.mutateAsync({
      noteId: quizConfig.noteId,
      questionCount: Number(quizConfig.questionCount),
      questionTypes: quizConfig.questionTypes,
      timed: quizConfig.timed,
      timeLimit: quizConfig.timed ? Number(quizConfig.timeLimit) : undefined,
      isPublic: quizConfig.isPublic,
    });
    closeDialog();
  };

  const balance = creditsData?.balance ?? 0;
  const quizCost = creditCosts.quizGeneration;
  const maxQuestions = plan === "FREE" ? 20 : 100;
  const isFree = plan === "FREE";
  const hasEnoughCredits = balance >= quizCost;

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
            <p className="text-muted-foreground">
              Add a handout, a slide photo or a typed course. Then make a quiz
              from it.
            </p>
          </div>
          {canUpload && uploadRemaining <= 2 ? (
            <Badge variant="secondary" className="w-fit">
              {uploadRemaining} upload{uploadRemaining === 1 ? "" : "s"} left
              {isFree ? " on the free plan" : ""}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Upload a note</CardTitle>
                  <CardDescription>
                    We extract the text, summarise it, and get it ready for a
                    quiz.
                  </CardDescription>
                </div>
                {!canUpload ? (
                  <Badge variant="destructive">Limit reached</Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {file ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {(() => {
                      const Icon = fileIcon(
                        file.name.toLowerCase().endsWith(".pdf")
                          ? "PDF"
                          : file.name.toLowerCase().endsWith(".docx")
                            ? "WORD"
                            : "IMAGE",
                      );
                      return (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Icon className="size-5 text-muted-foreground" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFile(null)}
                  >
                    <X className="size-4" />
                    <span className="sr-only">Remove the chosen file</span>
                  </Button>
                </div>
              ) : (
                <FileDrop
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  disabled={!canUpload}
                  onFiles={(files) => handleFileSelection(files[0] ?? null)}
                  title="Drop a file here, or choose one"
                  description="PDF, Word (.docx) or an image"
                  hint="Up to 16 MB for a document, 8 MB for an image"
                  actionLabel="Choose a file"
                />
              )}

              {canUpload ? (
                <div className="space-y-2">
                  <Label htmlFor="note-title">Title</Label>
                  <Input
                    id="note-title"
                    placeholder="e.g. Operating Systems, chapter 3"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-medium">
                    You have used every upload on this plan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The Semester Pass removes the note limit.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/subscription">See the Semester Pass</Link>
                  </Button>
                </div>
              )}

              {uploadPercent !== null ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading</span>
                    <span className="font-medium tabular-nums">
                      {uploadPercent}%
                    </span>
                  </div>
                  <Progress value={uploadPercent} className="h-1.5" />
                </div>
              ) : null}

              <Button
                className="w-full"
                disabled={
                  isUploading ||
                  uploadNoteMutation.isPending ||
                  !canUpload ||
                  !file ||
                  !title.trim()
                }
                onClick={handleUpload}
              >
                {isUploading || uploadNoteMutation.isPending ? (
                  "Uploading and queuing…"
                ) : (
                  <>
                    <Plus className="mr-2 size-4" />
                    Upload note
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What happens next</CardTitle>
              <CardDescription>
                You can leave this page while it works.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {NOTE_STAGES.map((stage, index) => (
                  <li key={stage.value} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium">{stage.label}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Your notes
              </h2>
              <p className="text-sm text-muted-foreground">
                {notes.length === 0
                  ? "Nothing here yet."
                  : `${notes.length} note${notes.length === 1 ? "" : "s"}${
                      processingNotes > 0
                        ? ` · ${processingNotes} still working`
                        : ""
                    }`}
              </p>
            </div>
          </div>

          <PendingRegion
            fallback={<NoteListSkeleton />}
            isError={notesError}
            isOffline={notesOffline}
            isPending={notesPending}
            isRefreshing={notesRefreshing}
            label="Your notes"
            longWaitMessage="Still loading your notes. This normally takes a moment."
            onRetry={() => void refetchNotes()}
          >
            {notes.length === 0 ? (
              <Empty className="rounded-xl border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText className="size-4 text-muted-foreground" />
                  </EmptyMedia>
                  <EmptyTitle>No notes yet</EmptyTitle>
                  <EmptyDescription>
                    Upload your first note above and it will show up here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {notes.map((note) => {
                  const Icon = fileIcon(note.fileType);
                  const isBusy =
                    note.status === "UPLOADING" || note.status === "PROCESSING";
                  const isGeneratingQuiz =
                    note.latestQuiz?.status === "GENERATING";
                  return (
                    <Card key={note.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Icon className="size-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="truncate text-base">
                                {note.title}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {fileTypeLabel(note.fileType)} ·{" "}
                                {note.quizCount ?? 0} quiz
                                {(note.quizCount ?? 0) === 1 ? "" : "zes"}
                              </CardDescription>
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">
                                  More actions for {note.title}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => openEditDialog(note.id)}
                              >
                                <Pencil className="mr-2 size-4" />
                                Rename
                              </DropdownMenuItem>
                              {note.status === "ERROR" ? (
                                <DropdownMenuItem
                                  onSelect={() =>
                                    processNoteMutation.mutate(note.id)
                                  }
                                >
                                  <RefreshCw className="mr-2 size-4" />
                                  Try processing again
                                </DropdownMenuItem>
                              ) : null}
                              {note.latestQuiz?.status === "READY" ? (
                                <DropdownMenuItem asChild>
                                  <Link href={`/quizzes/${note.latestQuiz.id}`}>
                                    <ExternalLink className="mr-2 size-4" />
                                    Open the last quiz
                                  </Link>
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => handleDelete(note.id)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariant(note.status)}>
                            {note.status.toLowerCase()}
                          </Badge>
                          {isGeneratingQuiz ? (
                            <Badge variant="secondary">quiz generating</Badge>
                          ) : null}
                        </div>

                        {note.summary ? (
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {note.summary}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {note.status === "READY"
                              ? "No summary was kept for this note."
                              : "The summary appears when processing ends."}
                          </p>
                        )}

                        {note.topics?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {note.topics.slice(0, 3).map((topic) => (
                              <Badge
                                key={`${note.id}-${topic}`}
                                variant="outline"
                              >
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        {isBusy || note.status === "ERROR" ? (
                          <div className="rounded-lg bg-muted/60 px-3 py-3">
                            <ProcessProgress
                              stage={note.processingStage ?? null}
                              steps={NOTE_STAGES}
                              failed={note.status === "ERROR"}
                            />
                          </div>
                        ) : null}

                        {isGeneratingQuiz ? (
                          <div className="rounded-lg bg-muted/60 px-3 py-2">
                            <QuizGeneratingLine />
                          </div>
                        ) : null}
                      </CardContent>

                      <CardFooter className="gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <Link href={`/notes/${note.id}`}>
                            <BookOpen className="mr-2 size-4" />
                            Open
                          </Link>
                        </Button>
                        {note.status === "READY" ? (
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={
                              generateQuizMutation.isPending || isGeneratingQuiz
                            }
                            onClick={() => openQuizDialog(note.id)}
                          >
                            <Sparkles className="mr-2 size-4" />
                            Quiz
                          </Button>
                        ) : null}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </PendingRegion>
        </section>
      </div>

      <Dialog
        open={view.modal === "edit" && dialogNote !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename note</DialogTitle>
            <DialogDescription>
              The file itself is not processed again. Only the title changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={updateNoteMutation.isPending || !editTitle.trim()}
            >
              {updateNoteMutation.isPending ? "Saving…" : "Save title"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={view.modal === "quiz" && dialogNote !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make a quiz</DialogTitle>
            <DialogDescription>
              From “{dialogNote?.title}”. You can change these later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-count">Questions</Label>
              <Select
                value={quizConfig.questionCount}
                onValueChange={(value) =>
                  setQuizConfig((current) => ({
                    ...current,
                    questionCount: value,
                  }))
                }
              >
                <SelectTrigger id="question-count" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_COUNTS.map((count) => (
                    <SelectItem
                      key={count}
                      value={count}
                      disabled={Number(count) > maxQuestions}
                    >
                      {count} questions
                      {Number(count) > maxQuestions ? " · pass only" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFree ? (
                <p className="text-xs text-muted-foreground">
                  The free plan makes up to 20 questions. The Semester Pass goes
                  higher.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="question-type">Question type</Label>
              <Select
                value={quizConfig.questionTypes}
                onValueChange={(value: QuizConfig["questionTypes"]) =>
                  setQuizConfig((current) => ({
                    ...current,
                    questionTypes: value,
                  }))
                }
              >
                <SelectTrigger id="question-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">Multiple choice</SelectItem>
                  <SelectItem value="OPEN">Open answer</SelectItem>
                  <SelectItem value="MIXED">A mix of both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Timed</p>
                  <p className="text-xs text-muted-foreground">
                    A countdown, then the quiz submits itself.
                  </p>
                </div>
                <Switch
                  checked={quizConfig.timed}
                  onCheckedChange={(checked) =>
                    setQuizConfig((current) => ({ ...current, timed: checked }))
                  }
                />
              </div>

              {quizConfig.timed ? (
                <div className="space-y-2">
                  <Label htmlFor="time-limit">Minutes</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min="1"
                    max="180"
                    value={quizConfig.timeLimit}
                    onChange={(event) =>
                      setQuizConfig((current) => ({
                        ...current,
                        timeLimit: event.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Anyone with the link</p>
                <p className="text-xs text-muted-foreground">
                  A public quiz can be opened by anyone you share it with.
                </p>
              </div>
              <Switch
                checked={quizConfig.isPublic}
                onCheckedChange={(checked) =>
                  setQuizConfig((current) => ({
                    ...current,
                    isPublic: checked,
                  }))
                }
              />
            </div>

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Coins className="size-4" />
                This quiz
              </span>
              <span className="font-medium tabular-nums">
                {quizCost} credits · {balance.toLocaleString()} left
              </span>
            </div>
            {!hasEnoughCredits ? (
              <p className="text-xs text-destructive">
                You need {quizCost - balance} more credits.{" "}
                <Link
                  href="/subscription"
                  className="font-medium underline underline-offset-4"
                >
                  See the Semester Pass
                </Link>
                .
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={submitQuizGeneration}
              disabled={
                generateQuizMutation.isPending ||
                !hasEnoughCredits ||
                (quizConfig.timed && !Number(quizConfig.timeLimit))
              }
            >
              <Sparkles className="mr-2 size-4" />
              {generateQuizMutation.isPending ? "Starting…" : "Make the quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UploadPage() {
  const { isPending: sessionPending } = useSession();

  if (sessionPending) {
    return <UploadPageSkeleton />;
  }

  return <UploadContent />;
}
