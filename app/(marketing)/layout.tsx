import type { Metadata } from "next";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";

export const metadata: Metadata = {
  title: "TiCLearn - Study Your Lecture Notes with Tip",
  description:
    "Upload your lecture notes, turn them into quizzes, and learn with Tip. Built for university students in Cameroon.",
  keywords: [
    "Cameroon",
    "university",
    "study platform",
    "AI quiz",
    "AI tutor",
    "lecture notes",
  ],
  openGraph: {
    title: "TiCLearn - Study Smarter, Score Higher",
    description:
      "Study your own lecture notes with quizzes and Tip, the AI tutor",
    type: "website",
    locale: "en_CM",
    siteName: "TiCLearn",
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
