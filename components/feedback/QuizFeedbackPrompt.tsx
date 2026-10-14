"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";

export function QuizFeedbackPrompt({ quizId }: { quizId: string }) {
  const storageKey = `quiz_feedback_${quizId}`;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(storageKey) === "true";
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (dismissed) return null;

  const handleSubmit = async () => {
    if (!message.trim()) {
      setDismissed(true);
      localStorage.setItem(storageKey, "true");
      return;
    }
    setSubmitting(true);
    try {
      await api.mutations.feedback.create({
        type: "GENERAL",
        subject: "Quiz Feedback",
        message: message.trim(),
      });
      localStorage.setItem(storageKey, "true");
      setDismissed(true);
      toast.success("Feedback submitted. Thank you!");
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm font-medium">How was this quiz? Any issues?</p>
          <Textarea
            placeholder="Tell us about your experience (optional)..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDismissed(true);
                localStorage.setItem(storageKey, "true");
              }}
            >
              Skip
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              Send feedback
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
