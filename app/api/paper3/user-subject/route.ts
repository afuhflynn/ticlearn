import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPaper3Subjects, SUBJECT_CATEGORIES } from "@/lib/paper3/subject-tasks";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subjects = await getUserPaper3Subjects(session.user.id);

    const allowedCategories = subjects.length > 0
      ? subjects.flatMap((s) => SUBJECT_CATEGORIES[s])
      : ["MIXED", "DATABASE", "SPREADSHEET", "PROGRAMMING", "WEB_PROGRAMMING"];

    const uniqueCategories = [...new Set(allowedCategories)];

    return NextResponse.json({ subjects, allowedCategories: uniqueCategories });
  } catch (error) {
    console.error("Paper3 user-subject error:", error);
    return NextResponse.json(
      { error: "Failed to get user subject" },
      { status: 500 },
    );
  }
}
