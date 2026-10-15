import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SearchHit {
  type: string;
  id: string;
  title: string;
  description: string;
  url: string;
}

async function indexedSearch(
  userId: string,
  text: string,
  type: string,
): Promise<SearchHit[] | null> {
  // Indexed path: stored notes vector plus trigram similarity on titles
  // and post content. Null means fall back to plain matching below.
  try {
    const hits: SearchHit[] = [];

    if (type === "all" || type === "notes") {
      const notes = await prisma.$queryRaw<
        Array<{ id: string; title: string; summary: string | null }>
      >`
        SELECT "id", "title", "summary"
        FROM "notes"
        WHERE "user_id" = ${userId}
          AND "search_tsv" @@ plainto_tsquery('simple', ${text})
        ORDER BY ts_rank("search_tsv", plainto_tsquery('simple', ${text})) DESC
        LIMIT 10
      `;
      hits.push(
        ...notes.map((n) => ({
          type: "note",
          id: n.id,
          title: n.title,
          description: n.summary?.slice(0, 120) ?? "",
          url: `/upload?id=${n.id}`,
        })),
      );
    }

    if (type === "all" || type === "quizzes") {
      const quizzes = await prisma.$queryRaw<
        Array<{ id: string; title: string; noteTitle: string }>
      >`
        SELECT "id", "title", "note_title" AS "noteTitle"
        FROM "quizzes"
        WHERE "user_id" = ${userId} AND "title" % ${text}
        ORDER BY similarity("title", ${text}) DESC
        LIMIT 10
      `;
      hits.push(
        ...quizzes.map((q) => ({
          type: "quiz",
          id: q.id,
          title: q.title,
          description: q.noteTitle,
          url: `/quizzes/${q.id}`,
        })),
      );
    }

    if (type === "all" || type === "community") {
      const posts = await prisma.$queryRaw<
        Array<{ id: string; content: string; subject: string | null }>
      >`
        SELECT "id", "content", "subject"
        FROM "posts"
        WHERE "content" % ${text}
        ORDER BY similarity("content", ${text}) DESC
        LIMIT 10
      `;
      hits.push(
        ...posts.map((p) => ({
          type: "post",
          id: p.id,
          title: `${p.content.slice(0, 50)}...`,
          description: p.subject || "Community post",
          url: `/community?id=${p.id}`,
        })),
      );
    }

    return hits;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all";

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 422 },
      );
    }

    if (query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchQuery = query.trim();

    const indexed = await indexedSearch(session.user.id, searchQuery, type);
    if (indexed) {
      return NextResponse.json({ results: indexed });
    }

    const lowered = searchQuery.toLowerCase();

    const results: {
      type: string;
      id: string;
      title: string;
      description: string;
      url: string;
    }[] = [];

    if (type === "all" || type === "notes") {
      const notes = await prisma.note.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { title: { contains: lowered } },
            { summary: { contains: lowered } },
          ],
        },
        select: { id: true, title: true, summary: true },
        take: 10,
      });
      results.push(
        ...notes.map((n) => ({
          type: "note",
          id: n.id,
          title: n.title,
          description: n.summary?.slice(0, 120) ?? "",
          url: `/upload?id=${n.id}`,
        })),
      );
    }

    if (type === "all" || type === "quizzes") {
      const quizzes = await prisma.quiz.findMany({
        where: {
          userId: session.user.id,
          title: { contains: lowered },
        },
        select: { id: true, title: true, noteTitle: true },
        take: 10,
      });
      results.push(
        ...quizzes.map((q) => ({
          type: "quiz",
          id: q.id,
          title: q.title,
          description: q.noteTitle,
          url: `/quizzes/${q.id}`,
        })),
      );
    }

    if (type === "all" || type === "community") {
      const posts = await prisma.post.findMany({
        where: {
          OR: [
            { content: { contains: lowered } },
            { subject: { contains: lowered } },
          ],
        },
        select: { id: true, content: true, subject: true },
        take: 10,
      });
      results.push(
        ...posts.map((p) => ({
          type: "post",
          id: p.id,
          title: `${p.content.slice(0, 50)}...`,
          description: p.subject || "Community post",
          url: `/community?id=${p.id}`,
        })),
      );
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
