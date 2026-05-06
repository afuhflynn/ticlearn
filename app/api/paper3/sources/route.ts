import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const createSourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  year: z.number().int().min(2000).max(2030),
  subject: z.enum(["ICT", "COMPUTER_SCIENCE"]),
  section: z.enum(["A", "B"]),
  category: z.enum(["SPREADSHEET", "DATABASE", "PROGRAMMING"]),
  paperType: z.enum(["QUESTION_PAPER", "MARKING_SCHEME"]),
  sourceType: z.enum(["OFFICIAL", "TEACHER", "RECONSTRUCTED"]),
  fileUrl: z.string().url("A valid file URL is required"),
  uploadthingKey: z.string().optional(),
  fileName: z.string().min(1, "File name is required"),
});

export async function GET() {
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

    const sources = await prisma.paper3Source.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    return NextResponse.json({
      sources: sources.map((source) => ({
        ...source,
        questionCount: source._count.questions,
      })),
    });
  } catch (error) {
    console.error("Paper3 sources GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
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

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = createSourceSchema.parse(await req.json());

    const source = await prisma.paper3Source.create({
      data: {
        title: data.title,
        year: data.year,
        subject: data.subject,
        section: data.section,
        category: data.category,
        paperType: data.paperType,
        sourceType: data.sourceType,
        fileUrl: data.fileUrl,
        uploadthingKey: data.uploadthingKey,
        status: "PENDING",
        fileName: data.fileName,
      },
    });

    try {
      await inngest.send({
        name: "paper3/process-source",
        data: {
          sourceId: source.id,
          fileUrl: source.fileUrl,
          fileName: source.fileName,
          uploadthingKey: source.uploadthingKey ?? undefined,
          title: source.title,
          year: source.year,
          subject: source.subject as "ICT" | "COMPUTER_SCIENCE",
          section: source.section as "A" | "B",
          category: source.category,
          paperType: source.paperType as "QUESTION_PAPER" | "MARKING_SCHEME",
          sourceType: source.sourceType as
            | "OFFICIAL"
            | "TEACHER"
            | "RECONSTRUCTED",
        },
      });

      await prisma.paper3Source.update({
        where: { id: source.id },
        data: { status: "PROCESSING" },
      });

      return NextResponse.json({ source, success: true });
    } catch (processError) {
      console.error("Failed to trigger Paper3 processing:", processError);
      await prisma.paper3Source.update({
        where: { id: source.id },
        data: { status: "ERROR" },
      });
      return NextResponse.json(
        { error: "Source uploaded, but processing could not be started" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Paper3 sources POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 },
    );
  }
}
