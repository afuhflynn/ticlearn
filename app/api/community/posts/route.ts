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
    const subject = searchParams.get("subject");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = subject ? { subject } : {};

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { comments: true, likes: true },
          },
          likes: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({
      posts: posts.map((p) => ({
        ...p,
        isLiked: p.likes.length > 0,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Posts GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
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

    const { content, subject, isAnnouncement } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const userRole = (session.user as { role?: string })?.role;
    const isPinned = userRole === "ADMIN" && isAnnouncement;

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        content,
        subject,
        isPinned,
        isAnnouncement: isPinned,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ post, success: true });
  } catch (error) {
    console.error("Post POST error:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 },
    );
  }
}
