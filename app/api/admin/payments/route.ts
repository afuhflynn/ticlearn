import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Admin support view over both money tables (spec 0034 AC-11).
 * Admin only. Optional ?status= filter, paginated, newest first.
 */
export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status")?.trim().toUpperCase() || null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const skip = (page - 1) * perPage;

    const subWhere = status ? { status: status as never } : {};
    const orderWhere = status
      ? {
          status:
            status === "ACTIVE" ? ("COMPLETED" as never) : (status as never),
        }
      : {};

    const [subs, subTotal, orders, orderTotal] = await Promise.all([
      prisma.subscription.findMany({
        where: subWhere,
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          userEmail: true,
          plan: true,
          status: true,
          amount: true,
          provider: true,
          fapshiTransId: true,
          activatedAt: true,
          createdAt: true,
        },
      }),
      prisma.subscription.count({ where: subWhere }),
      prisma.creditPurchaseOrder.findMany({
        where: orderWhere,
        skip,
        take: perPage,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          amountXaf: true,
          creditsPromised: true,
          status: true,
          provider: true,
          fapshiTransId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.creditPurchaseOrder.count({ where: orderWhere }),
    ]);

    return NextResponse.json({
      subscriptions: subs.map((s) => ({
        kind: "pass" as const,
        ...s,
        activatedAt: s.activatedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      creditOrders: orders.map((o) => ({
        kind: "credits" as const,
        ...o,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      page,
      perPage,
      subTotal,
      orderTotal,
    });
  } catch (error) {
    console.error("Admin payments error:", error);
    return NextResponse.json(
      { error: "Could not load payments" },
      { status: 500 },
    );
  }
}
