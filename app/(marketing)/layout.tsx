import type { Metadata } from "next";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";

export const metadata: Metadata = {
  title: "TiCLearn - AI-Powered Study Platform for GCE A-Level Cameroon",
  description:
    "Transform your notes into quizzes, prepare for GCE A-Level exams, and track your progress with TiCLearn. The ultimate AI study companion for Cameroonian students.",
  keywords: [
    "GCE A-Level",
    "Cameroon",
    "study platform",
    "AI quiz",
    "exam preparation",
    "Computer Science",
    "ICT",
    "Mathematics",
    "Biology",
    "Chemistry",
    "Physics",
  ],
  openGraph: {
    title: "TiCLearn - Study Smarter, Score Higher",
    description:
      "AI-powered study platform for Cameroonian GCE A-Level students",
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
