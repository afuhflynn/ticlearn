import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "USER";
    const onboardingStatus = searchParams.get("onboardingStatus") || "all";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const onboardingWhere =
      onboardingStatus === "completed"
        ? {
            activeProfile: {
              onboardingCompleted: true,
              onboardingSkipped: false,
            },
          }
        : onboardingStatus === "skipped"
          ? {
              activeProfile: {
                onboardingSkipped: true,
              },
            }
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
        ? { role: UserRole.USER }
        : role === "ADMIN"
          ? { role: UserRole.ADMIN }
          : {};

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
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          activeProfileId: true,
          createdAt: true,
          referredBy: true,
          refApplied: true,
          activeProfile: {
            select: {
              onboardingCompleted: true,
              onboardingSkipped: true,
              onboardingStep: true,
            },
          },
          _count: {
            select: {
              notes: true,
              quizzes: true,
              quizAttempts: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const usersWithReferralInfo = await Promise.all(
      users.map(async (u) => {
        let referredByUser = null;
        if (u.referredBy) {
          const affiliate = await prisma.affiliate.findUnique({
            where: { code: u.referredBy },
            select: { userName: true, userEmail: true },
          });
          referredByUser = affiliate;
        }
        return {
          ...u,
          notesCount: u._count.notes,
          quizzesCount: u._count.quizzes,
          attemptsCount: u._count.quizAttempts,
          onboardingCompleted: u.activeProfile?.onboardingCompleted ?? null,
          onboardingSkipped: u.activeProfile?.onboardingSkipped ?? null,
          onboardingStep: u.activeProfile?.onboardingStep ?? null,
          referredByName: referredByUser?.userName || null,
          referredByEmail: referredByUser?.userEmail || null,
        };
      }),
    );

    return NextResponse.json({
      users: usersWithReferralInfo,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

    const { search } = await req.json();
    const page = 1;
    const limit = 20;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          referredBy: true,
          refApplied: true,
          _count: {
            select: {
              notes: true,
              quizzes: true,
              quizAttempts: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        createdAt: u.createdAt,
        notesCount: u._count.notes,
        quizzesCount: u._count.quizzes,
        attemptsCount: u._count.quizAttempts,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Admin users search error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 },
    );
  }
}
