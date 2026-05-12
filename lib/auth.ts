import { Plan } from "./../components/ai-elements/plan";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { triggerWelcomeEmail, triggerDefaultQuiz } from "./inngest/trigger";
import {
  sendVerificationEmail,
  sendSignInEmail,
  sendPasswordResetEmail,
} from "./email/send";

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
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL! || "http://localhost:3000"],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Check if user signed up via Google (has Account record)
          const account = await prisma.account.findFirst({
            where: { userId: user.id },
          });

          // If Google sign-up, send welcome email (providerId will be "google")
          if (account?.providerId === "google") {
            await triggerWelcomeEmail(user.email, user.name || "Student").catch(
              console.error,
            );
          }

          // Generate default quizzes for new users (after user is created)
          await triggerDefaultQuiz(user.id).catch(console.error);

          // Create ExamProfile for new user
          try {
            const unknownProgram = await prisma.program.findUnique({
              where: { code: "UNKNOWN" },
            });
            const defaultLevel = await prisma.examLevel.findFirst({
              orderBy: { createdAt: "asc" },
            });
            if (unknownProgram && defaultLevel) {
              const profile = await prisma.examProfile.create({
                data: {
                  userId: user.id,
                  examLevelId: defaultLevel.id,
                  programId: unknownProgram.id,
                },
              });
              await prisma.user.update({
                where: { id: user.id },
                data: { activeProfileId: profile.id },
              });
            }
          } catch {
            console.error("Failed to create ExamProfile for user", user.id);
          }
        },
      },
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const user = await prisma.user.findFirst({ where: { email } });
        const name = user?.name || "Student";

        if (type === "sign-in") {
          await sendSignInEmail({ email, name, otp });
        } else if (type === "email-verification") {
          await sendVerificationEmail({ email, name, otp });
        } else if (type === "forget-password") {
          await sendPasswordResetEmail({ email, name, otp });
        }
      },
      sendVerificationOnSignUp: true,
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
