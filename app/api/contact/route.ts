import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import { limit } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
  website: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await limit("contact", request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({
        success: true,
        message: "Message sent successfully",
      });
    }

    const { name, email, subject, message } = contactSchema.parse(body);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    await inngest.send({
      name: "email.send.transactional",
      data: {
        template: "admin-feedback-alert",
        to: adminEmail,
        props: {
          userName: name,
          userEmail: email,
          typeLabel: "Contact",
          subjectLine: subject,
          message,
        },
      },
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
