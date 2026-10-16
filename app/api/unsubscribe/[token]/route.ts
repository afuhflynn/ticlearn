import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  let userId: string | null = null;
  try {
    userId = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    userId = null;
  }

  if (!userId) {
    return new Response("Invalid unsubscribe link.", { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return new Response("Invalid unsubscribe link.", { status: 404 });
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, emailNotifications: false },
    update: { emailNotifications: false },
  });

  await prisma.emailSuppression.upsert({
    where: { email: user.email },
    create: { email: user.email, reason: "UNSUBSCRIBED", userId: user.id },
    update: { reason: "UNSUBSCRIBED", userId: user.id },
  });

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
<body style="font-family:sans-serif;padding:40px;text-align:center;">
  <h1>You have been unsubscribed</h1>
  <p>You will no longer receive promotional emails from TiCLearn.</p>
  <p>Transactional emails (verification, receipts) will still be sent.</p>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
