import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaWhatsapp } from "react-icons/fa6";
import { LandingHero } from "@/components/marketing/landing-hero";
import { getGceCountdownSnapshot } from "@/lib/gce-countdown";

export default function HomePage() {
  const countdown = getGceCountdownSnapshot();

  return (
    <div className="flex flex-col">
      <LandingHero countdown={countdown} />

      <section className="border-t py-12 md:py-14">
        <div className="container flex max-w-4xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-lg font-semibold">Ready to start?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              MCQ and structured mocks with AI marking and progress tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm">
              <Link href="/sign-up">
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing">Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/40 py-10">
        <div className="container px-4 text-center md:px-6">
          <p className="text-sm text-muted-foreground">
            Questions? Join the WhatsApp community.
          </p>
          <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
            <Link
              href="https://chat.whatsapp.com/Jr5TCAeDA821gee19AkB8H?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp />
              WhatsApp community
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
