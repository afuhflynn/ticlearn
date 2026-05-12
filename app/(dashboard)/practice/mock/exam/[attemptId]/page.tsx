"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Clock, Send } from "lucide-react";
import { toast } from "sonner";

interface SectionData {
  name: string;
  questionCount: number;
  totalMarks: number;
  questionType: string;
  answerRule: string | null;
  marksPerQuestion: number | null;
}

export default function MockExamPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [sections, setSections] = useState<SectionData[]>([]);
  const [blueprintName, setBlueprintName] = useState("");
  const [totalMarks, setTotalMarks] = useState(0);
  const [durationMin, setDurationMin] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started] = useState(Date.now());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`/api/mocks/attempts/${attemptId}`)
      .then(r => r.json())
      .then(data => {
        setSections(data.sections || []);
        setBlueprintName(data.blueprint?.name || "");
        setTotalMarks(data.blueprint?.totalMarks || 0);
        const dur = data.blueprint?.durationMin || 0;
        setDurationMin(dur);
        setTimeLeft(dur * 60);
        setAnswers(data.answers || {});
        setLoading(false);
      })
      .catch(() => { toast.error("Failed to load mock"); router.push("/practice/mock"); });
  }, [attemptId, router]);

  useEffect(() => {
    if (timeLeft <= 0 || loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!confirm("Submit your mock exam?")) return;
    setSubmitting(true);
    try {
      const timeTaken = Math.floor((Date.now() - started) / 1000);
      const res = await fetch("/api/mocks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers, timeTaken }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      router.push(`/practice/mock/result/${attemptId}?score=${data.score}&total=${data.totalMarks}&pct=${data.percentage}`);
    } catch (e) {
      toast.error("Failed to submit");
    }
    setSubmitting(false);
  };

  const autoSubmit = () => {
    toast.warning("Time's up! Auto-submitting...");
    handleSubmit();
  };

  useEffect(() => {
    if (timeLeft === 0 && !loading && durationMin > 0) autoSubmit();
  }, [timeLeft]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const generatePlaceholder = (section: SectionData) => {
    if (section.questionType === "MCQ") return "Type your answer (e.g., A, B, C, D)...";
    return `Write your ${section.questionType.toLowerCase()} answer here...`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="sticky top-0 z-10 rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{blueprintName}</h1>
            <p className="text-sm text-muted-foreground">{totalMarks} marks</p>
          </div>
          <div className="flex items-center gap-4">
            {timeLeft > 0 && (
              <div className="flex items-center gap-2 text-lg font-mono">
                <Clock className="h-5 w-5" />
                <span className={timeLeft < 300 ? "text-red-500" : ""}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <Badge>{Object.keys(answers).length} answered</Badge>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit
            </Button>
          </div>
        </div>
      </div>

      {sections.map((sec, si) => (
        <Card key={si}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{sec.name}</CardTitle>
                <CardDescription>
                  {sec.questionCount} questions · {sec.totalMarks} marks · {sec.questionType}
                  {sec.answerRule && ` · ${sec.answerRule}`}
                </CardDescription>
              </div>
              <Badge variant="outline">{sec.marksPerQuestion ?? "var"} marks each</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: sec.questionCount }, (_, qi) => {
              const qId = `${si}_${qi}`;
              return (
                <div key={qId} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <p className="font-medium">Question {qi + 1}</p>
                    <Badge variant="outline">{sec.marksPerQuestion ?? "?"} marks</Badge>
                  </div>
                  <Textarea
                    placeholder={generatePlaceholder(sec)}
                    value={answers[qId] || ""}
                    onChange={e => setAnswers(prev => ({ ...prev, [qId]: e.target.value }))}
                    rows={4}
                    className="mt-2"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center pb-8">
        <Button size="lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit Mock Exam
        </Button>
      </div>
    </div>
  );
}
