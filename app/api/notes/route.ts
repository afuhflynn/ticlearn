import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await prisma.note.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        _count: {
          select: { quizzes: true },
        },
      },
    });

    return NextResponse.json({
      notes: notes.map((note) => ({
        ...note,
        quizCount: note._count.quizzes,
      })),
    });
  } catch (error) {
    console.error("Notes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, subject, fileUrl, fileName, fileType } = await req.json();

    if (!title || !subject || !fileUrl || !fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const note = await prisma.note.create({
      data: {
        userId: session.user.id,
        title,
        subject,
        fileUrl,
        fileName,
        fileType,
        topics: [],
        status: "UPLOADING",
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Notes POST error:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}
