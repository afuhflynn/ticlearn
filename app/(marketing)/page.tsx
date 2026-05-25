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
        <div className="container flex max-w-4xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Ready when you are</h2>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              Create an account to unlock the full mock library, leaderboard, and study chat.
              Prefer to compare plans first—that works too.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/sign-up">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-10">
        <div className="container px-4 text-center md:px-6">
          <p className="text-muted-foreground text-sm">
            Get tips, exam reminders, and help from other students in the WhatsApp community.
          </p>
          <Button variant="outline" size="sm" className="mt-4 gap-2 rounded-full" asChild>
            <Link
              href="https://chat.whatsapp.com/Jr5TCAeDA821gee19AkB8H?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp />
              Join WhatsApp
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
