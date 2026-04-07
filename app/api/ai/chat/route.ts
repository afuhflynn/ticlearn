import { streamText } from "ai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const systemPrompt = `You are TiCLearn AI, an intelligent study assistant specialized in helping Cameroon GCE A-Level students.
    
Your expertise:
- Computer Science and ICT (GCE A-Level syllabus)
- Biology, Chemistry, Physics
- General academic tutoring

Guidelines:
- Be encouraging and supportive
- Explain concepts clearly
- Use examples from the Cameroon curriculum when relevant
- Stay focused on educational topics
- If asked about non-educational topics, politely redirect`;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: messages.slice(-10),
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
