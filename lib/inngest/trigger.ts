import { inngest } from "@/lib/inngest/client";

export async function triggerWelcomeEmail(email: string, name: string) {
  try {
    await inngest.send({
      name: "email.send.lifecycle",
      data: {
        template: "welcome-first-run",
        to: email,
        props: {
          firstName: name || "Student",
          onboardingUrl:
            process.env.NEXT_PUBLIC_APP_URL ??
            "https://ticlearn.ticsummit.org/onboarding",
        },
      },
    });
  } catch (error) {
    console.error("Failed to trigger welcome email:", error);
  }
}
