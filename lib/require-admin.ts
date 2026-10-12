import { auth } from "./auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<
  | { user: { id: string; role: string; email: string; name: string | null } }
  | NextResponse
> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    user: {
      id: session.user.id,
      role: (session.user as any).role,
      email: session.user.email,
      name: session.user.name,
    },
  };
}
