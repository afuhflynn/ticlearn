import { inngest } from "@/lib/inngest/functions";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, email, name } = await req.json();

    if (type === "welcome") {
      await inngest.send({
        name: "email.send.welcome",
        data: { email, name },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  } catch (error) {
    console.error("Inngest trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger event" },
      { status: 500 },
    );
  }
}
