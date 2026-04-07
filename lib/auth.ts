import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { prisma } from "./prisma";
import { inngest } from "./inngest/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 30,
    async sendResetPassword({ user, url }, request) {
      await inngest.send({
        name: "email.send.passwordReset",
        data: {
          email: user.email,
          name: user.name,
          url,
        },
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache session for 5 minutes
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL! || "http://localhost:3000"],
  plugins: [
    magicLink({
      async sendMagicLink({ email, url }, request) {
        await inngest.send({
          name: "email.send.magicLink",
          data: {
            email,
            url,
          },
        });
      },
    }),
  ],
});
