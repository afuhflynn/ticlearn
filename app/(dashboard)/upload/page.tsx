"use client";

import {
  AlertCircle,
  BookOpen,
  Brain,
  ExternalLink,
  FileText,
  Image,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCheckLimit,
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
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

type NoteItem = {
  id: string;
  title: string;
  subject: string;
  fileUrl: string;
  fileName: string;
  fileType: "PDF" | "IMAGE";
  status: "UPLOADING" | "PROCESSING" | "READY" | "ERROR";
  summary?: string | null;
  topics?: string[];
  keyPoints?: string[];
  quizCount?: number;
  latestQuiz?: {
    id: string;
    status: "GENERATING" | "READY" | "ERROR";
    title: string;
    createdAt: string;
  } | null;
};

type QuizConfig = {
  noteId: string;
  questionCount: "5" | "10" | "15" | "20";
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

function UploadContent() {
  const { notes, isLoading: notesLoading } = useNotes();
  const uploadNoteMutation = useUploadNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();
  const processNoteMutation = useProcessNote();
  const generateQuizMutation = useGenerateQuiz();
  const {
    allowed: canUpload,
    remaining: uploadRemaining,
    limit: uploadLimit,
  } = useCheckLimit("upload");

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>(defaultQuizConfig());

  const { isLoading, plan } = usePlan();
  const { data: session, isPending } = useSession();

  const { startUpload, isUploading } = useUploadThing("documentUploader", {
    onClientUploadComplete: async (res) => {
      const uploadedFile = res?.[0];
      if (!uploadedFile) {
        toast.error("Upload finished without a file");
        return;
      }

      try {
        await uploadNoteMutation.mutateAsync({
          title: title.trim(),
          subject: subject.trim(),
          fileUrl: uploadedFile.url,
          uploadthingKey:
            "key" in uploadedFile && typeof uploadedFile.key === "string"
              ? uploadedFile.key
              : undefined,
          fileName: uploadedFile.name,
          fileType: uploadedFile.type.includes("pdf") ? "PDF" : "IMAGE",
        });

        setFile(null);
        setTitle("");
        setSubject("");
      } catch (error) {
        console.error("Upload error:", error);
      }
    },
    onUploadError: (error) => {
      toast.error(error.message);
    },
  });

  const notesList = notes as NoteItem[];

  const processingNotes = useMemo(
    () =>
      notesList.filter(
        (note) =>
          note.status === "UPLOADING" ||
          note.status === "PROCESSING" ||
          note.latestQuiz?.status === "GENERATING",
      ).length,
    [notesList],
  );

  const handleFileSelection = (selectedFile?: File | null) => {
    if (!selectedFile) return;
    if (!selectedFile.type.includes("pdf")) {
      toast.error("Only PDF uploads are supported right now");
      return;
    }
    setFile(selectedFile);
    if (!title.trim()) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(baseName);
    }
  };

  const handleUpload = () => {
    if (!file || !title.trim() || !subject.trim()) {
      toast.error("Add a file, title, and subject first");
      return;
    }

    startUpload([file]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note and all generated quizzes from it?")) {
      return;
    }

    await deleteNoteMutation.mutateAsync(id);
  };

  const openEditDialog = (note: NoteItem) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditSubject(note.subject);
  };

  const saveEdit = async () => {
    if (!editingNote) return;

    await updateNoteMutation.mutateAsync({
      id: editingNote.id,
      title: editTitle.trim(),
      subject: editSubject.trim(),
    });

    setEditingNote(null);
  };

  const openQuizDialog = (note: NoteItem) => {
    setQuizConfig(defaultQuizConfig(note.id));
    setQuizDialogOpen(true);
  };

  // Auto-calculate time limit based on question count (1.5 mins per question)
  useMemo(() => {
    if (quizConfig.timed) {
      const count = Number(quizConfig.questionCount);
      const calculatedTime = Math.ceil(count * 1.5);
      setQuizConfig((prev) => ({
        ...prev,
        timeLimit: String(calculatedTime),
      }));
    }
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

    setQuizDialogOpen(false);
  };

  const processingMessage =
    processingNotes > 0
      ? `${processingNotes} note or quiz job${processingNotes === 1 ? "" : "s"} running in the background`
      : null;

  return (
    <>
      <div className="space-y-8">
        {uploadRemaining > 0 && uploadRemaining <= 2 && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-700">
                You have {uploadRemaining} of {uploadLimit} uploads remaining.{" "}
                <Button
                  variant="link"
                  className="h-auto p-0 text-amber-700"
                  asChild
                >
                  <Link href="/pricing">Upgrade for more capacity</Link>
                </Button>
              </p>
            </CardContent>
          </Card>
        )}

        {processingMessage ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">Background jobs are running</p>
                <p className="text-sm text-muted-foreground">
                  {processingMessage}. This page refreshes automaTiClly while
                  work is still in progress.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="w-full">
            <CardTitle className="w-full flex items-center justify-between">
              Upload A Note
              {!canUpload && (
                <Badge variant={"destructive"}>Upload limit exceeded</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Upload one PDF. TiCLearn will extract the text, build a summary,
              identify key points, and prepare it for quiz generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              htmlFor="note-upload"
              className={cn(
                `relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`,
                !canUpload && "pointer-events-none opacity-50",
              )}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                handleFileSelection(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                id="note-upload"
                type="file"
                accept=".pdf"
                onChange={(e) =>
                  handleFileSelection(e.target.files?.[0] ?? null)
                }
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Click to upload
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF only, max 16MB
              </p>
            </label>

            {file ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {file.type.includes("pdf") ? (
                    <FileText className="h-8 w-8 text-red-500" />
                  ) : (
                    <Image className="h-8 w-8 text-blue-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
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
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            {canUpload && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g. Biology Chapter 1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="e.g. Biology"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={
                isUploading ||
                uploadNoteMutation.isPending ||
                !file ||
                !title.trim() ||
                !subject.trim()
              }
              onClick={handleUpload}
            >
              {isUploading || uploadNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading And Queueing Processing...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Note
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Notes</CardTitle>
            <CardDescription>
              Manage note metadata, inspect extracted study insights, open the
              original PDF, and generate quizzes when a note is ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notesList.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">No notes yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first note to start the AI processing flow.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {notesList.map((note) => {
                  const isBusy =
                    note.status === "UPLOADING" || note.status === "PROCESSING";
                  const isGeneratingQuiz =
                    note.latestQuiz?.status === "GENERATING";

                  return (
                    <div
                      key={note.id}
                      className="rounded-xl border p-4 space-y-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {note.fileType === "PDF" ? (
                              <FileText className="h-8 w-8 text-red-500" />
                            ) : (
                              <Image className="h-8 w-8 text-blue-500" />
                            )}
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-base font-semibold">
                                  {note.title}
                                </p>
                                <Badge
                                  variant={
                                    note.status === "READY"
                                      ? "default"
                                      : note.status === "ERROR"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {note.status}
                                </Badge>
                                {isGeneratingQuiz ? (
                                  <Badge variant="secondary">
                                    Quiz generating
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {note.subject} • {note.quizCount ?? 0} quiz
                                {note.quizCount === 1 ? "" : "zes"}
                              </p>
                            </div>
                          </div>

                          {note.summary ? (
                            <p className="text-sm text-muted-foreground max-w-3xl">
                              {note.summary}
                            </p>
                          ) : null}

                          {note.keyPoints?.length ? (
                            <ul className="space-y-1 text-sm text-muted-foreground max-w-3xl list-disc pl-5">
                              {note.keyPoints.slice(0, 3).map((point) => (
                                <li key={`${note.id}-${point}`}>{point}</li>
                              ))}
                            </ul>
                          ) : null}

                          {note.topics?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {note.topics.map((topic) => (
                                <Badge
                                  key={`${note.id}-${topic}`}
                                  variant="outline"
                                >
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          {note.latestQuiz ? (
                            <p className="text-sm text-muted-foreground">
                              Latest quiz: {note.latestQuiz.title} (
                              {note.latestQuiz.status})
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/notes/${note.id}`}>
                              <BookOpen className="mr-2 h-4 w-4" />
                              Open Note
                            </Link>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(note)}
                            disabled={updateNoteMutation.isPending}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>

                          {note.status === "ERROR" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                processNoteMutation.mutate(note.id)
                              }
                              disabled={processNoteMutation.isPending}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry Processing
                            </Button>
                          ) : null}

                          {note.status === "READY" ? (
                            <Button
                              size="sm"
                              onClick={() => openQuizDialog(note)}
                              disabled={
                                generateQuizMutation.isPending ||
                                isGeneratingQuiz
                              }
                            >
                              {isGeneratingQuiz ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  Generate Quiz
                                </>
                              )}
                            </Button>
                          ) : null}

                          {note.latestQuiz?.status === "READY" ? (
                            <Button variant="secondary" size="sm" asChild>
                              <Link href={`/quiz/${note.latestQuiz.id}`}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Latest Quiz
                              </Link>
                            </Button>
                          ) : null}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDelete(note.id)}
                            disabled={deleteNoteMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {(isBusy || isGeneratingQuiz) && (
                        <div className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {isBusy
                            ? "AI is extracting text, summarizing the note, and identifying topics."
                            : "AI is generating the configured quiz in the background."}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editingNote !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingNote(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update the note title or subject. This does not reprocess the file
              contents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNote(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={
                updateNoteMutation.isPending ||
                !editTitle.trim() ||
                !editSubject.trim()
              }
            >
              {updateNoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate A Quiz</DialogTitle>
            <DialogDescription>
              Configure how the generated quiz should be.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Number of questions</Label>
              <Select
                value={quizConfig.questionCount}
                onValueChange={(value: QuizConfig["questionCount"]) =>
                  setQuizConfig((current) => ({
                    ...current,
                    questionCount: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a question count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                  <SelectItem value="15">15 questions</SelectItem>
                  <SelectItem value="20">20 questions</SelectItem>
                  <SelectItem
                    value="30"
                    disabled={
                      !isLoading &&
                      !isPending &&
                      ["STARTER", "PREMIUM", "STANDARD"].includes(plan)
                    }
                  >
                    30 questions
                  </SelectItem>
                  <SelectItem
                    value="40"
                    disabled={
                      !isLoading &&
                      !isPending &&
                      ["STARTER", "PREMIUM", "STANDARD"].includes(plan)
                    }
                  >
                    40 questions
                  </SelectItem>
                  <SelectItem
                    value="50"
                    disabled={
                      !isLoading &&
                      !isPending &&
                      ["STARTER", "PREMIUM", "STANDARD"].includes(plan)
                    }
                  >
                    50 questions
                  </SelectItem>
                  <SelectItem
                    value="60"
                    disabled={
                      !isLoading &&
                      !isPending &&
                      ["PREMIUM", "STANDARD", "STARTER"].includes(plan)
                    }
                  >
                    60 questions
                  </SelectItem>
                  <SelectItem
                    value="70"
                    disabled={
                      !isLoading &&
                      !isPending &&
                      ["PREMIUM", "STANDARD"].includes(plan)
                    }
                  >
                    70 questions
                  </SelectItem>
                  <SelectItem
                    value="80"
                    disabled={
                      !isLoading &&
                      !isPending &&
                      ["PREMIUM", "STANDARD"].includes(plan)
                    }
                  >
                    80 questions
                  </SelectItem>
                  <SelectItem
                    value="90"
                    disabled={
                      !isLoading && !isPending && ["PREMIUM"].includes(plan)
                    }
                  >
                    90 questions
                  </SelectItem>
                  <SelectItem
                    value="100"
                    disabled={
                      !isLoading && !isPending && ["PREMIUM"].includes(plan)
                    }
                  >
                    100 questions
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question type</Label>
              <Select
                value={quizConfig.questionTypes}
                onValueChange={(value: QuizConfig["questionTypes"]) =>
                  setQuizConfig((current) => ({
                    ...current,
                    questionTypes: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select question types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">MCQ only</SelectItem>
                  <SelectItem value="OPEN">Open-ended only</SelectItem>
                  <SelectItem value="MIXED">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Timed quiz</p>
                  <p className="text-sm text-muted-foreground">
                    Enable a countdown timer and auto-submit.
                  </p>
                </div>
                <Switch
                  checked={quizConfig.timed}
                  onCheckedChange={(checked) =>
                    setQuizConfig((current) => ({
                      ...current,
                      timed: checked,
                    }))
                  }
                />
              </div>

              {quizConfig.timed ? (
                <div className="space-y-2">
                  <Label htmlFor="time-limit">Time limit (minutes)</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min="1"
                    max="180"
                    value={quizConfig.timeLimit}
                    onChange={(e) =>
                      setQuizConfig((current) => ({
                        ...current,
                        timeLimit: e.target.value,
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">Make quiz public</p>
                <p className="text-sm text-muted-foreground">
                  Public quizzes can be discovered from Community by paid-plan
                  users.
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuizDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitQuizGeneration}
              disabled={
                generateQuizMutation.isPending ||
                (quizConfig.timed && !Number(quizConfig.timeLimit))
              }
            >
              {generateQuizMutation.isPending ? (
                <>
                  <Brain className="mr-2 h-4 w-4 animate-pulse" />
                  Starting Background Job...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UploadPage() {
  const { isLoading: usageLoading } = useUsage();

  if (usageLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Notes</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Notes</h1>
        <p className="text-muted-foreground">
          Upload study material, let the AI process it in the background, then
          generate quizzes when the note is ready.
        </p>
      </div>
      <UploadContent />
    </div>
  );
}
