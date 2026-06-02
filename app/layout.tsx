import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { Suspense } from "react";
import { extractRouterConfig } from "uploadthing/server";
import { ReferralProcessor } from "@/components/referral-processor";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/QueryProvider";
import { ourFileRouter } from "./api/uploadthing/core";

export const metadata: Metadata = {
  metadataBase: new URL("https://ticlearn.ticsummit.org"),
  title: "TiCLearn - AI-Powered Study Platform for GCE A-Level",
  description:
    "Transform your notes into quizzes, prepare for GCE exams, compete on leaderboards, and chat with TiC our ai tutor. The ultimate study companion for Cameroonian students.",
  keywords: [
    "GCE",
    "A-Level",
    "Cameroon",
    "study",
    "quiz",
    "AI",
    "education",
    "exam preparation",
  ],
  authors: [{ name: "TiCLearn Team", url: "https://ticlearn.ticsummit.org" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "TiCLearn",
  },
  openGraph: {
    title: "TiCLearn - Study Smarter, Score Higher",
    description:
      "AI-powered study platform for Cameroonian GCE A-Level students",
    type: "website",
    locale: "en_CM",
    siteName: "TiCLearn",
  },
  twitter: {
    card: "summary_large_image",
    title: "TiCLearn - Study Smarter, Score Higher",
    description:
      "AI-powered study platform for Cameroonian GCE A-Level students",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <OrganizationSchema />
        <NuqsAdapter>
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense>
              <QueryProvider>
                {children}
                <Toaster position="top-right" richColors />
                <Analytics />
                <ReferralProcessor />
              </QueryProvider>
            </Suspense>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
