import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

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
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${lora.variable} ${ibmMono.variable} ${ibmMono.className} h-full antialiased`}
    >
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
              </QueryProvider>
            </Suspense>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
