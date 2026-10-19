import { ArrowRight, Download, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";
import { LandingHero } from "@/components/marketing/landing-hero";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <LandingHero />

      <section className="border-t py-12 md:py-14">
        <div className="container flex max-w-4xl flex-col items-start justify-between gap-8 px-4 md:flex-row md:items-center md:px-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Buea and Bamenda universities
            </h2>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              Free AI-powered study tools for Cameroonian university students.
              Join over 2,500 students already preparing with TiCLearn.
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-3 sm:w-auto">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/sign-up">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              asChild
            >
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t py-8">
        <div className="container flex max-w-4xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              <span className="text-sm text-muted-foreground">
                2,500+ university students
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-6 w-6 text-primary" />
              <span className="text-sm text-muted-foreground">
                +237 222 12 34 56
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              <span className="text-sm text-muted-foreground">
                150 MB download · ~400 CFA
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* biome-ignore lint/performance/noImgElement: the payment logos are local SVGs, which next/image refuses to optimise. */}
            <img
              src="/icons/mtn-mobile-money.svg"
              alt="MTN Mobile Money"
              className="h-6 w-6"
            />
            {/* biome-ignore lint/performance/noImgElement: the payment logos are local SVGs, which next/image refuses to optimise. */}
            <img
              src="/icons/orange-mobile-money.svg"
              alt="Orange Money"
              className="h-6 w-6"
            />
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-10">
        <div className="container px-4 text-center md:px-6">
          <p className="text-muted-foreground text-sm">
            Get study tips and help from other students in the WhatsApp
            community.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2 rounded-full"
            asChild
          >
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
