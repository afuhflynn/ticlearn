"use client";

import { useSession } from "@/lib/auth-client";
import { Loader2, Layers, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: string;
  visibleToAllStudents: boolean;
  _count: { mocks: number };
};

export default function Paper3ModulesPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [title, setTitle] = useState("");

  const load = () => {
    fetch("/api/admin/paper3/modules")
      .then((r) => r.json())
      .then((d) => {
        if (d.modules) setModules(d.modules);
      })
      .catch(() => toast.error("Failed to load modules"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const createModule = async () => {
    if (!title.trim()) {
      toast.error("Enter a module name");
      return;
    }
    const res = await fetch("/api/admin/paper3/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not create");
      return;
    }
    toast.success("Module created");
    setTitle("");
    load();
  };

  const toggle = async (m: ModuleRow, patch: Partial<ModuleRow>) => {
    const res = await fetch(`/api/admin/paper3/modules/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    load();
  };

  if (sessionLoading || loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-7 w-7 text-primary" />
          Paper 3 mock modules
        </h1>
        <p className="text-muted-foreground mt-2">
          Group mocks into named bundles (e.g. term prep). Publish the module and
          enable &quot;Visible to all students&quot; so learners see every published
          mock inside it, even if individual catalog visibility is off.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New module</CardTitle>
          <CardDescription>Create a draft module, then assign mocks from each mock&apos;s edit page.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GCE CS — Term 1 mocks"
            />
          </div>
          <Button type="button" onClick={createModule} className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {modules.map((m) => (
          <Card key={m.id}>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-sm text-muted-foreground">
                  {m._count.mocks} mock(s) · {m.status}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toggle(m, {
                      status: m.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                    })
                  }
                >
                  {m.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toggle(m, {
                      visibleToAllStudents: !m.visibleToAllStudents,
                    })
                  }
                >
                  {m.visibleToAllStudents ? "Hide from all" : "Show to all"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {modules.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No modules yet.
          </p>
        )}
      </div>
    </div>
  );
}
