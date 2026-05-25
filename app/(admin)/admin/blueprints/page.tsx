"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  totalMarks: number;
  durationMin: number;
  visibleForStudents: boolean;
  visibleInCommunity: boolean;
  sections: Array<{
    name: string;
    questionCount: number;
    totalMarks: number;
    questionType: string;
  }>;
  component: {
    name: string;
    code: string;
    program: { name: string; examLevel: { name: string } };
  };
  createdAt: string;
}

export default function BlueprintsPage() {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/blueprints")
      .then((r) => r.json())
      .then((d) => setBlueprints(d.blueprints || []))
      .catch(() => toast.error("Failed to load blueprints"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blueprint?")) return;
    await fetch(`/api/admin/blueprints/${id}`, { method: "DELETE" });
    setBlueprints((prev) => prev.filter((b) => b.id !== id));
    toast.success("Blueprint deleted");
  };

  const patchVisibility = async (
    blueprintId: string,
    patch: { visibleForStudents?: boolean; visibleInCommunity?: boolean },
  ) => {
    const res = await fetch(`/api/admin/blueprints/${blueprintId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Failed to update visibility");
      return;
    }
    const data = (await res.json()) as { blueprint: Blueprint };
    setBlueprints((prev) =>
      prev.map((b) => (b.id === blueprintId ? { ...b, ...data.blueprint } : b)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exam Blueprints</h1>
          <p className="text-muted-foreground">
            Paper 1 &amp; 2 mock templates. Toggle where each blueprint appears
            — student Practice list and/or Community highlights.
          </p>
        </div>
        <Button onClick={() => router.push("/admin/blueprints/create")}>
          <Plus className="mr-2 h-4 w-4" /> New Blueprint
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : blueprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No blueprints yet. Create your first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {blueprints.map((bp) => (
            <Card key={bp.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{bp.name}</CardTitle>
                    <CardDescription>
                      {bp.component.program.examLevel.name} -{" "}
                      {bp.component.program.name} - {bp.component.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{bp.totalMarks} marks</Badge>
                    <Badge>{bp.durationMin} min</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/blueprints/${bp.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(bp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {bp.sections.map((sec, i) => (
                    <Badge key={i} variant="secondary">
                      {sec.name}: {sec.questionCount}×{sec.questionType} (
                      {sec.totalMarks}m)
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-6 rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`student-${bp.id}`}
                      checked={bp.visibleForStudents !== false}
                      onCheckedChange={(v) => patchVisibility(bp.id, { visibleForStudents: v })}
                      aria-labelledby={`student-${bp.id}-label`}
                    />
                    <Label id={`student-${bp.id}-label`} htmlFor={`student-${bp.id}`} className="cursor-pointer text-sm font-medium">
                      Students (Practice mocks)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`community-${bp.id}`}
                      checked={bp.visibleInCommunity === true}
                      onCheckedChange={(v) => patchVisibility(bp.id, { visibleInCommunity: v })}
                      aria-labelledby={`community-${bp.id}-label`}
                    />
                    <Label id={`community-${bp.id}-label`} htmlFor={`community-${bp.id}`} className="cursor-pointer text-sm font-medium">
                      Community
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
