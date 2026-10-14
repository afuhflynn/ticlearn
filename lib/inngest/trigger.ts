export async function triggerWelcomeEmail(email: string, name: string) {
  try {
    await fetch("/api/inngest/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "welcome", email, name }),
    });
  } catch (error) {
    console.error("Failed to trigger welcome email:", error);
  }
}
