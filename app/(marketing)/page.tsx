import { LandingBenefits } from "@/components/marketing/landing/benefits";
import { LandingCtaBand } from "@/components/marketing/landing/cta-band";
import { LandingFaq } from "@/components/marketing/landing/faq-section";
import { LandingGetStarted } from "@/components/marketing/landing/get-started";
import { LandingHero } from "@/components/marketing/landing/hero";
import { LandingHowItWorks } from "@/components/marketing/landing/how-it-works";
import { LandingStudyLoop } from "@/components/marketing/landing/study-loop";
import { LandingSubjects } from "@/components/marketing/landing/subjects";
import { WebSiteSchema } from "@/components/seo/WebSiteSchema";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata({
  title: "TiCLearn · Make your course notes make sense",
  description:
    "Bring your lecture notes, slides and handouts. TiCLearn gives you clearer explanations, focused practice and feedback that helps you decide what to review next.",
  path: "/",
  ogImage: "/og/home.png",
});

/**
 * The landing page, from spec 0015. The layout follows the approved mockup
 * section for section. The copy is ours, the tutor is Tip, and the frames hold
 * real screenshots of the app. Every section is a server component; only the
 * nav and the FAQ accordion are client islands.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col">
      <WebSiteSchema />
      <LandingHero />
      <LandingBenefits />
      <LandingHowItWorks />
      <LandingStudyLoop />
      <LandingSubjects />
      <LandingGetStarted />
      <LandingFaq />
      <LandingCtaBand />
    </div>
  );
}
