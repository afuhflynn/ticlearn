"use client";

import Link from "next/link";
import { usePaper3Mocks } from "@/hooks";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  ARCHIVED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function Paper3MocksPage() {
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [search, setSearch] = useState("");
  const [modules, setModules] = useState<
    { id: string; title: string }[]
  >([]);
  const [modulesLoaded, setModulesLoaded] = useState(false);

  const { data, isLoading } = usePaper3Mocks({
    subject: subject || undefined,
    status: status || undefined,
  });

  if (!modulesLoaded) {
    fetch("/api/admin/paper3/modules")
      .then((r) => r.json())
      .then((d) => {
        if (d.modules) setModules(d.modules);
      })
      .catch(() => {})
      .finally(() => setModulesLoaded(true));
  }

  const mocks = data?.mocks ?? [];

  const filteredMocks = mocks.filter((m: any) => {
    if (moduleId && m.module?.id !== moduleId) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.title?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/paper3/questions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Questions
      </Link>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Paper 3 Mock Exams</h1>
          <p className="text-muted-foreground mt-1">
            Create, edit, and publish mock exams. Published mocks with
            &quot;visible to all students&quot; appear in the student catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/paper3/mocks/create">Create Mock</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/paper3/modules">
              <Plus className="mr-2 h-4 w-4" />
              Mock Groups
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Select value={subject} onValueChange={(v) => setSubject(v === "all" ? "" : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="ICT">ICT</SelectItem>
                  <SelectItem value="COMPUTER_SCIENCE">
                    Computer Science
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Mock Group</Label>
              <Select value={moduleId} onValueChange={(v) => setModuleId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  <SelectItem value="__none">No Group</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-1 min-w-[200px]">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mocks list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No mock exams found.</p>
            <p className="text-sm mt-1">
              Create your first mock exam to get started.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/admin/paper3/mocks/create">Create Mock</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMocks.map(
            (mock: {
              id: string;
              title: string;
              subject: string;
              status: string;
              focusCategory?: string;
              totalMarks?: number;
              timeLimit?: number;
              module?: { id: string; title: string; status: string } | null;
              visibleToAllStudents?: boolean;
              _count?: { attempts?: number };
              questions?: { questionId: string }[];
            }) => (
              <Card key={mock.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/paper3/mocks/${mock.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {mock.title}
                        </Link>
                        <Badge
                          className={
                            STATUS_COLORS[mock.status] ?? "bg-gray-100"
                          }
                          variant="outline"
                        >
                          {mock.status}
                        </Badge>
                        {mock.visibleToAllStudents ? (
                          <Badge
                            variant="outline"
                            className="border-green-300 text-green-700 dark:text-green-400"
                          >
                            Visible to students
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-300 text-amber-700 dark:text-amber-400"
                          >
                            Hidden from catalog
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>{mock.subject}</span>
                        {mock.focusCategory && (
                          <>
                            <span>•</span>
                            <span>{mock.focusCategory}</span>
                          </>
                        )}
                        {mock.totalMarks && (
                          <>
                            <span>•</span>
                            <span>{mock.totalMarks} marks</span>
                          </>
                        )}
                        {mock.timeLimit && (
                          <>
                            <span>•</span>
                            <span>{mock.timeLimit} min</span>
                          </>
                        )}
                        {mock.questions && (
                          <>
                            <span>•</span>
                            <span>{mock.questions.length} questions</span>
                          </>
                        )}
                        {mock._count?.attempts !== undefined && (
                          <>
                            <span>•</span>
                            <span>{mock._count.attempts} attempts</span>
                          </>
                        )}
                      </div>
                      {mock.module && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Group: {mock.module.title}
                          {mock.module.status === "PUBLISHED" ? (
                            <Badge
                              variant="outline"
                              className="ml-2 border-green-200 text-green-600 text-[10px]"
                            >
                              Published
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="ml-2 border-gray-200 text-gray-500 text-[10px]"
                            >
                              {mock.module.status}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/practice/exam/${mock.id}`}>Preview</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/paper3/mocks/${mock.id}`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
