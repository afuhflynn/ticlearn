"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function GCEExamsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GCE A-Level Exams</h1>
        <p className="text-muted-foreground">
          Prepare for your exams with AI-generated mock tests
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              GCE exam features are under development
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
