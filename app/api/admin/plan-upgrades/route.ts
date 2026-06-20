import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPlanPrice, type PaymentPlanConfig } from "@/lib/fapshi";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

const PAID_PLAN_VALUES = ["STARTER", "STANDARD", "PREMIUM", "PRO"] as const;
const PLAN_VALUES = ["FREE", ...PAID_PLAN_VALUES] as const;
const STATUS_VALUES = ["PENDING", "ACTIVE", "FAILED"] as const;
const ONBOARDING_STATUSES = [
  "all",
  "completed",
  "not_completed",
  "skipped",
] as const;
const SORTABLE_COLUMNS = new Set(["createdAt", "name", "email", "role"]);

type AdminPlan = (typeof PLAN_VALUES)[number];

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session };
}

function formatUserRow(user: Awaited<ReturnType<typeof findUsers>>[number]) {
  const subscription = user.subscriptions[0] ?? null;
  const activeProfile = user.activeProfile;
  const programs =
    activeProfile?.programs.map((profileProgram) => ({
      id: profileProgram.program.id,
      name: profileProgram.program.name,
      code: profileProgram.program.code,
      level: profileProgram.program.examLevel.name,
      confidence: profileProgram.confidence,
    })) ?? [];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt,
    activeProfileId: user.activeProfileId,
    onboardingCompleted: activeProfile?.onboardingCompleted ?? null,
    onboardingSkipped: activeProfile?.onboardingSkipped ?? null,
    onboardingStep: activeProfile?.onboardingStep ?? null,
    examYear: activeProfile?.examYear ?? null,
    examDate: activeProfile?.examDate ?? null,
    phoneCountryCode: activeProfile?.phoneCountryCode ?? null,
    phoneNumber: activeProfile?.phoneNumber ?? null,
    programs,
    currentPlan: subscription?.status === "ACTIVE" ? subscription.plan : "FREE",
    subscription: subscription
      ? {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          amount: subscription.amount,
          activatedAt: subscription.activatedAt,
          createdAt: subscription.createdAt,
          fapshiTransId: subscription.fapshiTransId,
        }
      : null,
    notesCount: user._count.notes,
    quizzesCount: user._count.quizzes,
    attemptsCount: user._count.quizAttempts,
    paper3AttemptsCount: user._count.paper3MockAttempts,
  };
}

