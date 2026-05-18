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

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { rejectionReason } = await req.json();

    const question = await prisma.paper3Question.findUnique({
      where: { id },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.paper3Question.update({
      where: { id },
      data: {
        status: "REJECTED",
        explanation: rejectionReason
          ? `Rejected: ${rejectionReason}`
          : "Rejected by admin",
      },
    });

    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error("Paper3 question reject error:", error);
    return NextResponse.json(
      { error: "Failed to reject question" },
      { status: 500 },
    );
  }
}
