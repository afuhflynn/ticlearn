import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { inngest } from "@/lib/inngest/client";
import { trustedOrigins } from "./env";
import { trackEvent } from "./kpi";
import { prisma } from "./prisma";

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
          // Send the welcome email to every signup, not just Google accounts.
          await inngest
            .send({
              name: "email.send.lifecycle",
              data: {
                template: "welcome-first-run",
                to: user.email,
                props: {
                  firstName: user.name || "Student",
                  onboardingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org"}/onboarding`,
                },
              },
            })
            .catch(console.error);

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

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://ticlearn.ticsummit.org";

        if (type === "sign-in") {
          await inngest.send({
            name: "email.send.transactional",
            data: {
              template: "sign-in-code",
              to: email,
              props: {
                firstName: name,
                code: otp,
                expiresMinutes: 5,
                appUrl,
              },
            },
          });
        } else if (type === "email-verification") {
          await inngest.send({
            name: "email.send.transactional",
            data: {
              template: "verify-address",
              to: email,
              props: {
                firstName: name,
                code: otp,
                expiresMinutes: 5,
                verifyUrl: `${appUrl}/verify-email?otp=${otp}`,
              },
            },
          });
        } else if (type === "forget-password") {
          await inngest.send({
            name: "email.send.transactional",
            data: {
              template: "password-reset",
              to: email,
              props: {
                firstName: name,
                code: otp,
                expiresMinutes: 5,
                resetUrl: `${appUrl}/reset-password?otp=${otp}`,
              },
            },
          });
        }
      },
      sendVerificationOnSignUp: true,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
