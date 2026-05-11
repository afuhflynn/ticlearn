import Link from "next/link";
import { GraduationCap, Mail, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaWhatsapp } from "react-icons/fa6";
import Image from "next/image";

const footerLinks = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
  ],
  legal: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
  ],
  support: [
    { href: "/faq", label: "FAQ" },
    { href: "/feedback", label: "Send Feedback" },
    { href: "/contact", label: "Contact Us" },
  ],
};

const socialLinks = [
  { icon: Globe, href: "https://ticlearn.ticsummit.org", label: "Website" },
  { icon: Mail, href: "mailto:ticlearn@ticsummit.org", label: "Email" },
  { icon: ExternalLink, href: "https://ticsummit.org", label: "Organization" },
  {
    icon: FaWhatsapp,
    href: "https://chat.whatsapp.com/Jr5TCAeDA821gee19AkB8H?mode=gi_t",
    label: "Join Our WhatsApp community",
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container px-4 py-12 md:px-6 lg:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/icons/favicon-32x32.png"
                alt="TiCLearn Logo"
                className="h-8 w-8 text-primary"
              />
              <span className="text-xl font-bold">TiCLearn</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              AI-powered study platform for Cameroonian GCE A-Level students.
              Study smarter, score higher.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <Button key={social.label} variant="ghost" size="icon" asChild>
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
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
            Made with love for Cameroonian students
          </p>
        </div>
      </div>
    </footer>
  );
}
