import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Fetch every page of a note together with its visual analysis result.
 * Owner only: the caller must own the note, else 403.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { noteId } = await params;

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId: session.user.id },
      select: { id: true },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const pages = await prisma.page.findMany({
      where: { noteId },
      orderBy: { pageNumber: "asc" },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            visualType: true,
            description: true,
            confidence: true,
            basetenCostXaf: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      noteId,
      pages: pages.map((page) => ({
        pageId: page.id,
        pageNumber: page.pageNumber,
        pageImageUrl: page.pageImageUrl,
        hasVisual: page.hasVisual,
        analysedAt: page.analysedAt,
        analysis: page.analyses[0] ?? null,
      })),
    });
  } catch (error) {
    console.error("Visual analysis GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch visual analysis" },
      { status: 500 },
    );
  }
}
