"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useApprovePaper3Question,
  usePaper3Questions,
  useRejectPaper3Question,
} from "@/hooks";
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
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export default function Paper3QuestionsPage() {
  const [filter, setFilter] = useState({
    status: "",
    section: "",
    source: "",
    subject: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, refetch } = usePaper3Questions(filter);
  const approveQuestion = useApprovePaper3Question();
  const rejectQuestion = useRejectPaper3Question();

  const handleFilterChange = (key: string, value: string) => {
    setFilter({ ...filter, [key]: value === "all" ? "" : value });
    setPage(1);
  };

  const questions = data?.questions ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/paper3/upload"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Upload Sources
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Paper 3 Questions</h1>
        <p className="text-muted-foreground mt-1">
          Review, approve, and manage extracted questions. Click a question
          title to review it in detail.
        </p>
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
              <Select
                value={filter.status}
                onValueChange={(v) => handleFilterChange("status", v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Section</Label>
              <Select
                value={filter.section}
                onValueChange={(v) => handleFilterChange("section", v)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Select
                value={filter.subject}
                onValueChange={(v) => handleFilterChange("subject", v)}
              >
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
              <Label className="text-xs">Source</Label>
              <Select
                value={filter.source}
                onValueChange={(v) => handleFilterChange("source", v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {data?.sources?.map((s: { id: string; title: string }) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
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
                  placeholder="Search title or question number..."
                  value={filter.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No questions match your filters.
            </CardContent>
          </Card>
        ) : (
          questions.map(
            (question: {
              id: string;
              questionNumber: string;
              title: string;
              status: string;
              marks: number;
              section: string;
              taskType: string;
              content: string;
              subject?: string;
              source?: { id: string; title: string };
            }) => (
              <Card key={question.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/paper3/review/${question.id}`}
                          className="font-medium hover:text-primary hover:underline flex items-center gap-1"
                        >
                          {question.questionNumber}: {question.title}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                        <Badge
                          className={getStatusColor(question.status)}
                          variant="outline"
                        >
                          {question.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>Section {question.section}</span>
                        <span>•</span>
                        <span>{question.taskType}</span>
                        <span>•</span>
                        <span>{question.marks} marks</span>
                        {question.subject && (
                          <>
                            <span>•</span>
                            <span>{question.subject}</span>
                          </>
                        )}
                        {question.source && (
                          <>
                            <span>•</span>
                            <span>{question.source.title}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {question.status === "PENDING" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            approveQuestion.mutate(question.id);
                            refetch();
                          }}
                          disabled={approveQuestion.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            rejectQuestion.mutate({ id: question.id });
                            refetch();
                          }}
                          disabled={rejectQuestion.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ),
          )
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
