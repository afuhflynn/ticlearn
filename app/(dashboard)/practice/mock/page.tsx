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
import { Badge } from "@/components/ui/badge";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  totalMarks: number;
  durationMin: number;
  sections: Array<{
    name: string;
    questionCount: number;
    totalMarks: number;
    questionType: string;
  }>;
}

export default function MockListPage() {
  const router = useRouter();
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/blueprints")
      .then((r) => r.json())
      .then((d) => setBlueprints(d.blueprints || []))
      .catch(() => toast.error("Failed to load blueprints"))
      .finally(() => setLoading(false));
  }, []);

  const startMock = async (blueprintId: string) => {
    setGenerating(blueprintId);
    try {
      const res = await fetch("/api/mocks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintId }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      router.push(`/practice/mock/exam/${data.mock.attemptId}`);
    } catch (e) {
      toast.error("Failed to start mock");
      setGenerating(null);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mock Exams</h1>
        <p className="text-muted-foreground">
          Blueprint-based mock exams for your subjects.
        </p>
      </div>

      {blueprints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No blueprints available for your subjects yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {blueprints.map((bp) => (
            <Card key={bp.id}>
              <CardHeader>
                <CardTitle>{bp.name}</CardTitle>
                <CardDescription>{bp.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{bp.totalMarks} marks</Badge>
                  <Badge>{bp.durationMin} min</Badge>
                </div>
                <div className="space-y-1">
                  {bp.sections.map((sec, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{sec.name}</span>
                      <span>
                        {sec.questionCount} × {sec.questionType} -{" "}
                        {sec.totalMarks}m
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => startMock(bp.id)}
                  disabled={generating === bp.id}
                >
                  {generating === bp.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Start Mock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
