import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMockFromBlueprint } from "@/lib/mock-generator";
import { getActiveProfileId } from "@/lib/exam-profile";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { blueprintId } = await req.json();
    if (!blueprintId) return NextResponse.json({ error: "blueprintId is required" }, { status: 400 });

    const profileId = await getActiveProfileId(session.user.id);
    if (!profileId) return NextResponse.json({ error: "No active profile" }, { status: 400 });

    const mock = await generateMockFromBlueprint(blueprintId, profileId);
    return NextResponse.json({ mock });
  } catch (error) {
    console.error("Mock generate error:", error);
    return NextResponse.json({ error: "Failed to generate mock" }, { status: 500 });
  }
}
