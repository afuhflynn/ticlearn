"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Question = {
  id: string;
  text: string;
  type: string;
  difficulty: number;
  marks: number;
  section: string | null;
  sourceType: string;
  createdAt: string;
  component: { name: string; code: string };
  topic: { name: string } | null;
  examSource: { year: number; sessionName: string } | null;
};

const TYPES = ["", "MCQ", "OPEN", "STRUCTURED", "PRACTICAL", "ESSAY"];

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterType) params.set("type", filterType);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setQuestions(data.questions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, filterType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/questions?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setTotal((prev) => prev - 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MCQ":
        return "bg-blue-100 text-blue-800";
      case "STRUCTURED":
        return "bg-purple-100 text-purple-800";
      case "PRACTICAL":
        return "bg-orange-100 text-orange-800";
      case "ESSAY":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">Questions</h1>
        <p className="text-sm text-muted-foreground">
          All general (non-Paper3) questions
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search text..."
            className="rounded-lg border px-3 py-1.5 text-sm w-48"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Search
          </button>
        </form>

        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t || "All Types"}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted-foreground">{total} questions</p>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          Loading...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : questions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No questions found.
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-4"
            >
              <div className="flex-1 min-w-0">
                <p className="line-clamp-2 text-sm">{q.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${getTypeColor(q.type)}`}
                  >
                    {q.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {q.marks} marks
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Difficulty: {q.difficulty}/5
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {q.component.name}
                  </span>
                  {q.topic && (
                    <span className="text-xs text-muted-foreground">
                      {q.topic.name}
                    </span>
                  )}
                  {q.examSource && (
                    <span className="text-xs text-muted-foreground">
                      {q.examSource.year} {q.examSource.sessionName}
                    </span>
                  )}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {q.sourceType}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(q.id)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
