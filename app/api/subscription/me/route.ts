import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ plan: null }, { status: 401 });
    }

    return NextResponse.json({ plan: null });
  } catch {
    return NextResponse.json({ plan: null });
  }
}
