import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateTextCritical } from "@/lib/ai/orchestrator";
import { buildPaper3SourceContextBlock } from "@/lib/paper3/exam-context";
import {
  examSystemPreamble,
  revisionGuideUserPrompt,
  type RevisionGuideEmphasis,
} from "@/lib/paper3/prompts";
import { prisma } from "@/lib/prisma";

const generateSchema = z.object({
  emphasis: z.enum([
    "DATABASE",
    "C_PROGRAMMING",
    "MIXED",
    "SPREADSHEET",
    "PROGRAMMING",
    "WEB_PROGRAMMING",
  ]),
  title: z.string().min(3).max(160).optional(),
  notes: z.string().max(4000).optional(),
  publish: z.boolean().optional().default(false),
  sourceIds: z.array(z.string()).max(20).optional(),
  subject: z.enum(["ICT", "COMPUTER_SCIENCE"]).optional(),
});

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "ADMIN") return null;
  return session.user;
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const guides = await prisma.revisionGuide.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        focus: true,
        published: true,
        pdfUrl: true,
        pdfFileName: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ guides });
  } catch (error) {
    console.error("Admin revision guides GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revision guides" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = generateSchema.parse(await req.json());
    const pastPaperContext = await buildPaper3SourceContextBlock({
      sourceIds: data.sourceIds,
      subject: data.subject,
    });

    const prompt = revisionGuideUserPrompt({
      emphasis: data.emphasis as RevisionGuideEmphasis,
      pastPaperContext,
      customNotes: data.notes,
    });

    const result = await generateTextCritical({
      task: "summarize",
      system: examSystemPreamble,
      prompt,
      modelOptions: { temperature: 0.35 },
    });

    const markdown = result.text.trim();
    if (!markdown) {
      return NextResponse.json(
        { error: "Model returned an empty document." },
        { status: 502 },
      );
    }

    const guide = await prisma.revisionGuide.create({
      data: {
        title:
          data.title ??
          `Paper 3 revision guide · ${data.emphasis.replaceAll("_", " ").toLowerCase()}`,
        markdown,
        focus: data.emphasis,
        published: data.publish,
        createdById: admin.id,
      },
    });

    return NextResponse.json({ guide });
  } catch (error) {
    console.error("Admin revision guide POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate revision guide" },
      { status: 500 },
    );
  }
}
