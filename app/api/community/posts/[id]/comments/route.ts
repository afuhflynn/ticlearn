import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content, parentId } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId: id,
          userId: session.user.id,
          content,
          parentId,
        },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      }),
      prisma.post.update({
        where: { id },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ comment, success: true });
  } catch (error) {
    console.error("Comment POST error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 },
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const comments = await prisma.comment.findMany({
      where: { postId: id, parentId: null },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          take: 100,
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Comments GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 },
    );
  }
}