async function findUsers(args: Parameters<typeof prisma.user.findMany>[0]) {
  return prisma.user.findMany({
    ...args,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      activeProfileId: true,
      createdAt: true,
      activeProfile: {
        select: {
          onboardingCompleted: true,
          onboardingSkipped: true,
          onboardingStep: true,
          examYear: true,
          examDate: true,
          phoneCountryCode: true,
          phoneNumber: true,
          programs: {
            select: {
              confidence: true,
              program: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  examLevel: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          plan: true,
          status: true,
          amount: true,
          activatedAt: true,
          createdAt: true,
          fapshiTransId: true,
        },
      },
      _count: {
        select: {
          notes: true,
          quizzes: true,
          quizAttempts: true,
          paper3MockAttempts: true,
        },
      },
    },
  });
}

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const { searchParams } = new URL(req.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 10_000);
    const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role") || "USER";
    const onboardingStatus = searchParams.get("onboardingStatus") || "all";
    const plan = searchParams.get("plan") || "all";
    const subscriptionStatus = searchParams.get("subscriptionStatus") || "all";
    const sortByParam = searchParams.get("sortBy") || "createdAt";
    const sortBy = SORTABLE_COLUMNS.has(sortByParam)
      ? sortByParam
      : "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    if (!["USER", "ADMIN", "all"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role filter" },
        { status: 400 },
      );
    }
    if (
      !ONBOARDING_STATUSES.includes(
        onboardingStatus as (typeof ONBOARDING_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid onboarding filter" },
        { status: 400 },
      );
    }
    if (plan !== "all" && !PLAN_VALUES.includes(plan as AdminPlan)) {
      return NextResponse.json(
        { error: "Invalid plan filter" },
        { status: 400 },
      );
    }
    if (
      subscriptionStatus !== "all" &&
      !STATUS_VALUES.includes(
        subscriptionStatus as (typeof STATUS_VALUES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid subscription status filter" },
        { status: 400 },
      );
    }

    const onboardingWhere =
      onboardingStatus === "completed"
        ? {
            activeProfile: {
              onboardingCompleted: true,
              onboardingSkipped: false,
            },
          }
        : onboardingStatus === "skipped"
          ? { activeProfile: { onboardingSkipped: true } }
          : onboardingStatus === "not_completed"
            ? {
                OR: [
                  { activeProfile: null },
                  {
                    activeProfile: {
                      onboardingCompleted: false,
                      onboardingSkipped: false,
                    },
                  },
                ],
              }
            : {};

    const roleWhere =
      role === "USER"
        ? { role: "USER" as const }
        : role === "ADMIN"
          ? { role: "ADMIN" as const }
          : {};
    const planWhere =
      plan === "all"
        ? {}
        : plan === "FREE"
          ? {
              OR: [
                { subscriptions: { none: {} } },
                {
                  subscriptions: {
                    every: { status: { not: "ACTIVE" as const } },
                  },
                },
              ],
            }
          : {
              subscriptions: {
                some: {
                  plan: plan as (typeof PAID_PLAN_VALUES)[number],
                  status: "ACTIVE" as const,
                },
              },
            };
    const subscriptionWhere =
      subscriptionStatus === "all"
        ? {}
        : {
            subscriptions: {
              some: {
                status: subscriptionStatus as (typeof STATUS_VALUES)[number],
              },
            },
          };

    const where = {
      AND: [
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: search, mode: "insensitive" as const } },
                  { email: { contains: search, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
        roleWhere,
        onboardingWhere,
        planWhere,
        subscriptionWhere,
      ],
    };

    const [users, total] = await Promise.all([
      findUsers({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map(formatUserRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin plan upgrades GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan upgrade users" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const plan = typeof body.plan === "string" ? body.plan : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!userId) {
      return NextResponse.json({ error: "User is required" }, { status: 400 });
    }
    if (!PLAN_VALUES.includes(plan as AdminPlan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = targetUser.subscriptions[0] ?? null;
    const previousPlan = existing?.status === "ACTIVE" ? existing.plan : "FREE";
    const previousStatus = existing?.status ?? null;

    if (previousPlan === plan && existing?.status === "ACTIVE") {
      return NextResponse.json(
        { error: "Selected plan is already active for this user" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let subscription = null;

      if (plan === "FREE") {
        if (existing) {
          subscription = await tx.subscription.update({
            where: { id: existing.id },
            data: { status: "FAILED", activatedAt: null },
          });
        }
      } else {
        const price = getPlanPrice(plan as keyof PaymentPlanConfig);
        subscription = await tx.subscription.upsert({
          where: { userId },
          create: {
            userId,
            userEmail: targetUser.email,
            userName: targetUser.name,
            plan: plan as (typeof PAID_PLAN_VALUES)[number],
            status: "ACTIVE",
            amount: price.amount,
            activatedAt: new Date(),
            fapshiTransId: `admin-${userId}-${Date.now()}`,
          },
          update: {
            userEmail: targetUser.email,
            userName: targetUser.name,
            plan: plan as (typeof PAID_PLAN_VALUES)[number],
            status: "ACTIVE",
            amount: price.amount,
            activatedAt: new Date(),
          },
        });
      }

      await tx.userStats.upsert({
        where: { userId },
        create: { userId, examProfileId: targetUser.activeProfileId },
        update: { examProfileId: targetUser.activeProfileId ?? undefined },
      });

      await tx.kpiEvent.create({
        data: {
          userId,
          event: "admin_plan_change",
          metadata: {
            adminUserId: admin.session.user.id,
            adminEmail: admin.session.user.email,
            previousPlan,
            newPlan: plan,
            previousStatus,
            newStatus: plan === "FREE" ? "FAILED" : "ACTIVE",
            reason: reason || null,
            subscriptionId: subscription?.id ?? existing?.id ?? null,
          },
        },
      });

      return subscription;
    });

    if (plan !== "FREE" && result) {
      await inngest
        .send({
          name: "subscription/action",
          data: {
            subscriptionId: result.id,
            action: "ACTIVATE",
            planLabel: result.plan,
            amount: result.amount,
            transactionId: result.fapshiTransId || undefined,
          },
        })
        .catch((error) => {
          console.error("Failed to trigger subscription notification:", error);
        });
    }

    const [updatedUser] = await findUsers({ where: { id: userId }, take: 1 });

    return NextResponse.json({
      success: true,
      user: updatedUser ? formatUserRow(updatedUser) : null,
    });
  } catch (error) {
    console.error("Admin plan upgrades PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update user plan" },
      { status: 500 },
    );
  }
}
