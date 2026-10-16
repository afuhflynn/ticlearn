import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { purgeNamespace } from "@/lib/cache";
import { limit } from "@/lib/rate-limit";

const bodySchema = z.object({
  namespace: z.string().min(1).max(64),
});

/**
 * Clear one shared cache namespace, from spec 0010.
 *
 * An admin changes a platform setting, a prompt or a generation template, and
 * the cached answers derived from it are now wrong. This drops them without
 * waiting for their time to live. It is a POST so a link cannot trigger it, and
 * it is admin only because it removes work the whole app depends on.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if ((session.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const gated = await limit("admin", req);
  if (gated) return gated;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "A JSON body is required" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "namespace is required" },
      { status: 400 },
    );
  }

  const { namespace } = parsed.data;
  const removed = await purgeNamespace(namespace);

  // An audit line naming the actor, because this deletes work the whole app
  // was relying on and an operator reading the logs will want to know who.
  console.log(
    `[cache] admin ${session.user.id} purged namespace ${namespace}, ${removed} entries removed`,
  );

  return new NextResponse(null, { status: 204 });
}
