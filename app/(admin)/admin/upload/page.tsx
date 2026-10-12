"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Check, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";

type ExamLevel = { id: string; name: string; code: string };
type Program = { id: string; name: string; code: string };
type Component = { id: string; name: string; code: string; type: string };
type ExamSource = { id: string; year: number; sessionName: string };

export default function AdminUploadPage() {
  const [levels, setLevels] = useState<ExamLevel[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [sources, setSources] = useState<ExamSource[]>([]);

  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [newSourceYear, setNewSourceYear] = useState("");
  const [newSourceName, setNewSourceName] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<
    Array<{ number: string; text: string; marks: number; type: string }>
  >([]);
  const [saved, setSaved] = useState(false);

  const { startUpload } = useUploadThing("documentUploader");

  useEffect(() => {
    fetch("/api/exam-levels")
      .then((r) => r.json())
      .then((d) => setLevels(d.levels));
  }, []);

  const loadPrograms = async (levelId: string) => {
    setSelectedLevel(levelId);
    setSelectedProgram("");
    setSelectedComponent("");
    setSelectedSource("");
    setParsedQuestions([]);
    const res = await fetch(`/api/programs?examLevelId=${levelId}`);
    const d = await res.json();
    setPrograms(d.programs);
  };

  const loadComponents = async (programId: string) => {
    setSelectedProgram(programId);
    setSelectedComponent("");
    setSelectedSource("");
    setParsedQuestions([]);
    const res = await fetch(`/api/onboarding/topics?programId=${programId}`);
    const d = await res.json();
    setComponents(d.components || []);
  };

  const loadSources = async (componentId: string) => {
    setSelectedComponent(componentId);
    setSelectedSource("");
    setParsedQuestions([]);
    const res = await fetch(`/api/exam-sources?componentId=${componentId}`);
    const d = await res.json();
    setSources(d.sources || []);
  };

  const createSource = async () => {
    if (!newSourceYear || !newSourceName) return;
    const res = await fetch("/api/exam-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        componentId: selectedComponent,
        year: parseInt(newSourceYear),
        sessionName: newSourceName,
      }),
    });
    const d = await res.json();
    if (d.source) {
      toast.success("Exam session created");
      setSelectedSource(d.source.id);
      setSources((prev) => [...prev, d.source]);
      setNewSourceYear("");
      setNewSourceName("");
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedComponent) return;
    setUploading(true);
    try {
      const uploaded = await startUpload([file]);
      if (!uploaded || uploaded.length === 0) throw new Error("Upload failed");
      const uploadedFile = uploaded[0];

      setIngesting(true);
      const res = await fetch("/api/admin/questions/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: selectedComponent,
          examSourceId: selectedSource || null,
          fileUrl: uploadedFile.url,
          fileName: file.name,
        }),
      });
      const data = await res.json();
      if (data.jobId) {
        setJobId(data.jobId);
        toast.success("Processing started");
        pollStatus(data.jobId);
      }
    } catch (e) {
      toast.error("Upload failed");
      console.error(e);
    }
    setUploading(false);
  };

  const pollStatus = async (id: string) => {
    const check = async () => {
      const res = await fetch(`/api/admin/parse-status/${id}`);
      const data = await res.json();
      if (data.status === "completed" && data.questions) {
        setParsedQuestions(data.questions);
        setIngesting(false);
      } else if (data.status === "failed") {
        toast.error("Parsing failed");
        setIngesting(false);
      } else {
        setTimeout(check, 3000);
      }
    };
    setTimeout(check, 3000);
  };

  const handleSave = async () => {
    setSaved(true);
    toast.success("Questions saved");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Past papers → question bank</CardTitle>
          <CardDescription>
            Paper 1 &amp; 2 (non–Paper 3). Pick level, program, component,
            optional exam session (year). Upload parses into questions for mock
            exams.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Exam Level</Label>
              <Select value={selectedLevel} onValueChange={loadPrograms}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Program</Label>
              <Select
                value={selectedProgram}
                onValueChange={loadComponents}
                disabled={!selectedLevel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs
                    .filter((p) => p.code !== "UNKNOWN")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Component</Label>
              <Select
                value={selectedComponent}
                onValueChange={loadSources}
                disabled={!selectedProgram}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {components.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exam Session</Label>
              <Select
                value={selectedSource}
                onValueChange={setSelectedSource}
                disabled={!selectedComponent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or create" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sessionName} ({s.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedComponent && (
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label>New session year</Label>
                <Input
                  type="number"
                  value={newSourceYear}
                  onChange={(e) => setNewSourceYear(e.target.value)}
                  placeholder="2026"
                />
              </div>
              <div className="space-y-1">
                <Label>Session name</Label>
                <Input
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="June 2026"
                />
              </div>
              <Button
                variant="outline"
                onClick={createSource}
                disabled={!newSourceYear || !newSourceName}
              >
                Create
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label>File</Label>
            <Input
              type="file"
              accept=".pdf,.docx,.doc,.png,.jpg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, or image files
            </p>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || !selectedComponent || uploading || ingesting}
          >
            {uploading || ingesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading
              ? "Uploading..."
              : ingesting
                ? "Parsing..."
                : "Upload & Parse"}
          </Button>
        </CardContent>
      </Card>

      {parsedQuestions.length > 0 && !saved && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Parsed Questions</CardTitle>
            <CardDescription>
              {parsedQuestions.length} questions found. Review and save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {parsedQuestions.map((q, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">#{q.number}</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {q.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{q.type}</Badge>
                    <Badge>{q.marks} marks</Badge>
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={handleSave} className="w-full">
              <Check className="mr-2 h-4 w-4" /> Save {parsedQuestions.length}{" "}
              Questions
            </Button>
          </CardContent>
        </Card>
      )}

      {saved && (
        <Card>
          <CardContent className="py-8 text-center">
            <Check className="mx-auto h-8 w-8 text-green-500" />
            <p className="mt-2 font-medium">Questions saved successfully</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
