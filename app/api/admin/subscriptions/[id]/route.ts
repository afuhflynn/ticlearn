import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";
import { grantPlanCredits } from "@/lib/plan-credits";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function sendSubscriptionNotification(
  subscriptionId: string,
  action: "ACTIVATE" | "REJECT",
  planLabel?: string,
  amount?: number,
  transactionId?: string,
  reason?: string,
) {
  try {
    await inngest.send({
      name: "subscription/action",
      data: {
        subscriptionId,
        action,
        planLabel,
        amount,
        transactionId,
        reason,
      },
    });

    console.log(
      `[API] Triggered ${action} notification for subscription ${subscriptionId}`,
    );
  } catch (error) {
    console.error(`[API] Failed to trigger notification:`, error);
  }
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("Admin subscription get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { status, plan, activatedAt } = await req.json();

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "ACTIVE" && !activatedAt && !existing.activatedAt) {
        updateData.activatedAt = new Date();
      }
    }
    if (plan) {
      updateData.plan = plan;
      if (status === "ACTIVE" && !existing.activatedAt) {
        updateData.activatedAt = new Date();
      }
    }
    if (activatedAt) updateData.activatedAt = new Date(activatedAt);

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData as any,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (status === "ACTIVE") {
      await grantPlanCredits({
        userId: subscription.userId,
        plan: subscription.plan,
        subscriptionId: subscription.id,
      }).catch(console.error);

      await sendSubscriptionNotification(
        id,
        "ACTIVATE",
        subscription.plan,
        subscription.amount,
        subscription.fapshiTransId || undefined,
      );
    }

    return NextResponse.json({ subscription, success: true });
  } catch (error) {
    console.error("Admin subscription update error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { reason } = await req
      .json()
      .catch(() => ({ reason: "Payment rejected by admin" }));

    const subscription = await prisma.subscription.update({
      where: { id },
      data: { status: "FAILED" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await sendSubscriptionNotification(
      id,
      "REJECT",
      subscription.plan,
      subscription.amount,
      subscription.fapshiTransId || undefined,
      reason,
    );

    return NextResponse.json({ subscription, success: true });
  } catch (error) {
    console.error("Admin subscription delete error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
