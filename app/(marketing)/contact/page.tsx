import { Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact TiCLearn",
  description:
    "Reach TiCLearn on WhatsApp or by phone, or send the team a message from this form.",
};

export default function ContactPage() {
  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-5xl space-y-12">
        <section className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground">
            Have questions? We&apos;d love to hear from you.
          </p>
        </section>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Get in Touch</h2>
              <p className="text-muted-foreground">
                Whether you have a question about features, pricing, or anything
                else, our team is ready to help.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">
                    hello@ticlearn.com
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">Cameroon</p>
                </div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
