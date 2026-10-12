import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAnyExamProfileIdForUser } from "@/lib/exam-profile";
import {
  generateStudentPracticeMock,
  type StudentPaperMode,
  type StudentMockScope,
} from "@/lib/mock-generator";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  componentId: z.string().min(1),
  paper: z.enum(["PAPER_1", "PAPER_2", "P1", "P2"]),
  scope: z.enum(["FULL_SYLLABUS", "TOPICS", "FULL"]),
  topicIds: z.array(z.string()).optional(),
});

function normalizePaper(raw: string): StudentPaperMode | null {
  const u = raw.toUpperCase();
  if (u === "PAPER_1" || u === "P1") return "PAPER_1";
  if (u === "PAPER_2" || u === "P2") return "PAPER_2";
  return null;
}

function normalizeScope(raw: string): StudentMockScope | null {
  const u = raw.toUpperCase().trim();
  if (u === "FULL_SYLLABUS" || u === "FULL") return "FULL_SYLLABUS";
  if (u === "TOPICS") return "TOPICS";
  return null;
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const paper = normalizePaper(body.paper);
    const scope = normalizeScope(body.scope);
    if (!paper) {
      return NextResponse.json({ error: "Invalid paper" }, { status: 400 });
    }
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    if (scope === "TOPICS" && (!body.topicIds || body.topicIds.length === 0)) {
      return NextResponse.json(
        { error: "Select at least one topic for topic mode" },
        { status: 400 },
      );
    }

    const componentOk = await prisma.component.findFirst({
      where: { id: body.componentId, type: "PAPER" },
      select: { id: true },
    });
    if (!componentOk) {
      return NextResponse.json(
        { error: "Unknown paper component" },
        { status: 400 },
      );
    }

    if (scope === "TOPICS" && body.topicIds?.length) {
      const distinct = [...new Set(body.topicIds)];
      const topics = await prisma.topic.findMany({
        where: { id: { in: distinct }, componentId: body.componentId },
      });
      if (topics.length !== distinct.length) {
        return NextResponse.json(
          { error: "Invalid topic selection" },
          { status: 400 },
        );
      }
    }

    const profileId = await getAnyExamProfileIdForUser(session.user.id);
    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "No exam profile found. Create one via the student dashboard onboarding first.",
        },
        { status: 400 },
      );
    }

    const mock = await generateStudentPracticeMock(
      {
        examProfileId: profileId,
        componentId: body.componentId,
        paper,
        scope,
        topicIds:
          scope === "TOPICS" && body.topicIds?.length
            ? body.topicIds
            : undefined,
      },
      { creationContext: "ADMIN_PREVIEW" },
    );

    return NextResponse.json({
      mock: {
        attemptId: mock.attemptId,
        blueprint: mock.blueprint,
        sections: mock.sections,
        sourceMode: mock.sourceMode,
      },
    });
  } catch (error) {
    console.error("Admin P1P2 generate-custom error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate mock — check the question bank.",
      },
      { status: 500 },
    );
  }
}
