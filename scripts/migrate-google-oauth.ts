// scripts/migrate-google-oauth.ts

import { prisma } from "@/lib/prisma";

async function migrateGoogleOAuth() {
  console.log("🏷️  Tagging old Google OAuth accounts as legacy...");

  try {
    // Option: Add a "legacy" marker by clearing tokens (keeps record, disables it)
    const result = await prisma.account.updateMany({
      where: {
        providerId: "google",
        // Optional: Only mark truly old ones (before a date)
        // createdAt: { lt: new Date("2024-01-15") }
        accessToken: { not: null },
      },
      data: {
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        // Don't delete — just mark as invalid
      },
    });

    console.log(`✅ Marked ${result.count} accounts as legacy`);
    console.log("ℹ️  Old records preserved for audit/history");
    console.log(
      "ℹ️  Users will create NEW account links on next Google sign-in",
    );
    console.log("ℹ️  Existing users will link to same user account by email");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateGoogleOAuth();
