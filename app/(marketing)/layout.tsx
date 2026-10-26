import type { Metadata } from "next";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";

export const metadata: Metadata = {
  title: "TiCLearn - Study Your Lecture Notes with Tip",
  description:
    "Upload your lecture notes, turn them into quizzes, and learn with Tip, the tutor that teaches from your own material.",
  openGraph: {
    title: "TiCLearn - Study Your Lecture Notes with Tip",
    description:
      "Upload your lecture notes, turn them into quizzes, and learn with Tip, the tutor that teaches from your own material.",
    type: "website",
    locale: "en_CM",
    siteName: "TiCLearn",
  },
  robots: { index: true, follow: true },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <OrganizationSchema />
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
