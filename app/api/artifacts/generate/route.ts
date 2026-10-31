import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateVisualArtifact } from "@/lib/visual-artifacts";

const bodySchema = z
  .object({
    answerId: z.string().min(1).optional(),
    noteId: z.string().min(1).optional(),
    concept: z.string().min(1).max(160),
    context: z.string().max(4000).optional(),
  })
  .refine((v) => v.answerId || v.noteId, { message: "answerId or noteId" });

/** Draw a fresh diagram. Owner checks resolve the note or answer through the
 *  caller id, the cap runs before the model call, every draw logs usage with
 *  no debit row. */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { answerId, noteId, concept, context } = parsed.data;
  const userId = session.user.id;

  if (answerId) {
    const answer = await prisma.quizAttemptAnswer.findFirst({
      where: { id: answerId, attempt: { userId } },
      select: { id: true },
    });
    if (!answer) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  let groundedContext = context;
  if (noteId) {
    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
      select: { id: true, extractedText: true, summary: true },
    });
    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Ground the draw in the note itself; fall back to caller context.
    const noteContext = [note.summary ?? "", note.extractedText ?? ""]
      .join("\n")
      .trim()
      .slice(0, 4000);
    if (noteContext) groundedContext = noteContext;
  }

  const result = await generateVisualArtifact({
    userId,
    answerId: answerId ?? null,
    noteId: noteId ?? null,
    concept,
    context: groundedContext,
  });
  if (!result.ok) {
    const status = result.reason === "cap" ? 429 : 200;
    return NextResponse.json(
      { ok: false, reason: result.reason, message: result.message },
      { status },
    );
  }
  return NextResponse.json({
    ok: true,
    id: result.id,
    format: result.format,
    payload: result.payload,
    altText: result.altText,
  });
}
