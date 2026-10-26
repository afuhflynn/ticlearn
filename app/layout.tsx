import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { extractRouterConfig } from "uploadthing/server";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/seo";
import { QueryProvider } from "@/providers/QueryProvider";
import { ourFileRouter } from "./api/uploadthing/core";

/**
 * The product has one sans family and one serif, from spec 0014. Geist is the
 * body, Geist Mono is anything the model read, and Instrument Serif is only the
 * italic accent phrase and the step numerals. next/font downloads the files at
 * build time and serves them from this origin, so no request leaves for the
 * font on first paint.
 */
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  // The one host. Resolved from SITE_URL in lib/seo.ts, so a domain change is
  // one edit and every canonical, alternate, OG image and sitemap entry moves
  // together.
  metadataBase: new URL(SITE_URL),
  title: "TiCLearn - Study Your Lecture Notes with Tip",
  description:
    "Upload your lecture notes, turn them into quizzes, and learn with Tip, the tutor that teaches from your own material. Built for university students in Cameroon.",
  keywords: [
    "Cameroon",
    "university",
    "study",
    "quiz",
    "AI tutor",
    "lecture notes",
    "education",
  ],
  authors: [{ name: "TiCLearn Team", url: SITE_URL }],
  manifest: "/manifest.webmanifest",
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
    title: "TiCLearn - Study Your Lecture Notes with Tip",
    description:
      "Upload your lecture notes, turn them into quizzes, and learn with Tip, the tutor that teaches from your own material.",
    type: "website",
    locale: "en_CM",
    siteName: "TiCLearn",
  },
  twitter: {
    card: "summary_large_image",
    title: "TiCLearn - Study Your Lecture Notes with Tip",
    description:
      "Upload your lecture notes, turn them into quizzes, and learn with Tip, the tutor that teaches from your own material.",
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
      className={`h-full antialiased ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster position="top-right" richColors />
            <Analytics />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
