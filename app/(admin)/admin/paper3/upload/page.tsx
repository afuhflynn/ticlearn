"use client";

import {
  BookOpen,
  FileText,
  FileType,
  GraduationCap,
  Image,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeletePaper3Source,
  usePaper3Sources,
  useProcessPaper3Source,
  useUploadPaper3Source,
} from "@/hooks";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

type SourceItem = {
  id: string;
  title: string;
  year: number;
  subject: "ICT" | "COMPUTER_SCIENCE";
  section: "A" | "B";
  category: "SPREADSHEET" | "DATABASE" | "PROGRAMMING";
  paperType: "QUESTION_PAPER" | "MARKING_SCHEME";
  sourceType: "OFFICIAL" | "TEACHER" | "RECONSTRUCTED" | "AI_GENERATED";
  fileUrl: string;
  fileName?: string;
  status: "PENDING" | "PROCESSING" | "READY" | "ERROR";
  questionCount: number;
  createdAt: string;
};

export default function Paper3UploadPage() {
  const { data: sourcesData, isLoading: sourcesLoading } = usePaper3Sources();
  const uploadSource = useUploadPaper3Source();
  const deleteSource = useDeletePaper3Source();
  const processSource = useProcessPaper3Source();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    year: new Date().getFullYear(),
    subject: "ICT" as "ICT" | "COMPUTER_SCIENCE",
    section: "A" as "A" | "B",
    category: "SPREADSHEET" as "SPREADSHEET" | "DATABASE" | "PROGRAMMING",
    paperType: "QUESTION_PAPER" as "QUESTION_PAPER" | "MARKING_SCHEME",
    sourceType: "OFFICIAL" as "OFFICIAL" | "TEACHER" | "RECONSTRUCTED",
  });

  const sourcesList = (sourcesData?.sources ?? []) as SourceItem[];

  const processingCount = useMemo(
    () =>
      sourcesList.filter(
        (s) => s.status === "PROCESSING" || s.status === "PENDING",
      ).length,
    [sourcesList],
  );

  const handleFileSelection = (selectedFile?: File | null) => {
    if (!selectedFile) return;

    const supportedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    console.log({ name: selectedFile.name });

    const isSupported = supportedTypes.some((type) => {
      if (type === "application/pdf")
        return selectedFile.type === "application/pdf";
      if (type === "image/jpeg" || type === "image/png" || type === "image/jpg")
        return selectedFile.type.startsWith("image/");
      if (
        type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
        return selectedFile.name.endsWith(".docx");
      return false;
    });

    if (
      !isSupported &&
      !selectedFile.name.match(/\.(pdf|docx|jpg|jpeg|png)$/i)
    ) {
      toast.error(
        "Unsupported file type. Please upload PDF, Word (.docx), or image files.",
      );
      return;
    }

    setFile(selectedFile);
    if (!formData.title.trim()) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setFormData({ ...formData, title: baseName });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this source and all its questions?")) return;
    try {
      await deleteSource.mutateAsync(id);
      toast.success("Source deleted");
    } catch (_error) {
      toast.error("Failed to delete");
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await processSource.mutateAsync(id);
      toast.success("Processing restarted");
    } catch (_error) {
      toast.error("Failed to start processing");
    }
  };

  const getFileIcon = (url: string) => {
    if (url.toLowerCase().endsWith(".pdf")) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <Image className="h-5 w-5 text-blue-500" />;
  };

  const { startUpload, isUploading } = useUploadThing("documentUploader", {
    onClientUploadComplete: async (res) => {
      const uploadedFile = res?.[0];
      if (!uploadedFile) {
        toast.error("Upload finished without a file");
        return;
      }

      try {
        await uploadSource.mutateAsync({
          title: formData.title.trim(),
          subject: formData.subject.trim() as typeof formData.subject,
          fileUrl: uploadedFile.ufsUrl,
          uploadthingKey:
            "key" in uploadedFile && typeof uploadedFile.key === "string"
              ? uploadedFile.key
              : undefined,
          fileName: uploadedFile.name,
          year: formData.year,
          section: formData.section,
          category: formData.category,
          paperType: formData.paperType,
          sourceType: formData.sourceType,
        });

        setFile(null);
        setFormData({
          title: "",
          year: new Date().getFullYear(),
          subject: "ICT",
          section: "A",
          category: "SPREADSHEET",
          paperType: "QUESTION_PAPER",
          sourceType: "OFFICIAL",
        });
      } catch (error) {
        console.error("Upload error:", error);
      }
    },
    onUploadError: (error) => {
      toast.error(error.message);
    },
  });

  const handleUpload = () => {
    if (!file || !formData.title.trim() || !formData.subject.trim()) {
      toast.error("Add a file, title, and subject first");
      return;
    }

    startUpload([file]);
  };

  const getStatusBadge = (status: SourceItem["status"]) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      READY: "default",
      PROCESSING: "secondary",
      PENDING: "outline",
      ERROR: "destructive",
    };
    const labels: Record<string, string> = {
      READY: "Ready",
      PROCESSING: "Processing",
      PENDING: "Pending",
      ERROR: "Error",
    };
    return (
      <Badge variant={variants[status]}>
        {status === "PROCESSING" && (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        )}
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            GCE Paper 3 Sources
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload exam papers to extract and review questions
          </p>
        </div>

        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        )}
      </div>

      {/* Processing Banner */}
      {processingCount > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm">
              {processingCount} source{processingCount === 1 ? "" : "s"}{" "}
              processing in background
            </span>
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Upload New Source</CardTitle>
            <CardDescription>
              Upload a question paper or marking scheme. Questions will be
              extracted automatically.
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
                accept=".pdf,.docx,.jpg,.jpeg,.png"
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
                PDF, Word (.docx), or Images, max 16MB
              </p>
            </label>

            {file ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {file.name.toLowerCase().endsWith(".pdf") ? (
                    <FileText className="h-8 w-8 text-red-500" />
                  ) : file.name.toLowerCase().endsWith(".docx") ? (
                    <FileType className="h-8 w-8 text-blue-600" />
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Biology"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subject: e.target.value as typeof formData.subject,
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
          <CardContent className="space-y-4">
            {/* Form Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="e.g., ICT Paper 3 2023"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      year: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={formData.subject}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      subject: v as "ICT" | "COMPUTER_SCIENCE",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ICT">ICT</SelectItem>
                    <SelectItem value="COMPUTER_SCIENCE">
                      Computer Science
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={formData.section}
                  onValueChange={(v) =>
                    setFormData({ ...formData, section: v as "A" | "B" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      category: v as "SPREADSHEET" | "DATABASE" | "PROGRAMMING",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPREADSHEET">Spreadsheet</SelectItem>
                    <SelectItem value="DATABASE">Database</SelectItem>
                    <SelectItem value="PROGRAMMING">Programming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Paper Type</Label>
                <Select
                  value={formData.paperType}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      paperType: v as "QUESTION_PAPER" | "MARKING_SCHEME",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUESTION_PAPER">
                      Question Paper
                    </SelectItem>
                    <SelectItem value="MARKING_SCHEME">
                      Marking Scheme
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Source Type</Label>
                <Select
                  value={formData.sourceType}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      sourceType: v as "OFFICIAL" | "TEACHER" | "RECONSTRUCTED",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFICIAL">Official</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="RECONSTRUCTED">Reconstructed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFile(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={
                  !file ||
                  !formData.title.trim() ||
                  uploadSource.isPending ||
                  !file ||
                  !formData.title.trim() ||
                  !formData.subject.trim()
                }
                className="flex-1"
              >
                {uploadSource.isPending || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sources List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Sources</CardTitle>
          <CardDescription>
            {sourcesList.length} source{sourcesList.length === 1 ? "" : "s"}{" "}
            uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sourcesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sourcesList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sources uploaded yet</p>
              <p className="text-sm mt-1">
                Click &quot;Add Source&quot; to upload your first exam paper
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sourcesList.map((source) => (
                <div
                  key={source.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-colors",
                    source.status === "PROCESSING" && "bg-muted/50",
                    source.status === "ERROR" && "border-destructive/50",
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="shrink-0">
                      {getFileIcon(source.fileName || source.title)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {source.title}
                        </span>
                        {getStatusBadge(source.status)}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{source.year}</span>
                        <span>•</span>
                        <span>{source.subject}</span>
                        <span>•</span>
                        <span>Section {source.section}</span>
                        <span>•</span>
                        <span>{source.category}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <BookOpen className="h-3 w-3" />
                        <span>
                          {source.questionCount ?? 0} question
                          {(source.questionCount ?? 0) === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(source.status === "ERROR" || source.status === "READY") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(source.id)}
                        disabled={processSource.isPending}
                        title={source.status === "READY" ? "Re-process to generate new questions" : "Retry failed processing"}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}

                    {source.status === "READY" && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/admin/paper3/questions?source=${source.id}`}>
                          View
                        </a>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(source.id)}
                      disabled={deleteSource.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
