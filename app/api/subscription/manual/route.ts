import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Retired with spec 0039. Direct Mobile Money transfer is gone, only Fapshi
 * remains. The card is deleted from the page, so this route never accepts
 * a transaction ID again and always points back to the Fapshi initiate path.
 */
export async function POST(_req?: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { error: "Direct transfer is retired. Start payment with Fapshi instead." },
    { status: 410 },
  );
}

export async function GET() {
  return POST();
}
