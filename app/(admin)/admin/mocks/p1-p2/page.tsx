"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  ClipboardList,
  History,
  Loader2,
  Plus,
  Trash2,
  Layers,
  GripVertical,
  Eye,
  EyeOff,
  EyeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type PaperComponentOption = {
  id: string;
  name: string;
  code: string;
  topics: Array<{ id: string; name: string }>;
  programName: string;
  examLevelName: string;
};

type AdminPreview = {
  id: string;
  title: string;
  totalMarks: number;
  score: number | null;
  completedAt: string | null;
  startedAt: string;
  durationMin: number | null;
  inProgress: boolean;
};

type AdminBlueprintRow = {
  id: string;
  name: string;
  component: { type: string; name: string; program: { name: string } };
};

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  visibleToStudents: boolean;
  sortOrder: number;
  items: Array<{
    id: string;
    sortOrder: number;
    blueprint: {
      id: string;
      name: string;
      totalMarks: number;
      durationMin: number;
      component: {
        name: string;
        program: { name: string; examLevel: { name: string } };
      };
    };
  }>;
};

type AdminPreviewDetail = {
  attemptId: string;
  displayName: string;
  durationMin: number;
  totalMarks: number;
  sections: Array<{
    name: string;
    questions: Array<{
      questionId: string;
      text: string;
      type: string;
      marks: number;
      options?: Array<{ letter: string; label: string }>;
      correctOption?: string;
      modelAnswer?: string;
    }>;
  }>;
};

