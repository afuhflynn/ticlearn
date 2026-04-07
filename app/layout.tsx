import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Lora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

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
      className={`${plusJakarta.variable} ${lora.variable} ${ibmMono.variable} h-full antialiased`}
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
