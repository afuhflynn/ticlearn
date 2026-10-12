import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";
import { utapi } from "@/lib/uploadthing-server";
import crypto from "crypto";

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

    const { componentId, examSourceId, uploadthingKey, fileName } =
      await req.json();

    if (!componentId || !uploadthingKey) {
      return NextResponse.json(
        { error: "componentId and uploadthingKey are required" },
        { status: 400 },
      );
    }

    const component = await prisma.component.findUnique({
      where: { id: componentId },
    });
    if (!component) {
      return NextResponse.json(
        { error: "Component not found" },
        { status: 404 },
      );
    }

    // Derive fileUrl server-side from uploadthingKey
    const fileUrls = await utapi.getFileUrls(uploadthingKey);
    if (!fileUrls || !fileUrls.data || fileUrls.data.length === 0) {
      return NextResponse.json(
        { error: "Invalid upload key" },
        { status: 400 },
      );
    }
    const fileUrl = fileUrls.data[0].url;

    const jobId = crypto.randomUUID();

    await inngest.send({
      name: "questions/ingest",
      data: {
        jobId,
        componentId,
        examSourceId: examSourceId || null,
        fileUrl,
        fileName: fileName || "Untitled",
      },
    });

    return NextResponse.json({ jobId, status: "processing" });
  } catch (error) {
    console.error("Questions ingest error:", error);
    return NextResponse.json(
      { error: "Failed to start ingestion" },
      { status: 500 },
    );
  }
}
