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

    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId: id,
          userId: session.user.id,
        },
      },
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.postLike.delete({
          where: { id: existingLike.id },
        }),
        prisma.post.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return NextResponse.json({ liked: false, success: true });
    }

    await prisma.$transaction([
      prisma.postLike.create({
        data: {
          postId: id,
          userId: session.user.id,
        },
      }),
      prisma.post.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ liked: true, success: true });
  } catch (error) {
    console.error("Like toggle error:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 },
    );
  }
}
