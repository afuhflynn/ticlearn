import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["10.202.255.83"],
  serverExternalPackages: ["tesseract.js"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              // Chat files upload straight from the browser to Blob. The
              // token exchange and the bytes both go to the SDK's API host,
              // while the stored file is read from the store host. No other
              // host is added except UploadThing's regional ingest host,
              // which the note uploader POSTs bytes to directly, and the
              // Google avatar host Better Auth links to.
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.ufs.sh https://*.utfs.io https://*.public.blob.vercel-storage.com https://*.googleusercontent.com; font-src 'self'; connect-src 'self' https://vercel.com https://*.public.blob.vercel-storage.com https://*.ingest.uploadthing.com; frame-src 'self' https://*.ufs.sh https://*.utfs.io https://*.public.blob.vercel-storage.com; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests;",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  authToken: process.env.SENTRY_AUTH_TOKEN,

  tunnelRoute: "/sentry-tunnel",

  silent: !process.env.CI,
});
