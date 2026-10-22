import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
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

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        comments: {
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
        },
        likes: {
          select: { id: true },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const isLiked = (post.likes as unknown as Array<{ userId: string }>).some(
      (like) => like.userId === session.user.id,
    );

    return NextResponse.json({
      post: {
        ...post,
        isLiked,
      },
    });
  } catch (error) {
    console.error("Post GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 },
    );
  }
}

export async function PUT(
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
    const { content } = await req.json();

    const post = await prisma.post.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found or unauthorized" },
        { status: 404 },
      );
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { content },
    });

    return NextResponse.json({ post: updated, success: true });
  } catch (error) {
    console.error("Post PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
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

    const userRole = (session.user as { role?: string })?.role;
    const isAdmin = userRole === "ADMIN";

    const post = await prisma.post.findFirst({
      where: isAdmin ? { id } : { id, userId: session.user.id },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found or unauthorized" },
        { status: 404 },
      );
    }

    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Post DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 },
    );
  }
}
