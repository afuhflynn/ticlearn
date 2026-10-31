import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { readArtForAnswer, readArtForNote } from "@/lib/visual-artifacts";

/** Unified art read. Scans derive from Page rows, drawn art from
 *  VisualArtifact rows. Owner only, foreign ids read as missing. */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const noteId = url.searchParams.get("noteId");
  const answerId = url.searchParams.get("answerId");
  if ((noteId && answerId) || (!noteId && !answerId)) {
    return NextResponse.json(
      { error: "Pass noteId or answerId, not both." },
      { status: 400 },
    );
  }
  try {
    if (noteId) {
      const { scans, drawn, total } = await readArtForNote(
        session.user.id,
        noteId,
      );
      return NextResponse.json({ noteId, scans, drawn, total });
    }
    const drawn = await readArtForAnswer(session.user.id, answerId as string);
    return NextResponse.json({ answerId, drawn });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