export default function AdminPaper1Paper2MocksPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const [activeTab, setActiveTab] = useState("preview");

  const [components, setComponents] = useState<PaperComponentOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [componentId, setComponentId] = useState("");
  const [paper, setPaper] = useState<"PAPER_1" | "PAPER_2">("PAPER_1");
  const [scope, setScope] = useState<"FULL_SYLLABUS" | "TOPICS">(
    "FULL_SYLLABUS",
  );
  const [pickedTopics, setPickedTopics] = useState<Record<string, boolean>>({});

  const [creatingCustom, setCreatingCustom] = useState(false);

  const [previews, setPreviews] = useState<AdminPreview[]>([]);
  const [previewsLoading, setPreviewsLoading] = useState(true);

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);

  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [allBlueprints, setAllBlueprints] = useState<AdminBlueprintRow[]>([]);

  const [examName, setExamName] = useState("");
  const [examPaper, setExamPaper] = useState<"PAPER_1" | "PAPER_2">("PAPER_1");
  const [examComponentId, setExamComponentId] = useState("");
  const [addToCatalogToo, setAddToCatalogToo] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [savingExamForModule, setSavingExamForModule] = useState<string | null>(
    null,
  );

  const [pickBlueprintId, setPickBlueprintId] = useState<string>("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<AdminPreviewDetail | null>(
    null,
  );
  const [attaching, setAttaching] = useState(false);

  const loadPreviews = useCallback(() => {
    setPreviewsLoading(true);
    fetch("/api/admin/mocks/p1p2/previews")
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && Array.isArray(d.attempts)) setPreviews(d.attempts);
        else setPreviews([]);
      })
      .catch(() => setPreviews([]))
      .finally(() => setPreviewsLoading(false));
  }, []);

  const loadModules = useCallback(() => {
    setModulesLoading(true);
    fetch("/api/admin/mocks/p1p2/modules")
      .then(async (r) => {
        const d = await r.json();
        if (r.ok && Array.isArray(d.modules)) setModules(d.modules as ModuleRow[]);
        else setModules([]);
      })
      .catch(() => setModules([]))
      .finally(() => setModulesLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/mocks/p1p2/options")
      .then((r) => r.json())
      .then((d: { components?: PaperComponentOption[] }) => {
        const list = d.components ?? [];
        setComponents(list);
        setComponentId((prev) => prev || list[0]?.id || "");
        setExamComponentId((prev) => prev || list[0]?.id || "");
      })
      .catch(() => toast.error("Could not load subject papers"))
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/blueprints")
      .then((r) => r.json())
      .then((d: { blueprints?: AdminBlueprintRow[] }) => {
        const b = d.blueprints?.filter((x) => x.component?.type === "PAPER") ?? [];
        setAllBlueprints(b);
        setPickBlueprintId((prev) =>
          prev && b.some((x) => x.id === prev) ?
            prev
          : b[0]?.id ?? "",
        );
      })
      .catch(() => setAllBlueprints([]));
  }, []);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const openPreviewModal = useCallback(async (attemptId: string) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewDetail(null);
    try {
      const res = await fetch(`/api/admin/mocks/p1p2/preview/${attemptId}`);
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "Could not load preview",
        );
      setPreviewDetail(data.preview as AdminPreviewDetail);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load preview");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const selectedComp = components.find((c) => c.id === componentId);

  useEffect(() => {
    setPickedTopics({});
  }, [componentId]);

  const toggleTopic = (topicId: string, checked: boolean) => {
    setPickedTopics((prev) => ({ ...prev, [topicId]: checked }));
  };

  const runGenerateCustom = async () => {
    if (!componentId) {
      toast.error("Choose a subject paper");
      return;
    }
    if (scope === "TOPICS") {
      const ids = Object.entries(pickedTopics)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (ids.length === 0) {
        toast.error("Select at least one topic");
        return;
      }
    }

    const topicIds =
      scope === "TOPICS"
        ? Object.entries(pickedTopics)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : undefined;

    setCreatingCustom(true);
    try {
      const res = await fetch("/api/admin/mocks/p1p2/generate-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId,
          paper,
          scope: scope === "TOPICS" ? "TOPICS" : "FULL_SYLLABUS",
          topicIds,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Could not build mock",
        );
      }
      toast.success("Preview ready — questions open in the dialog.");
      loadPreviews();
      void openPreviewModal(body.mock.attemptId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build mock");
    } finally {
      setCreatingCustom(false);
    }
  };

  const createGroup = async () => {
    const t = newGroupTitle.trim();
    if (!t) {
      toast.error("Enter a group name");
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/admin/mocks/p1p2/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(typeof data.error === "string" ? data.error : "Failed");
      toast.success("Group created");
      setNewGroupTitle("");
      loadModules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCreatingGroup(false);
    }
  };

  const patchModule = async (
    moduleId: string,
    patch: { visibleToStudents?: boolean; title?: string },
  ) => {
    try {
      const res = await fetch(`/api/admin/mocks/p1p2/modules/${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Update failed");
      loadModules();
    } catch {
      toast.error("Could not update group");
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm("Delete this group? Exams stay in the database; only the grouping is removed."))
      return;
    try {
      const res = await fetch(`/api/admin/mocks/p1p2/modules/${moduleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Group removed");
      loadModules();
    } catch {
      toast.error("Could not delete group");
    }
  };

  const createExamInModule = async (moduleId: string) => {
    if (!examName.trim()) {
      toast.error("Enter an exam title");
      return;
    }
    if (!examComponentId) {
      toast.error("Choose a subject paper");
      return;
    }
    setSavingExam(true);
    setSavingExamForModule(moduleId);
    try {
      const res = await fetch("/api/admin/mocks/p1p2/preset-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentId: examComponentId,
          paper: examPaper,
          name: examName.trim(),
          moduleId,
          alsoListInPracticeCatalog: addToCatalogToo,
          visibleForStudents: addToCatalogToo ? true : undefined,
          visibleInCommunity: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Save failed",
        );
      }
      toast.success("Exam added to group");
      setExamName("");
      setAddToCatalogToo(false);
      loadModules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingExam(false);
      setSavingExamForModule(null);
    }
  };

  const addExistingToModule = async (moduleId: string) => {
    if (!pickBlueprintId) {
      toast.error("Pick a blueprint");
      return;
    }
    try {
      const res = await fetch(
        `/api/admin/mocks/p1p2/modules/${moduleId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blueprintId: pickBlueprintId }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed");
      }
      toast.success("Exam linked to group");
      loadModules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const removeItem = async (moduleId: string, itemId: string) => {
    try {
      const res = await fetch(
        `/api/admin/mocks/p1p2/modules/${moduleId}/items/${itemId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error();
      toast.success("Removed from group");
      loadModules();
    } catch {
      toast.error("Could not remove");
    }
  };

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      if (draggableId.startsWith("preview-")) {
        const attemptId = draggableId.slice("preview-".length);
        if (!destination.droppableId.startsWith("module-")) return;
        const moduleId = destination.droppableId.slice("module-".length);
        setAttaching(true);
        try {
          const res = await fetch(
            `/api/admin/mocks/p1p2/modules/${moduleId}/items/from-attempt`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ attemptId }),
            },
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof data.error === "string" ? data.error : "Failed",
            );
          }
          toast.success("Preview added to group");
          loadModules();
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Could not add preview to group",
          );
        } finally {
          setAttaching(false);
        }
        return;
      }

      if (draggableId.startsWith("item-")) {
        const itemId = draggableId.slice("item-".length);
        const destMod = destination.droppableId.startsWith("module-")
          ? destination.droppableId.slice("module-".length)
          : "";
        const srcMod = source.droppableId.startsWith("module-")
          ? source.droppableId.slice("module-".length)
          : "";
        if (!destMod || !srcMod) return;

        if (srcMod === destMod) {
          const mod = modules.find((m) => m.id === destMod);
          if (!mod) return;
          const list = [...mod.items];
          const [removed] = list.splice(source.index, 1);
          list.splice(destination.index, 0, removed);
          try {
            const res = await fetch(
              `/api/admin/mocks/p1p2/modules/${destMod}/items/reorder`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderedItemIds: list.map((x) => x.id),
                }),
              },
            );
            if (!res.ok) throw new Error();
            loadModules();
          } catch {
            toast.error("Could not reorder");
          }
        } else {
          try {
            const res = await fetch(
              `/api/admin/mocks/p1p2/module-items/${itemId}/move`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  targetModuleId: destMod,
                  targetIndex: destination.index,
                }),
              },
            );
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              throw new Error(
                typeof data.error === "string" ? data.error : "Failed",
              );
            }
            loadModules();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not move");
          }
        }
      }
    },
    [modules, loadModules],
  );

  if (sessionLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }

  const canConfigure = !optionsLoading && components.length > 0;
  const visibleGroups = modules.filter((m) => m.visibleToStudents).length;
  const totalItems = modules.reduce((acc, m) => acc + m.items.length, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      {/* Header */}
      <div>
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex flex-wrap items-center gap-2">
          Paper 1 &amp; 2 — Mock Groups &amp; Previews
          <Badge variant="secondary" className="font-normal">
            GCE
          </Badge>
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
          Generate admin-only previews, then drag them into groups to publish as
          catalog exams for students.
        </p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Previews
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            <p className="text-2xl font-bold">{previews.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Groups
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            <p className="text-2xl font-bold">{modules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visible to students
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            <p className="text-2xl font-bold text-green-600">{visibleGroups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total exams
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4 pt-0">
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="preview" className="gap-2">
              <History className="h-4 w-4" />
              Generate &amp; Preview
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Layers className="h-4 w-4" />
              Mock Groups ({modules.length})
            </TabsTrigger>
          </TabsList>

          {/* === TAB 1: Generate & Preview === */}
          <TabsContent value="preview" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Generate preview (admin only)</CardTitle>
                <CardDescription>
                  Build a real timed session tagged as <em>admin-only</em> — it
                  will not appear on student dashboards. After generating, you
                  can drag it into a mock group below to publish it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!canConfigure ? (
                  optionsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No PAPER components found.
                    </p>
                  )
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Subject paper</Label>
                      <Select value={componentId} onValueChange={setComponentId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select paper" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {components.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.examLevelName} · {c.programName} — {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Paper</Label>
                      <RadioGroup
                        value={paper}
                        onValueChange={(v) => setPaper(v as "PAPER_1" | "PAPER_2")}
                        className="flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="PAPER_1" id="p1" />
                          <Label htmlFor="p1">Paper 1 (MCQ)</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="PAPER_2" id="p2" />
                          <Label htmlFor="p2">Paper 2 (structured)</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-3">
                      <Label>Scope</Label>
                      <RadioGroup
                        value={scope}
                        onValueChange={(v) =>
                          setScope(v as "FULL_SYLLABUS" | "TOPICS")
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="FULL_SYLLABUS" id="full" />
                          <Label htmlFor="full">Full syllabus</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="TOPICS" id="top" />
                          <Label htmlFor="top">Topics</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {scope === "TOPICS" && selectedComp && (
                      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                        <Label className="text-xs uppercase text-muted-foreground">
                          Topics
                        </Label>
                        {selectedComp.topics.map((t) => (
                          <label
                            key={t.id}
                            className="flex cursor-pointer items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={!!pickedTopics[t.id]}
                              onCheckedChange={(c) => toggleTopic(t.id, c === true)}
                            />
                            {t.name}
                          </label>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={runGenerateCustom}
                      disabled={creatingCustom}
                      className="gap-2"
                    >
                      {creatingCustom ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Generate preview
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Admin preview sessions
                </CardTitle>
                <CardDescription>
                  Drag a row into a mock group (switch to the Groups tab) to
                  publish that structure as a catalog exam. Use{" "}
                  <strong>View questions</strong> to inspect stems and keys.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {previewsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : previews.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <p>No admin previews yet.</p>
                    <p className="mt-1">
                      Generate a preview above, then drag it into a mock group
                      to publish.
                    </p>
                  </div>
                ) : (
                  <Droppable droppableId="admin-previews">
                    {(prevProvided) => (
                      <ul
                        ref={prevProvided.innerRef}
                        {...prevProvided.droppableProps}
                        className="divide-y rounded-lg border"
                      >
                        {previews.map((a, index) => (
                          <Draggable
                            key={a.id}
                            draggableId={`preview-${a.id}`}
                            index={index}
                            isDragDisabled={attaching}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <li
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  opacity: dragSnapshot.isDragging ? 0.85 : 1,
                                }}
                                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex min-w-0 flex-1 items-start gap-2">
                                  <button
                                    type="button"
                                    className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                    {...dragProvided.dragHandleProps}
                                    aria-label="Drag preview"
                                  >
                                    <GripVertical className="h-5 w-5 shrink-0" />
                                  </button>
                                  <div>
                                    <p className="font-medium leading-snug">{a.title}</p>
                                    <p className="text-muted-foreground text-xs">
                                      {a.inProgress ? "In progress · " : ""}
                                      {typeof a.durationMin === "number" ?
                                        `${a.durationMin} min · `
                                      : ""}
                                      {a.totalMarks} marks ·{" "}
                                      {formatRelativeTime(a.completedAt ?? a.startedAt)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  type="button"
                                  onClick={() => void openPreviewModal(a.id)}
                                >
                                  View questions
                                </Button>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {prevProvided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              Drag a preview row above, then{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => setActiveTab("groups")}
              >
                switch to Mock Groups
              </button>{" "}
              to drop it into a group.
            </p>
          </TabsContent>

          {/* === TAB 2: Mock Groups === */}
          <TabsContent value="groups" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Mock groups
                    </CardTitle>
                    <CardDescription>
                      Groups bundle exams into named collections. Students see
                      groups when <strong>Visible</strong> is toggled on.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-2">
                    <Label>New group name</Label>
                    <Input
                      value={newGroupTitle}
                      onChange={(e) => setNewGroupTitle(e.target.value)}
                      placeholder="e.g. November revision pack"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={createGroup}
                    disabled={creatingGroup}
                    variant="secondary"
                  >
                    {creatingGroup ?
                      <Loader2 className="h-4 w-4 animate-spin" />
                    : "Create group"}
                  </Button>
                </div>

                <p className="text-muted-foreground text-xs">
                  Advanced: full blueprint editor at{" "}
                  <Link
                    href="/admin/blueprints"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Exam blueprints
                  </Link>
                  .
                </p>

                {modulesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : modules.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <p>No groups yet.</p>
                    <p className="mt-1">
                      Create a group above, then add exams by dropping a preview
                      from the Generate tab or using the Add exams panel.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {modules.map((mod) => (
                      <Collapsible key={mod.id} defaultOpen>
                        <div className="rounded-lg border bg-card">
                          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold leading-tight">
                                  {mod.title}
                                </p>
                                {mod.description ?
                                  <p className="text-muted-foreground mt-1 text-sm">
                                    {mod.description}
                                  </p>
                                : null}
                              </div>
                              {mod.visibleToStudents ? (
                                <Badge
                                  variant="secondary"
                                  className="shrink-0 gap-1"
                                >
                                  <EyeIcon className="h-3 w-3" />
                                  Visible
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 gap-1 text-muted-foreground"
                                >
                                  <EyeOff className="h-3 w-3" />
                                  Hidden
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                  {mod.visibleToStudents ?
                                    "Show to students"
                                  : "Hide from students"}
                                </Label>
                                <Switch
                                  checked={mod.visibleToStudents}
                                  onCheckedChange={(v) =>
                                    patchModule(mod.id, { visibleToStudents: v })
                                  }
                                />
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button size="sm" variant="outline" type="button">
                                  <ClipboardList className="mr-1 h-4 w-4" />
                                  {mod.items.length > 0
                                    ? `${mod.items.length} exams`
                                    : "Add exams"}
                                </Button>
                              </CollapsibleTrigger>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                type="button"
                                onClick={() => deleteModule(mod.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <Droppable droppableId={`module-${mod.id}`}>
                            {(dropProvided, dropSnapshot) => (
                              <div
                                ref={dropProvided.innerRef}
                                {...dropProvided.droppableProps}
                                className={`border-t px-4 py-3 ${
                                  dropSnapshot.isDraggingOver ?
                                    "bg-primary/10"
                                  : "bg-muted/20"
                                }`}
                              >
                                <p className="text-muted-foreground mb-2 text-xs">
                                  Drop previews here · drag rows to reorder
                                </p>
                                {mod.items.length === 0 ?
                                  <p className="text-muted-foreground py-2 text-sm">
                                    No exams yet — drop an admin preview (from
                                    the Generate tab) or use Add exams below.
                                  </p>
                                : mod.items.map((it, index) => (
                                    <Draggable
                                      key={it.id}
                                      draggableId={`item-${it.id}`}
                                      index={index}
                                    >
                                      {(dragProvided, dragSnapshot) => (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          style={{
                                            ...dragProvided.draggableProps.style,
                                            opacity: dragSnapshot.isDragging ? 0.9 : 1,
                                          }}
                                          className="mb-2 flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm"
                                        >
                                          <button
                                            type="button"
                                            className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                            {...dragProvided.dragHandleProps}
                                            aria-label="Drag to reorder or move group"
                                          >
                                            <GripVertical className="h-4 w-4 shrink-0" />
                                          </button>
                                          <span className="min-w-0 flex-1 truncate">
                                            <span className="font-medium">{it.blueprint.name}</span>
                                            <span className="text-muted-foreground">
                                              {" "}
                                              · {it.blueprint.component.program.examLevel.name}{" "}
                                              {it.blueprint.component.program.name} ·{" "}
                                              {it.blueprint.durationMin} min ·{" "}
                                              {it.blueprint.totalMarks} marks
                                            </span>
                                          </span>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="shrink-0 text-destructive"
                                            onClick={() => removeItem(mod.id, it.id)}
                                            aria-label="Remove from group"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))
                                }
                                {dropProvided.placeholder}
                              </div>
                            )}
                          </Droppable>

                          <CollapsibleContent>
                            <div className="space-y-6 border-t px-4 py-4">
                              <div className="space-y-3 rounded-lg border bg-background p-4">
                                <p className="text-sm font-medium">
                                  Add a new timed exam
                                </p>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="space-y-2 sm:col-span-2">
                                    <Label>Title</Label>
                                    <Input
                                      value={examName}
                                      onChange={(e) => setExamName(e.target.value)}
                                      placeholder="Shown to students"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Subject paper</Label>
                                    <Select
                                      value={examComponentId}
                                      onValueChange={setExamComponentId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-72">
                                        {components.map((c) => (
                                          <SelectItem key={c.id} value={c.id}>
                                            {c.examLevelName} · {c.programName} — {c.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Template</Label>
                                    <RadioGroup
                                      value={examPaper}
                                      onValueChange={(v) =>
                                        setExamPaper(v as "PAPER_1" | "PAPER_2")
                                      }
                                      className="flex gap-4 pt-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value="PAPER_1" id={`ep1-${mod.id}`} />
                                        <Label htmlFor={`ep1-${mod.id}`}>Paper 1</Label>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <RadioGroupItem value="PAPER_2" id={`ep2-${mod.id}`} />
                                        <Label htmlFor={`ep2-${mod.id}`}>Paper 2</Label>
                                      </div>
                                    </RadioGroup>
                                  </div>
                                </div>
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={addToCatalogToo}
                                    onCheckedChange={(c) => setAddToCatalogToo(c === true)}
                                  />
                                  Also list outside this group under &quot;More
                                  mocks&quot; (independent catalog listing)
                                </label>
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={savingExam}
                                  onClick={() => void createExamInModule(mod.id)}
                                >
                                  {savingExam && savingExamForModule === mod.id ?
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  : "Create and attach exam"}
                                </Button>
                              </div>

                              <div className="space-y-3 rounded-lg border bg-background p-4">
                                <p className="text-sm font-medium">
                                  Or link an existing blueprint
                                </p>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                  <div className="flex-1 space-y-2">
                                    <Label>Blueprint</Label>
                                    <Select
                                      value={pickBlueprintId}
                                      onValueChange={setPickBlueprintId}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select…" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-64">
                                        {allBlueprints.map((b) => (
                                          <SelectItem key={b.id} value={b.id}>
                                            {b.name} ({b.component.program.name})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addExistingToModule(mod.id)}
                                    disabled={!pickBlueprintId}
                                  >
                                    Add to group
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DragDropContext>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[min(90vh,calc(100vh-4rem))] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
            <DialogTitle className="pr-8 leading-snug">
              {previewDetail?.displayName ?? "Mock preview"}
            </DialogTitle>
            <DialogDescription>
              {previewDetail ?
                <>
                  {previewDetail.durationMin} min · {previewDetail.totalMarks} marks · admin review
                  (includes marking keys)
                </>
              : "Loading…"}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {previewLoading ?
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            : previewDetail ?
              <div className="space-y-8">
                {previewDetail.sections.map((sec) => (
                  <section key={sec.name} className="space-y-4">
                    <h3 className="text-foreground border-b pb-1 text-sm font-semibold tracking-wide uppercase">
                      {sec.name}
                    </h3>
                    <ol className="list-decimal space-y-6 pl-5 marker:font-medium">
                      {sec.questions.map((q, qi) => (
                        <li key={q.questionId || qi} className="space-y-2 pl-1">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {q.text}
                          </p>
                          <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">{q.type}</Badge>
                            <span>{q.marks} marks</span>
                            {q.correctOption ?
                              <span className="text-primary font-medium">
                                Key: {q.correctOption}
                              </span>
                            : null}
                          </div>
                          {q.options && q.options.length > 0 ?
                            <ul className="border-muted mt-2 grid gap-1.5 rounded-md border bg-muted/20 p-3 text-sm">
                              {q.options.map((o) => (
                                <li
                                  key={o.letter}
                                  className={
                                    o.letter === q.correctOption ?
                                      "font-medium text-primary"
                                    : ""
                                  }
                                >
                                  <span className="font-mono">{o.letter}.</span> {o.label}
                                </li>
                              ))}
                            </ul>
                          : null}
                          {q.modelAnswer ?
                            <div className="border-primary/20 bg-primary/5 mt-2 rounded-md border p-3 text-sm">
                              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                                Model answer
                              </p>
                              <p className="whitespace-pre-wrap">{q.modelAnswer}</p>
                            </div>
                          : null}
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
