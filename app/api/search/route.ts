import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchQuery = query.toLowerCase();

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
            { title: { contains: searchQuery } },
            { summary: { contains: searchQuery } },
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
          title: { contains: searchQuery },
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
            { content: { contains: searchQuery } },
            { subject: { contains: searchQuery } },
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
