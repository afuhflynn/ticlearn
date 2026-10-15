import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { trustedOrigins } from "./env";
import { inngest } from "@/lib/inngest/client";
import { trackEvent } from "./kpi";
import { prisma } from "./prisma";
import { limitOtpSend } from "./rate-limit";

const otpRateLimitMap = new Map<string, { count: number; resetAt: number }>();

async function checkOtpRateLimit(email: string): Promise<boolean> {
  const now = Date.now();
  const record = otpRateLimitMap.get(email);
  if (!record || now > record.resetAt) {
    otpRateLimitMap.set(email, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return true;
  }
  if (record.count >= 3) {
    return false;
  }
  record.count++;
  return true;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 30,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"], // Auto-link if email matches
      // allowDifferentEmails: true // Only if needed for your use case
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "USER",
      },
      referredBy: {
        type: "string",
        required: false,
      },
      refApplied: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
  trustedOrigins,
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          trackEvent(session.userId, "user_signed_in").catch(() => {});
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          // Check if user signed up via Google (has Account record)
          const account = await prisma.account.findFirst({
            where: { userId: user.id },
          });

          // If Google sign-up, send welcome email (providerId will be "google")
          if (account?.providerId === "google") {
            await inngest
              .send({
                name: "email.send.welcome",
                data: { email: user.email, name: user.name || "Student" },
              })
              .catch(console.error);
          }

          trackEvent(user.id, "user_signed_up").catch(() => {});
        },
      },
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const allowed = await checkOtpRateLimit(email.toLowerCase());
        if (!allowed) {
          throw new Error("Too many OTP requests. Please try again later.");
        }

        const user = await prisma.user.findFirst({ where: { email } });
        const name = user?.name || "Student";

        if (type === "sign-in") {
          await inngest.send({
            name: "email.send.sign-in",
            data: { email, name, otp },
          });
        } else if (type === "email-verification") {
          await inngest.send({
            name: "email.send.verification",
            data: { email, name, otp },
          });
        } else if (type === "forget-password") {
          await inngest.send({
            name: "email.send.password-reset",
            data: { email, name, otp },
          });
        }
      },
      sendVerificationOnSignUp: true,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
