"use client";

import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteNote, useNote, useProcessNote } from "@/hooks";
import { useSession } from "@/lib/auth-client";
import type { NoteWithRelations } from "@/types";

type NoteDetails = NoteWithRelations & {
  latestQuiz?: {
    id: string;
    status: "GENERATING" | "READY" | "ERROR";
    title: string;
    createdAt: string;
  } | null;
};

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { data, isLoading, error } = useNote(params.id);
  const processNoteMutation = useProcessNote();
  const deleteNoteMutation = useDeleteNote();

  if (!sessionLoading && !session) {
    router.push("/sign-in");
    return null;
  }

  const note = data?.note as NoteDetails | undefined;

  const handleDelete = async () => {
    if (!note) return;
    if (!confirm("Delete this note and all generated quizzes from it?")) {
      return;
    }

    try {
      await deleteNoteMutation.mutateAsync(note.id);
      router.push("/upload");
    } catch (_error) {}
  };

  const handleRetry = async () => {
    if (!note) return;
    try {
      await processNoteMutation.mutateAsync(note.id);
      toast.success("Note processing restarted");
    } catch (_error) {}
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/upload">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back To Uploads
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium">This note could not be loaded.</p>
            <p className="text-sm text-muted-foreground">
              It may have been removed or you may not have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isProcessing =
    note.status === "UPLOADING" || note.status === "PROCESSING";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="w-fit px-0" asChild>
            <Link href="/upload">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back To Uploads
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <FileText className="h-9 w-9 text-red-500" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  {note.title}
                </h1>
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
              </div>
              <p className="text-muted-foreground">{note.fileName}</p>
            </div>
          </div>

          {note.summary ? (
            <p className="max-w-4xl text-sm text-muted-foreground">
              {note.summary}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {note.status === "READY" ? (
            <Button variant="outline" asChild>
              <Link href={`/chat?note=${note.id}`}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Learn This With Tip
              </Link>
            </Button>
          ) : null}

          {note.status === "READY" && note.latestQuiz?.status === "READY" ? (
            <Button asChild>
              <Link href={`/quiz/${note.latestQuiz.id}`}>
                <Sparkles className="mr-2 h-4 w-4" />
                Open Latest Quiz
              </Link>
            </Button>
          ) : null}

          {note.status === "ERROR" ? (
            <Button variant="outline" onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Processing
            </Button>
          ) : null}

          <Button variant="outline" asChild>
            <a href={note.fileUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Original PDF
            </a>
          </Button>

          <Button
            variant="ghost"
            className="text-destructive"
            onClick={handleDelete}
            disabled={deleteNoteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {isProcessing ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Processing in background</p>
              <p className="text-sm text-muted-foreground">
                TiCLearn is extracting the PDF text, building a summary, and
                generating key points. This page refreshes automaTiClly while
                the job is still running.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="min-h-[720px]">
          <CardHeader>
            <CardTitle>Original PDF</CardTitle>
            <CardDescription>
              Read the uploaded source document directly in the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[620px]">
            <iframe
              src={`${note.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={note.title}
              className="h-full w-full rounded-lg border bg-background"
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="text">Extracted Text</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {note.summary || "Summary will appear after processing."}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Key Points
                  </h2>
                  {note.keyPoints?.length ? (
                    <ul className="space-y-2 list-disc pl-5 text-sm leading-6 text-muted-foreground">
                      {note.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Key points will appear after processing.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="text" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Text</CardTitle>
                <CardDescription>
                  Searchable text parsed from the uploaded PDF.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[560px] rounded-lg border p-4">
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-muted-foreground">
                    {note.extractedText ||
                      "Extracted text will appear after processing."}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="topics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Topics</CardTitle>
                <CardDescription>
                  The main concepts detected from this note.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {note.topics?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {note.topics.map((topic) => (
                      <Badge key={topic} variant="outline">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Topics will appear after processing.
                  </p>
                )}

                {note.latestQuiz ? (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Latest Quiz
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {note.latestQuiz.title} ({note.latestQuiz.status})
                      </p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
