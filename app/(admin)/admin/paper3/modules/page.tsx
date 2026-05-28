"use client";

import { useSession } from "@/lib/auth-client";
import { ArrowLeft, Layers, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type MockBrief = {
  id: string;
  title: string;
  subject: string;
  status: string;
  focusCategory: string;
  timeLimit: number;
  totalMarks: number;
};

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: string;
  visibleToAllStudents: boolean;
  _count: { mocks: number };
  mocks: MockBrief[];
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
    toast.success(
      "Module created. Open each mock's edit page to assign it to this group.",
    );
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
    <div className="space-y-8">
      <Link
        href="/admin/paper3/mocks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Mock Exams
      </Link>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-7 w-7 text-primary" />
          Paper 3 Mock Groups
        </h1>
        <p className="text-muted-foreground mt-2">
          Group mocks into named bundles (e.g. &ldquo;Term 1&rdquo;). To add
          mocks to a group, open each mock&apos;s edit page and pick the group
          from the &ldquo;Module&rdquo; dropdown.
        </p>
      </div>

      {/* Create module */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create a group</CardTitle>
          <CardDescription>
            Create a group, then assign mocks to it from each mock&apos;s edit
            page. Students see groups that are published AND visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label>Group name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GCE CS — Term 1 mocks"
            />
          </div>
          <Button type="button" onClick={createModule} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </CardContent>
      </Card>

      {/* Modules list */}
      <div className="space-y-6">
        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No groups yet.</p>
              <p className="text-sm mt-1">
                Create a group above, then assign mocks to it from each
                mock&apos;s edit page.
              </p>
            </CardContent>
          </Card>
        ) : (
          modules.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{m.title}</CardTitle>
                    <CardDescription>
                      {m._count.mocks} mock(s) &middot;{" "}
                      {m.status === "PUBLISHED" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        >
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="outline">{m.status}</Badge>
                      )}
                      {m.visibleToAllStudents ? (
                        <Badge
                          variant="outline"
                          className="ml-2 border-green-300 text-green-700 dark:text-green-400"
                        >
                          Visible to students
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="ml-2 border-amber-300 text-amber-700 dark:text-amber-400"
                        >
                          Hidden
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label className="text-xs text-muted-foreground">
                        Visible
                      </Label>
                      <Switch
                        checked={m.visibleToAllStudents}
                        onCheckedChange={(v) =>
                          toggle(m, {
                            visibleToAllStudents: v,
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggle(m, {
                          status:
                            m.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                        })
                      }
                    >
                      {m.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Mocks in this module */}
                {m.mocks.length === 0 ? (
                  <div className="py-4 text-sm text-muted-foreground text-center border rounded-lg bg-muted/20">
                    <p>No mocks in this group yet.</p>
                    <p className="text-xs mt-1">
                      Go to a mock&apos;s edit page and select this group from
                      the &ldquo;Module&rdquo; dropdown.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/admin/paper3/mocks">
                        Browse mocks to assign
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {m.mocks.map((mock) => (
                      <div
                        key={mock.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/20 transition-colors"
                      >
                        <div>
                          <Link
                            href={`/admin/paper3/mocks/${mock.id}`}
                            className="font-medium text-sm hover:text-primary hover:underline"
                          >
                            {mock.title}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {mock.subject} &middot;{" "}
                            {mock.focusCategory === "MIXED"
                              ? "Mixed"
                              : mock.focusCategory}{" "}
                            &middot; {mock.totalMarks} marks &middot;{" "}
                            {mock.timeLimit} min
                            {mock.status === "PUBLISHED" ? (
                              <Badge
                                variant="outline"
                                className="ml-2 border-green-200 text-green-600 text-[10px]"
                              >
                                Published
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="ml-2 text-[10px]"
                              >
                                {mock.status}
                              </Badge>
                            )}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/paper3/mocks/${mock.id}`}>
                            Edit
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
