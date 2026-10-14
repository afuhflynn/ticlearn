"use client";

import { format } from "date-fns";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFeedbacks, useSubmitFeedback } from "@/hooks/useFeedback";
import { useSession } from "@/lib/auth-client";

const feedbackTypes = [
  {
    value: "BUG",
    label: "Bug Report",
    description: "Report a technical issue",
  },
  {
    value: "FEATURE",
    label: "Feature Request",
    description: "Suggest a new feature",
  },
  {
    value: "GENERAL",
    label: "General Feedback",
    description: "Other feedback",
  },
];

export default function FeedbackPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [type, setType] = useState("GENERAL");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isFlagged, setIsFlagged] = useState(false);

  const { feedbacks, isLoading: isLoadingFeedbacks } = useFeedbacks();
  const submitFeedback = useSubmitFeedback();

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    router.push("/sign-in");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await submitFeedback.mutateAsync({ type, subject, message });
      setSubject("");
      setMessage("");
      setType("GENERAL");
    } catch {
      toast.error("Failed to submit feedback");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Send Feedback</h1>
        <p className="text-muted-foreground">
          Help us improve TiCLearn by sharing your thoughts
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
          <CardDescription>
            We value your input and will respond as soon as possible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Feedback Type</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {feedbackTypes.map((ft) => (
                  <button
                    key={ft.value}
                    type="button"
                    onClick={() => setType(ft.value)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      type === ft.value
                        ? "border-primary bg-primary/10"
                        : "hover:border-muted-foreground/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{ft.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {ft.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Brief description of your feedback"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more about your feedback..."
                rows={5}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFlagged}
                onChange={(e) => setIsFlagged(e.target.checked)}
                className="rounded border-input"
              />
              <span className="text-sm">Mark as important</span>
            </label>

            <Button
              type="submit"
              className="w-full"
              disabled={submitFeedback.isPending}
            >
              {submitFeedback.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Feedback
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Past Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingFeedbacks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : feedbacks.length > 0 ? (
            <div className="space-y-4">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{fb.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {fb.message}
                      </p>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {fb.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(fb.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No past feedback submitted
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
