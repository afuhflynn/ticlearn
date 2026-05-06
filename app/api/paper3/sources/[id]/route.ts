import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session };
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const { id } = await params;

    const source = await prisma.paper3Source.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { questionNumber: "asc" },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    return NextResponse.json({ source });
  } catch (error) {
    console.error("Paper3 source GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch source" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const { id } = await params;

    await prisma.paper3Source.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Paper3 source DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 },
    );
  }
}

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const authResult = await requireAdmin();
    if ("error" in authResult) return authResult.error;

    const { id } = await params;

    const source = await prisma.paper3Source.findUnique({
      where: { id },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    await prisma.paper3Source.update({
      where: { id },
      data: { status: "PROCESSING" },
    });

    await inngest.send({
      name: "paper3/process-source",
      data: {
        sourceId: source.id,
        fileUrl: source.fileUrl,
        fileName: source.fileName ?? source.title,
        uploadthingKey: source.uploadthingKey ?? undefined,
        title: source.title,
        year: source.year,
        subject: source.subject,
        section: source.section,
        category: source.category,
        paperType: source.paperType,
        sourceType: source.sourceType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Paper3 source POST error:", error);
    return NextResponse.json(
      { error: "Failed to process source" },
      { status: 500 },
    );
  }
}
