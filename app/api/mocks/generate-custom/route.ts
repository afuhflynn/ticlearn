import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateStudentPracticeMock,
  type StudentMockScope,
  type StudentPaperMode,
} from "@/lib/mock-generator";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId)
      return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const body = (await req.json()) as {
      componentId?: string;
      paper?: string;
      scope?: string;
      topicIds?: string[];
    };

    const componentId = body.componentId?.trim();
    const paperRaw = body.paper?.toUpperCase();
    const scopeRaw = body.scope?.toUpperCase();

    if (!componentId || !paperRaw || !scopeRaw) {
      return NextResponse.json(
        { error: "componentId, paper, and scope are required" },
        { status: 400 },
      );
    }

    let paper: StudentPaperMode;
    if (paperRaw === "PAPER_1" || paperRaw === "P1") paper = "PAPER_1";
    else if (paperRaw === "PAPER_2" || paperRaw === "P2") paper = "PAPER_2";
    else
      return NextResponse.json({ error: "Invalid paper selection" }, { status: 400 });

    let scope: StudentMockScope;
    if (scopeRaw === "FULL_SYLLABUS" || scopeRaw === "FULL") scope = "FULL_SYLLABUS";
    else if (scopeRaw === "TOPICS") scope = "TOPICS";
    else return NextResponse.json({ error: "Invalid scope" }, { status: 400 });

    if (
      scope === "TOPICS" &&
      (!body.topicIds || !Array.isArray(body.topicIds) || body.topicIds.length === 0)
    ) {
      return NextResponse.json(
        { error: "Pick one or more topics for topic-focused mocks" },
        { status: 400 },
      );
    }

    const links = await prisma.examProfileProgram.findMany({
      where: { examProfileId: profileId },
      select: {
        program: { select: { examLevelId: true } },
      },
    });

    const levelIds = [...new Set(links.map((l) => l.program.examLevelId))];
    const componentOk = await prisma.component.findFirst({
      where: {
        id: componentId,
        type: "PAPER",
        program: { examLevelId: { in: levelIds }, code: { not: "UNKNOWN" } },
      },
      select: { id: true },
    });

    if (!componentOk)
      return NextResponse.json({ error: "Unknown paper for your profile" }, { status: 403 });

    if (scope === "TOPICS" && body.topicIds?.length) {
      const distinct = [...new Set(body.topicIds)];
      const topics = await prisma.topic.findMany({
        where: { id: { in: distinct }, componentId },
      });
      if (topics.length !== distinct.length)
        return NextResponse.json({ error: "Invalid topic selection" }, { status: 400 });
    }

    const mock = await generateStudentPracticeMock({
      examProfileId: profileId,
      componentId,
      paper,
      scope,
      topicIds:
        scope === "TOPICS" && body.topicIds?.length ? body.topicIds : undefined,
    });

    return NextResponse.json({
      mock: {
        attemptId: mock.attemptId,
        blueprint: mock.blueprint,
        sections: mock.sections,
        sourceMode: mock.sourceMode,
      },
    });
  } catch (error) {
    console.error("Student mock generate error:", error);
    return NextResponse.json(
      { error: "Could not generate this mock — try another scope or topic." },
      { status: 500 },
    );
  }
}
