"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Section {
  name: string; questionCount: number; marksPerQuestion: number; totalMarks: number;
  questionType: string; answerRule: string; order: number;
}

export default function EditBlueprintPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [durationMin, setDurationMin] = useState(120);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/blueprints/${id}`)
      .then(r => r.json())
      .then(d => {
        const bp = d.blueprint;
        setName(bp.name);
        setDescription(bp.description || "");
        setTotalMarks(bp.totalMarks);
        setDurationMin(bp.durationMin);
        setSections(bp.sections.map((s: Section) => ({ ...s })));
      })
      .catch(() => toast.error("Failed to load blueprint"))
      .finally(() => setLoading(false));
  }, [id]);

  const addSection = () => {
    const order = sections.length + 1;
    setSections(prev => [...prev, { name: `Section ${String.fromCharCode(64 + order)}`, questionCount: 5, marksPerQuestion: 10, totalMarks: 50, questionType: "STRUCTURED", answerRule: "", order }]);
  };
  const updateSection = (index: number, field: string, value: unknown) => {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };
  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const sectionsTotal = sections.reduce((s, sec) => s + sec.totalMarks, 0);
  const marksMatch = sectionsTotal === totalMarks;

  const handleSave = async () => {
    if (!marksMatch) { toast.error(`Section marks (${sectionsTotal}) ≠ total (${totalMarks})`); return; }
    setSaving(true);
    try {
      await fetch(`/api/admin/blueprints/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, totalMarks, durationMin, sections }),
      });
      toast.success("Blueprint updated");
      router.push("/admin/blueprints");
    } catch (e) { toast.error("Failed to update"); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit Blueprint: {name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Marks</Label>
              <Input type="number" value={totalMarks} onChange={e => setTotalMarks(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input type="number" value={durationMin} onChange={e => setDurationMin(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-medium">Sections</h3>
            <Button variant="outline" size="sm" onClick={addSection}><Plus className="mr-2 h-4 w-4" />Add</Button>
          </div>
          <Badge variant={marksMatch ? "default" : "destructive"}>
            Section total: {sectionsTotal}/{totalMarks} marks
          </Badge>

          {sections.map((sec, i) => (
            <div key={i} className="grid gap-3 rounded-lg border p-4 md:grid-cols-7">
              <div className="space-y-1"><Label>Name</Label><Input value={sec.name} onChange={e => updateSection(i, "name", e.target.value)} /></div>
              <div className="space-y-1"><Label>Count</Label><Input type="number" value={sec.questionCount} onChange={e => updateSection(i, "questionCount", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Marks/Q</Label><Input type="number" value={sec.marksPerQuestion} onChange={e => updateSection(i, "marksPerQuestion", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Total</Label><Input type="number" value={sec.totalMarks} onChange={e => updateSection(i, "totalMarks", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Type</Label>
                <Select value={sec.questionType} onValueChange={v => updateSection(i, "questionType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="STRUCTURED">Structured</SelectItem>
                    <SelectItem value="PRACTICAL">Practical</SelectItem>
                    <SelectItem value="ESSAY">Essay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Rule</Label><Input value={sec.answerRule} onChange={e => updateSection(i, "answerRule", e.target.value)} /></div>
              <div className="flex items-end"><Button variant="ghost" size="icon" onClick={() => removeSection(i)}><Trash2 className="h-4 w-4" /></Button></div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !marksMatch}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
