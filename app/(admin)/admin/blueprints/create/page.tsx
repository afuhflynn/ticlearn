"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Section {
  name: string;
  questionCount: number;
  marksPerQuestion: number;
  totalMarks: number;
  questionType: string;
  answerRule: string;
  order: number;
}

export default function CreateBlueprintPage() {
  const router = useRouter();
  const [levels, setLevels] = useState<Array<{ id: string; name: string }>>([]);
  const [programs, setPrograms] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);
  const [components, setComponents] = useState<
    Array<{ id: string; name: string; code: string }>
  >([]);

  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [durationMin, setDurationMin] = useState(120);
  const [sections, setSections] = useState<Section[]>([
    {
      name: "Section A",
      questionCount: 5,
      marksPerQuestion: 10,
      totalMarks: 50,
      questionType: "STRUCTURED",
      answerRule: "",
      order: 1,
    },
  ]);
  const [visibleForStudents, setVisibleForStudents] = useState(true);
  const [visibleInCommunity, setVisibleInCommunity] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/exam-levels")
      .then((r) => r.json())
      .then((d) => setLevels(d.levels));
  }, []);

  const loadPrograms = async (levelId: string) => {
    setSelectedLevel(levelId);
    setSelectedProgram("");
    setSelectedComponent("");
    const r = await fetch(`/api/programs?examLevelId=${levelId}`);
    const d = await r.json();
    setPrograms(
      d.programs.filter((p: { code: string }) => p.code !== "UNKNOWN"),
    );
  };

  const loadComponents = async (programId: string) => {
    setSelectedProgram(programId);
    setSelectedComponent("");
    const r = await fetch(`/api/onboarding/topics?programId=${programId}`);
    const d = await r.json();
    setComponents(d.components || []);
  };

  const addSection = () => {
    const order = sections.length + 1;
    setSections((prev) => [
      ...prev,
      {
        name: `Section ${String.fromCharCode(64 + order)}`,
        questionCount: 5,
        marksPerQuestion: 10,
        totalMarks: 50,
        questionType: "STRUCTURED",
        answerRule: "",
        order,
      },
    ]);
  };

  const updateSection = (index: number, field: string, value: unknown) => {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const removeSection = (index: number) => {
    setSections((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 })),
    );
  };

  const sectionsTotal = sections.reduce((s, sec) => s + sec.totalMarks, 0);
  const marksMatch = sectionsTotal === totalMarks;

  const handleSave = async () => {
    if (!selectedComponent || !name) {
      toast.error("Fill required fields");
      return;
    }
    if (!marksMatch) {
      toast.error(`Section marks (${sectionsTotal}) ≠ total (${totalMarks})`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/blueprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: selectedComponent,
          name,
          description,
          totalMarks,
          durationMin,
          sections,
          visibleForStudents,
          visibleInCommunity,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      toast.success("Blueprint created");
      router.push("/admin/blueprints");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Blueprint</CardTitle>
          <CardDescription>Define mock exam structure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
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
                  {programs.map((p) => (
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
                onValueChange={setSelectedComponent}
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
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Blueprint Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="CS Paper 1 Standard"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Marks</Label>
              <Input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  Student Practice mocks list
                </p>
                <p className="text-xs text-muted-foreground">
                  Matched to onboarding programs.
                </p>
              </div>
              <Switch
                checked={visibleForStudents}
                onCheckedChange={setVisibleForStudents}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Community featured mocks</p>
                <p className="text-xs text-muted-foreground">
                  Visible to subscribers with Community access.
                </p>
              </div>
              <Switch
                checked={visibleInCommunity}
                onCheckedChange={setVisibleInCommunity}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sections</CardTitle>
            <CardDescription>Define each section's structure.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addSection}>
            <Plus className="mr-2 h-4 w-4" /> Add Section
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant={marksMatch ? "default" : "destructive"}>
              Section total: {sectionsTotal}/{totalMarks} marks
            </Badge>
            {!marksMatch && (
              <span className="text-xs text-destructive">
                Marks don't match total
              </span>
            )}
          </div>
          {sections.map((sec, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-lg border p-4 md:grid-cols-7"
            >
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={sec.name}
                  onChange={(e) => updateSection(i, "name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Questions</Label>
                <Input
                  type="number"
                  value={sec.questionCount}
                  onChange={(e) =>
                    updateSection(i, "questionCount", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Marks/Q</Label>
                <Input
                  type="number"
                  value={sec.marksPerQuestion}
                  onChange={(e) =>
                    updateSection(i, "marksPerQuestion", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Total</Label>
                <Input
                  type="number"
                  value={sec.totalMarks}
                  onChange={(e) =>
                    updateSection(i, "totalMarks", Number(e.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select
                  value={sec.questionType}
                  onValueChange={(v) => updateSection(i, "questionType", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="STRUCTURED">Structured</SelectItem>
                    <SelectItem value="PRACTICAL">Practical</SelectItem>
                    <SelectItem value="ESSAY">Essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Rule</Label>
                <Input
                  value={sec.answerRule}
                  onChange={(e) =>
                    updateSection(i, "answerRule", e.target.value)
                  }
                  placeholder="Answer any 3"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSection(i)}
                  disabled={sections.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !marksMatch}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Blueprint
        </Button>
      </div>
    </div>
  );
}
