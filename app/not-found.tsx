import { Phone, ScanFace } from "lucide-react";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <ScanFace
              className="size-16 text-muted-foreground/30"
              strokeWidth={1}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">
            Oops! Page not found.
          </h1>
          <p className="text-muted-foreground text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
      <div className="mt-8 text-center">
        <div className="flex items-center gap-2">
          <Phone className="h-6 w-6 text-primary" />
          <a
            href="tel:+237222123456"
            className="text-primary hover:text-primary-foreground transition-colors"
          >
            +237 222 12 34 56
          </a>
        </div>
        <div className="mt-4 flex justify-center">
          <a
            href="https://chat.whatsapp.com/Jr5TCAeDA821gee19AkB8H?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:text-primary-foreground transition-colors"
          >
            <FaWhatsapp className="h-5 w-5" />
            Join WhatsApp community
          </a>
        </div>
      </div>
    </div>
  );
}
