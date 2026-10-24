import { ExternalLink, Globe, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { WHATSAPP_GROUP_LABEL, WHATSAPP_GROUP_URL } from "@/constants/contact";

const footerLinks = {
  product: [
    { href: "/#how", label: "How it works" },
    { href: "/#tools", label: "Study tools" },
    { href: "/#free", label: "What is free" },
    { href: "/pricing", label: "Pricing" },
  ],
  support: [
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
    { href: "/about", label: "About" },
  ],
  legal: [
    { href: "/terms", label: "Terms" },
    { href: "/privacy", label: "Privacy" },
  ],
};

const socialLinks = [
  { icon: Globe, href: "https://ticlearn.ticsummit.org", label: "Website" },
  { icon: Mail, href: "mailto:ticlearn@ticsummit.org", label: "Email" },
  { icon: ExternalLink, href: "https://ticsummit.org", label: "Organization" },
  {
    icon: FaWhatsapp,
    href: WHATSAPP_GROUP_URL,
    label: WHATSAPP_GROUP_LABEL,
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container px-4 py-12 md:px-6 lg:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex min-h-12 items-center gap-2">
              <Image
                src="/icons/favicon-32x32.png"
                alt="TiCLearn Logo"
                width={32}
                height={32}
                className="h-8 w-8 text-primary"
              />
              <span className="text-xl font-bold">TiCLearn</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              A clearer way to work with your course materials.
            </p>
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              <FaWhatsapp className="h-4 w-4" aria-hidden="true" />
              {WHATSAPP_GROUP_LABEL}
            </a>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <Button
                  key={social.label}
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12"
                  asChild
                >
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-12 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-12 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-12 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TiCLearn. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built for university and HND students in Cameroon.
          </p>
        </div>
      </div>
    </footer>
  );
}
