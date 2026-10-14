import { renderToBuffer } from "@react-pdf/renderer";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  AffiliateReport,
  FeedbackReport,
  SubscriptionReport,
  UserReport,
} from "@/components/pdf";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const REPORT_TYPES = {
  users: "users",
  feedback: "feedback",
  subscriptions: "subscriptions",
  affiliates: "affiliates",
} as const;

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type } = await req.json();
    if (!type || !REPORT_TYPES[type as keyof typeof REPORT_TYPES]) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
    }

    let pdfBuffer: Buffer;

    switch (type) {
      case "users": {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: {
              select: { notes: true, quizzes: true, quizAttempts: true },
            },
          },
        });
        const report = UserReport({
          users: users.map((u) => ({
            id: u.id,
            name: u.name || "",
            email: u.email,
            role: u.role,
            createdAt: formatDate(u.createdAt),
            notesCount: u._count.notes,
            quizzesCount: u._count.quizzes,
            attemptsCount: u._count.quizAttempts,
          })),
          title: "User Report",
          subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        });
        // @ts-expect-error
        pdfBuffer = await renderToBuffer(report);
        break;
      }
      case "feedback": {
        const feedbacks = await prisma.feedback.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { user: { select: { name: true, email: true } } },
        });
        const report = FeedbackReport({
          feedbacks: feedbacks.map((f) => ({
            id: f.id,
            type: f.type || "OTHER",
            content: f.subject || "",
            status: f.status || "OPEN",
            createdAt: formatDate(f.createdAt),
            user: { name: f.user?.name || "", email: f.user?.email || "" },
          })),
          title: "Feedback Report",
          subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        });
        // @ts-expect-error
        pdfBuffer = await renderToBuffer(report);
        break;
      }
      case "subscriptions": {
        const subscriptions = await prisma.subscription.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { user: { select: { name: true, email: true } } },
        });
        const report = SubscriptionReport({
          subscriptions: subscriptions.map((s) => ({
            id: s.id,
            plan: s.plan || "FREE",
            status: s.status || "PENDING",
            amount: s.amount || 0,
            startDate: formatDate(s.activatedAt),
            endDate: "N/A",
            user: { name: s.user?.name || "", email: s.user?.email || "" },
          })),
          title: "Subscription Report",
          subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        });
        // @ts-expect-error
        pdfBuffer = await renderToBuffer(report);
        break;
      }
      case "affiliates": {
        const affiliates = await prisma.affiliate.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        });
        const report = AffiliateReport({
          affiliates: affiliates.map((a) => ({
            id: a.id,
            code: a.code || "",
            status: a.status || "PENDING",
            commissionRate: 10,
            createdAt: formatDate(a.createdAt),
            user: { name: a.userName, email: a.userEmail },
            referralsCount: a.totalConversions,
          })),
          title: "Affiliate Report",
          subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        });
        // @ts-expect-error
        pdfBuffer = await renderToBuffer(report);
        break;
      }
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 },
        );
    }

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
