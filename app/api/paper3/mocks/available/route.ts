import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPaper3Subjects } from "@/lib/paper3/subject-tasks";

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSubjects = await getUserPaper3Subjects(session.user.id);

    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (userSubjects.length > 0) {
      where.subject = { in: userSubjects };
    }

    const mocks = await prisma.paper3Mock.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        subject: true,
        timeLimit: true,
        totalMarks: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ mocks });
  } catch (error) {
    console.error("Paper3 mocks available GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mocks" },
      { status: 500 },
    );
  }
}
