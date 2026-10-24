import type { Metadata } from "next";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { WHATSAPP_GROUP_LABEL, WHATSAPP_GROUP_URL } from "@/constants/contact";

export const metadata: Metadata = {
  title: "Contact TiCLearn",
  description: "Questions about TiCLearn? Reach the team on WhatsApp.",
};

/**
 * The contact page, from spec 0016 AC-6. The form that used to post to
 * `/api/contact` is deleted outright, so there is no unauthenticated input
 * surface here any more. The WhatsApp group is the one staffed channel, and
 * the link resolves from `constants/contact.ts` like everywhere else.
 */
export default function ContactPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground">
            Questions about TiCLearn? Reach the team on WhatsApp.
          </p>
        </section>

        <section className="rounded-xl border p-8 text-center md:p-10">
          <FaWhatsapp className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-2xl font-semibold">Reach us on WhatsApp</h2>
          <p className="mt-3 text-muted-foreground">
            The fastest way to get help is the TiCLearn WhatsApp group. Say
            hello, and tell us what you are stuck on. A person reads it, not a
            bot.
          </p>
          <Button asChild size="lg" className="mt-6">
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp className="mr-2 h-4 w-4" />
              {WHATSAPP_GROUP_LABEL}
            </a>
          </Button>
        </section>

        <p className="text-center text-sm text-muted-foreground">
          For account recovery and anything private, WhatsApp is the only
          channel we answer from today.
        </p>
      </div>
    </div>
  );
}
