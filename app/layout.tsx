import type { Metadata } from "next";
import { Inter, Merriweather, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TiCLearn - AI-Powered Study Platform for GCE A-Level",
  description:
    "Transform your notes into quizzes, prepare for GCE exams, compete on leaderboards, and chat with an AI tutor. The ultimate study companion for Cameroonian students.",
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
  authors: [{ name: "TiCLearn Team" }],
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
      className={`${inter.variable} ${merriweather.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
