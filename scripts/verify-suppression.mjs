import { prisma } from "../lib/prisma";
import { isSuppressed, sendEmail, SuppressionError } from "../lib/email/send";

const TEST_EMAIL = "verify-suppression-test@example.com";

async function main() {
  // Clean slate: remove any prior test row
  await prisma.emailSuppression.deleteMany({
    where: { email: TEST_EMAIL },
  });

  // 1. Before suppression: isSuppressed returns false
  const before = await isSuppressed(TEST_EMAIL);
  console.log("isSuppressed before write:", before);
  if (before !== false) throw new Error("expected false before write");

  // 2. Write to EmailSuppression table
  await prisma.emailSuppression.create({
    data: {
      email: TEST_EMAIL,
      reason: "BOUNCED",
      providerMessageId: "verify-suppression-test-msg",
    },
  });

  // 3. After suppression: isSuppressed returns true
  const after = await isSuppressed(TEST_EMAIL);
  console.log("isSuppressed after write:", after);
  if (after !== true) throw new Error("expected true after write");

  // 4. sendEmail throws SuppressionError for suppressed address
  let threw = false;
  try {
    await sendEmail({
      to: TEST_EMAIL,
      subject: "suppression test",
      html: "<p>test</p>",
      text: "test",
    });
  } catch (error) {
    threw = error instanceof SuppressionError;
    console.log("sendEmail threw SuppressionError:", threw);
    console.log("error name:", error.name);
  }
  if (!threw) throw new Error("expected sendEmail to throw SuppressionError");

  // 5. Clean up test row
  await prisma.emailSuppression.delete({
    where: { email: TEST_EMAIL },
  });

  console.log("SUPPRESSION PATH VERIFIED — AC-7 code path met");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("SUPPRESSION CHECK FAILED:", e.message);
  process.exit(1);
});
