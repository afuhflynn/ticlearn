import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = contactSchema.parse(body);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    const { sendEmail } = await import("@/lib/email/send");
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
  <style>
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 24px; }
    .header h1 { color: white; margin: 0; font-size: 20px; }
    .content { padding: 24px; }
    .field { margin-bottom: 16px; }
    .field-label { font-weight: 600; color: #374151; margin-bottom: 4px; }
    .field-value { color: #6b7280; }
    .message-box { background: #f3e8ff; border-radius: 8px; padding: 16px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>New Contact Form Submission</h1>
      </div>
      <div class="content">
        <div class="field">
          <div class="field-label">Name</div>
          <div class="field-value">${name}</div>
        </div>
        <div class="field">
          <div class="field-label">Email</div>
          <div class="field-value">${email}</div>
        </div>
        <div class="field">
          <div class="field-label">Subject</div>
          <div class="field-value">${subject}</div>
        </div>
        <div class="field">
          <div class="field-label">Message</div>
          <div class="message-box">${message.replace(/\n/g, "<br>")}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

    await sendEmail({
      to: adminEmail,
      subject: `[TiCLearn Contact] ${subject}`,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError?.message || "Validation error" },
        { status: 400 },
      );
    }
    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send message" },
      { status: 500 },
    );
  }
}
