"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, Image, Loader2, X, Plus } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useUploadThing } from "@/lib/uploadthing";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "sonner";

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { uploadLimit, isPaid } = usePlan();

  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");

  const { startUpload, isUploading } = useUploadThing("documentUploader", {
    onClientUploadComplete: (res) => {
      if (res?.[0]) {
        toast.success("File uploaded successfully!");
        // Handle successful upload
      }
    },
    onUploadError: (error) => {
      toast.error(error.message);
    },
  });

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files);
      setFiles([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Notes</h1>
        <p className="text-muted-foreground">
          Upload your study notes and turn them into interactive quizzes
        </p>
      </div>

      {/* Upload Limit Warning */}
      {!isPaid && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-700">
              You have used {0} of {uploadLimit} free uploads.{" "}
              <Button
                variant="link"
                className="h-auto p-0 text-amber-700"
                asChild
              >
                <Link href="/pricing">Upgrade for unlimited uploads</Link>
              </Button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Drop Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
          <CardDescription>
            Drag and drop your PDF or image files here, or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
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
              PDF or Images (max 16MB)
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
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
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Note Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Biology Chapter 1: Cell Structure"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g., Biology"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={isUploading || !title || !subject}
                onClick={() => startUpload(files)}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Notes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notes Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Your Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">No notes yet</p>
              <p className="text-sm text-muted-foreground">
                Upload your first note to get started
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
